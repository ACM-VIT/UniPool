import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  AppleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
// Apple Sign-In via Expo's wrapper around AuthenticationServices. The
// older @invertase/react-native-apple-authentication library has known
// reliability issues on iPad / iPadOS 26 — App Review reproduces them
// as a "Sign Up Not Completed" sheet — so we go through the Expo path
// which uses the system framework directly. `isAvailableAsync` lets us
// hide the button on devices that genuinely don't support it (older
// hardware, restricted accounts) instead of surfacing a cryptic failure.
import * as AppleAuthentication from "expo-apple-authentication";
import LottieView from "lottie-react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import styles from "./AuthScreen.styles";
import { useApi } from "../../utils/ApiUtil";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";
import BrandedAlert from "../../components/BrandedAlert";
import ChevronBack from "../../components/ChevronBack";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import type { AppRouteTarget } from "../../navigation/routes";
import { useTabletContentStyle } from "../../utils/responsive";
import {
  isAuthenticationRedirectError,
  isProviderCollisionError,
  isSignupRequiredError,
  prepareAppleFirebaseUser,
  rollbackFirebaseSession,
} from "../../utils/authFlow";

type SigningProvider = "apple" | "google" | null;

const AuthScreen: React.FC = () => {
  const { apiUtil } = useApi();
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const routeParams = useDecodedLocalSearchParams<{ returnTo?: AppRouteTarget }>();
  // Track which provider is mid-flow so only that button shows the
  // spinner. A single boolean here was painting the Google button as
  // "Signing in…" the moment a user tapped Apple, which made it look
  // like the wrong provider was authenticating.
  const [signingIn, setSigningIn] = useState<SigningProvider>(null);
  const isSigningIn = signingIn !== null;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const returnTo = routeParams.returnTo;

  const navigateAfterAuth = useCallback(() => {
    if (returnTo) {
      router.replace(targetHref(returnTo));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  }, [returnTo, router]);

  useEffect(() => {
    const checkExistingAuth = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        try {
          // No `getIdToken(true)` here either — `apiUtil` picks up the
          // cached token and refreshes only when it's actually close
          // to expiry. The previous force-refresh added a wasted
          // network round-trip every time AuthScreen mounted.
          await apiUtil.getForUserUncached("/user/details?summary=1", currentUser);
          navigateAfterAuth();
        } catch (err: any) {
          // 404 = Firebase auth is good but the user has no backend
          // row yet → profile-completion screen. Carry `returnTo` so
          // the post-signup flow ends up at the action that gated
          // them. NEVER sign out here — that would tear down the
          // Firebase session before the route changes.
          if (isSignupRequiredError(err)) {
            router.replace(appHref("SignUpScreen", {
              newUser: err.response?.data?.newUser || null,
              returnTo,
            }));
          } else if (isAuthenticationRedirectError(err)) {
            await rollbackFirebaseSession(apiUtil);
          }
        }
      }
    };
    checkExistingAuth();
  }, [apiUtil, navigateAfterAuth, router, returnTo]);

  const routeAfterAuth = async (firebaseUser: any, provider?: "apple" | "google") => {
    try {
      await apiUtil.getForUserUncached("/user/details?summary=1", firebaseUser);
      navigateAfterAuth();
    } catch (err: any) {
      if (isSignupRequiredError(err)) {
        router.replace(appHref("SignUpScreen", {
          newUser: err.response?.data?.newUser || null,
          returnTo,
        }));
      } else if (err.response?.status === 400) {
        BrandedAlert.alert("Hmm, something's off", err.response?.data?.message || "Try that again in a moment.");
      } else if (isAuthenticationRedirectError(err)) {
        await rollbackFirebaseSession(apiUtil, provider);
        BrandedAlert.alert(
          "Couldn't finish sign-in",
          err.response?.data?.error || "We couldn't verify this sign-in with UniPool. Please try again.",
        );
      } else {
        BrandedAlert.alert("Couldn't sign you in", err.message || "Try again in a moment.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setSigningIn("google");

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        BrandedAlert.alert("Sign-In Failed", "Unable to complete sign-in. Please try again.");
        return;
      }
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(getAuth(), googleCredential);
      // No explicit `getIdToken(true)` — `signInWithCredential`
      // resolves with a user whose ID token is already fresh. The
      // forced refresh here was costing ~500-800ms on Android for
      // no benefit; ApiUtil reads the cached token on the very next
      // request anyway.
      await routeAfterAuth(result.user, "google");
    } catch (error: any) {
      const code = error?.code;
      if (code === "SIGN_IN_CANCELLED" || code === "12501") return;
      if (isProviderCollisionError(error)) {
        await rollbackFirebaseSession(apiUtil, "google");
        BrandedAlert.alert(
          "Use your existing sign-in",
          "That email is already attached to another sign-in method. Sign in with the method you used before for this UniPool account.",
        );
        return;
      }
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      BrandedAlert.alert("Sign-In Failed", message);
    } finally {
      setSigningIn(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") return;
    if (isSigningIn) return;

    // Guard against environments where Apple's framework reports the
    // capability isn't available (older devices, child accounts,
    // managed devices, MDM lockouts). Surface a specific message
    // instead of letting Apple's "Sign Up Not Completed" sheet appear.
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      BrandedAlert.alert(
        "Apple Sign-In unavailable",
        "Sign in with Apple isn't available on this device or account. Try signing in with Google instead.",
      );
      return;
    }

    setSigningIn("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple didn't return an identity token. Try again.");
      }

      // AppleAuthProvider.credential accepts an undefined nonce —
      // Firebase verifies the JWT signature against Apple's public
      // keys regardless. We never set a custom nonce on the Apple
      // request, so passing the response field through would be a
      // no-op (the field is always undefined for expo's wrapper).
      const appleCredential = AppleAuthProvider.credential(credential.identityToken);
      const result = await signInWithCredential(getAuth(), appleCredential);
      await prepareAppleFirebaseUser(apiUtil, result.user, credential.fullName);
      await routeAfterAuth(result.user, "apple");
    } catch (error: any) {
      // expo-apple-authentication uses ERR_REQUEST_CANCELED on iOS;
      // keep the legacy code too for any older builds that linger.
      if (
        error?.code === "ERR_REQUEST_CANCELED" ||
        error?.code === "ERR_CANCELED" ||
        error?.code === "ERR_REQUEST_UNKNOWN"
      ) {
        return;
      }
      if (isProviderCollisionError(error)) {
        await rollbackFirebaseSession(apiUtil, "apple");
        BrandedAlert.alert(
          "Use your existing sign-in",
          "That email is already attached to another sign-in method. Sign in with the method you used before for this UniPool account.",
        );
        return;
      }
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      BrandedAlert.alert("Apple Sign-In Failed", message);
    } finally {
      setSigningIn(null);
    }
  };

  const canGoBack = router.canGoBack();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) + 4 }, tabletContentStyle]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBackground} />
      <View style={styles.topRow}>
        {canGoBack ? (
          <ChevronBack onPress={() => router.back()} />
        ) : (
          <View style={{ width: 40 }} />
        )}
        {/* Brand wordmark in Trap-Bold — same display face the rest of
            the app uses for the UniPool name (splash, brand strip,
            chat brand chips). NunitoSans here read as a generic
            heading instead of the wordmark. */}
        <Text style={[styles.wordmark, { color: colors.brandText }]} allowFontScaling={false}>UniPool</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroBlock}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>Welcome.</Text>
        <Text style={[styles.subtext, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Sign in to find a ride, share a seat, and split the fare with people taking your route.</Text>
        <View style={styles.lottieContainer}>
          <LottieView source={require("../../assets/artboard.json")} autoPlay loop style={styles.lottieAnimation} />
          {/* Hide the Lottielab free-tier watermark stamped on the artboard. */}
          <View style={[styles.watermarkHide, { backgroundColor: colors.background }]} pointerEvents="none" />
        </View>
      </View>

      <View style={[styles.authBlock, { backgroundColor: colors.navFill }]}>
        {/* No "CONTINUE WITH" label — the button labels already say
            "Sign in with Apple / Google", so a separate eyebrow was
            redundant chrome. */}

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton, isSigningIn && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={isSigningIn}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>
              {signingIn === "apple" ? (
                <ActivityIndicator size="small" color={AppColors.basicWhite} accessibilityLabel="Loading" />
              ) : (
                // Apple HIG: white glyph on a black button.
                <Svg width={18} height={20} viewBox="0 0 384 512" fill={AppColors.basicWhite}>
                  <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </Svg>
              )}
            </View>
            <Text style={styles.appleButtonText}>
              {signingIn === "apple" ? "Signing in…" : "Sign in with Apple"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.googleButton, isSigningIn && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrap}>
            {signingIn === "google" ? (
              <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} accessibilityLabel="Loading" />
            ) : (
              // Google G — inline SVG with brand colors. PNG version
              // we shipped earlier flattened to a single color and
              // didn't read as the Google brand.
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
            )}
          </View>
          <Text style={styles.googleButtonText}>
            {signingIn === "google" ? "Signing in…" : "Sign in with Google"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.navIconInactive }, colors.mode === "dark" && { opacity: 1 }]}>
            By continuing, you agree to UniPool's{" "}
            <Text
              style={[styles.footerLink, { color: colors.navIconInactive }]}
              onPress={() => router.navigate(appHref("TermsOfServiceScreen"))}
            >
              Terms
            </Text>{" "}
            and{" "}
            <Text
              style={[styles.footerLink, { color: colors.navIconInactive }]}
              onPress={() => router.navigate(appHref("PrivacyPolicyScreen"))}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AuthScreen;
