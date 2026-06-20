import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Animated, Easing, ActivityIndicator, Platform, Pressable, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  AppleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
import { router } from "expo-router";
// Expo's AuthenticationServices wrapper handles Apple Sign-In consistently
// across iPhone and iPad review devices.
import * as AppleAuthentication from "expo-apple-authentication";

import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";
import { useApi } from "../../utils/ApiUtil";
import type { RootStackParamList } from "../../navigation/RootStackParamList";
import { appHref } from "../../navigation/routes";
import BrandedAlert from "../BrandedAlert";
import { haptic } from "../haptics";
import PressableScale from "../PressableScale";
import {
  isAuthenticationRedirectError,
  isProviderCollisionError,
  isSignupRequiredError,
  prepareAppleFirebaseUser,
  rollbackFirebaseSession,
} from "../../utils/authFlow";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export type AuthSheetReturnTo = {
  screen: keyof RootStackParamList;
  params?: any;
};

type Props = {
  visible: boolean;
  /** Contextual subtitle: "to book this ride", "to post a ride", etc. */
  reason?: string;
  /** Where to navigate after a successful sign-in. */
  returnTo?: AuthSheetReturnTo;
  onDismiss: () => void;
};

/** Bottom-sheet sign-in surface used by auth-gated actions. */
type SigningProvider = "apple" | "google" | null;

const AuthSheet: React.FC<Props> = ({ visible, reason, returnTo, onDismiss }) => {
  const colors = useThemeColors();
  const { apiUtil } = useApi();
  // Apple Sign-In must use one of Apple's approved contrast pairings.
  const primaryCtaBg = colors.mode === "dark" ? AppColors.basicWhite : AppColors.basicBlack;
  const primaryCtaText = colors.mode === "dark" ? AppColors.basicBlack : AppColors.basicWhite;
  // Track the active provider so only the selected button shows progress.
  const [signingIn, setSigningIn] = useState<SigningProvider>(null);
  const isSigningIn = signingIn !== null;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Use a light haptic when the sheet starts to rise.
      haptic("selection");
      // Reset animated values before each open; the modal can unmount while
      // the close animation is still in flight.
      translateY.setValue(SCREEN_HEIGHT);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Keep the next open deterministic even if the modal unmounts before
        // the native animation callback completes.
        translateY.setValue(SCREEN_HEIGHT);
        backdrop.setValue(0);
      });
    }
  }, [visible]);

  const routeFromSheet = (href: any) => {
    router.replace(href);
    requestAnimationFrame(onDismiss);
  };

  const handleSuccess = async (firebaseUser: any, provider?: "apple" | "google") => {
    try {
      await apiUtil.getForUserUncached("/user/details?summary=1", firebaseUser);
      // Existing user — drop them at the gated destination.
      if (returnTo) {
        routeFromSheet(appHref(returnTo.screen, returnTo.params as any));
      } else {
        routeFromSheet(appHref("HomeScreen"));
      }
    } catch (err: any) {
      if (isSignupRequiredError(err)) {
        // New user — they still need profile completion. Send them to
        // SignUp full-screen (one-time onboarding step) carrying returnTo.
        routeFromSheet(appHref("SignUpScreen", {
          newUser: err.response?.data?.newUser || null,
          returnTo,
        }));
      } else if (isAuthenticationRedirectError(err)) {
        await rollbackFirebaseSession(apiUtil, provider);
        BrandedAlert.alert(
          "Couldn't finish sign-in",
          err.response?.data?.error || "We couldn't verify this sign-in with UniPool. Please try again.",
        );
      } else {
        BrandedAlert.alert("Couldn't finish sign-in", err.message || "Try again in a moment.");
      }
    }
  };

  const handleGoogle = async () => {
    if (isSigningIn) return;
    setSigningIn("google");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        BrandedAlert.alert("Sign-in cancelled", "Tap Continue with Google to try again.");
        return;
      }
      const cred = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(getAuth(), cred);
      // Use the credential result directly; Firebase has already refreshed
      // the ID token for this sign-in.
      await handleSuccess(result.user, "google");
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
      BrandedAlert.alert("Couldn't sign you in", error?.message || "Try again in a moment.");
    } finally {
      setSigningIn(null);
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== "ios" || isSigningIn) return;

    // Apple Sign-In can be unavailable on restricted or managed devices.
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
      // Firebase accepts the credential without a custom nonce — the
      // JWT signature itself is verified against Apple's published
      // keys. We never set a nonce on the request, so there's nothing
      // to forward.
      const cred = AppleAuthProvider.credential(credential.identityToken);
      const result = await signInWithCredential(getAuth(), cred);
      await prepareAppleFirebaseUser(apiUtil, result.user, credential.fullName);
      await handleSuccess(result.user, "apple");
    } catch (error: any) {
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
      BrandedAlert.alert("Couldn't sign you in", error?.message || "Try again in a moment.");
    } finally {
      setSigningIn(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Dim backdrop — tap to dismiss */}
      <Animated.View
        style={{
          ...StyleSheetFill,
          backgroundColor: "rgba(0,0,0,0.42)",
          opacity: backdrop,
        }}
      >
        <Pressable style={StyleSheetFill} onPress={onDismiss} disabled={isSigningIn} />
      </Animated.View>

      {/* Centring wrapper — absolutely positioned full-width strip at
          the bottom that lets the inner Animated.View take its natural
          flow width and centre horizontally. Without this, the sheet
          uses `left:0 / right:0` which forces full-width stretch on
          iPad. With it, the inner card honours its own `maxWidth: 540`
          so the sheet reads as a phone-sized surface on tablets and
          stays full-bleed on phones. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
        }}
      >
        <Animated.View
          style={{
            width: "100%",
            // Phone-shape cap. Below the breakpoint this is a no-op
            // because parent width is already ≤540. Above it the
            // sheet centres in the wider iPad canvas.
            maxWidth: 540,
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: Platform.OS === "ios" ? 40 : 28,
            transform: [{ translateY }],
            shadowColor: AppColors.basicBlack,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.22,
            shadowRadius: 28,
            elevation: 18,
          }}
        >
        {/* Grab handle */}
        <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.inkLine, marginBottom: 18 }} />

        {/* Close action — top right. Dismiss is not a decision, so the
            scale carries the press and the haptic stays muted. */}
        <PressableScale onPress={onDismiss} disabled={isSigningIn} haptic={null} style={{ position: "absolute", top: 22, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.inkSubtle, alignItems: "center", justifyContent: "center", zIndex: 4 }}>
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path d="M3 3 L 13 13 M13 3 L 3 13" stroke={colors.textPrimary} strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        </PressableScale>

        {/* Headline + subhead — visible immediately so the sheet
            doesn't slide up empty for a beat before the words land.
            The slide-up itself is the entry animation. */}
        <View style={{ marginBottom: 26, paddingRight: 44 }}>
          <Text style={{ fontFamily: "NunitoSans_800ExtraBold", fontSize: 28, color: colors.textPrimary, letterSpacing: -0.6, lineHeight: 34 }}>
            Sign in to UniPool
          </Text>
          <Text style={[
            { fontFamily: "NunitoSans_400Regular", fontSize: 15, lineHeight: 22, marginTop: 6 },
            colors.mode === "dark"
              ? { color: colors.textSecondary }
              : { color: AppColors.secondaryDarkGreen, opacity: 0.62 },
          ]}>
            {reason ? `Sign in ${reason}.` : "Hop on to find student rides going your way."}
          </Text>
        </View>

        <View>
        {Platform.OS === "ios" && (
          <PressableScale
            style={{ height: 56, borderRadius: 14, backgroundColor: primaryCtaBg, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12, opacity: signingIn === "google" ? 0.4 : 1, shadowColor: AppColors.basicBlack, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 2 }}
            onPress={handleApple}
            disabled={isSigningIn}
            // Primary commit — a weightier tap as sign-in kicks off.
            haptic="medium"
          >
            {signingIn === "apple" ? (
              <ActivityIndicator size="small" color={primaryCtaText} />
            ) : (
              <Svg width={18} height={20} viewBox="0 0 384 512" fill={primaryCtaText}>
                <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </Svg>
            )}
            <Text style={{ fontFamily: "NunitoSans_700Bold", fontSize: 17, color: primaryCtaText, marginLeft: 10, letterSpacing: 0.2 }}>
              {signingIn === "apple" ? "Signing in…" : "Continue with Apple"}
            </Text>
          </PressableScale>
        )}

        {/* Google — kept white per Google brand spec in both modes
            (their brand requires this surface). Border softens so it
            still reads as a distinct chip on the dark sheet. */}
        <PressableScale
          style={{ height: 56, borderRadius: 14, backgroundColor: AppColors.basicWhite, borderWidth: 1, borderColor: "rgba(38,59,51,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 22, opacity: signingIn === "apple" ? 0.4 : 1, shadowColor: AppColors.basicBlack, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}
          onPress={handleGoogle}
          disabled={isSigningIn}
          // Primary commit — matches the Apple button's weight.
          haptic="medium"
        >
          {signingIn === "google" ? (
            <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} />
          ) : (
            <Svg width={20} height={20} viewBox="0 0 48 48">
              <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <Path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </Svg>
          )}
          {/* Label stays forest because the Google card surface stays
              white (their brand) — high contrast in both themes. */}
          <Text style={{ fontFamily: "NunitoSans_700Bold", fontSize: 17, color: AppColors.secondaryDarkGreen, marginLeft: 10, letterSpacing: 0.2 }}>
            {signingIn === "google" ? "Signing in…" : "Continue with Google"}
          </Text>
        </PressableScale>

        {/* Footer T&C — terse so the sheet stays compact */}
        <Text style={[
          { fontFamily: "NunitoSans_400Regular", fontSize: 11.5, lineHeight: 17, textAlign: "center" },
          colors.mode === "dark"
            ? { color: colors.textTertiary }
            : { color: AppColors.secondaryDarkGreen, opacity: 0.5 },
        ]}>
          By continuing you agree to our{" "}
          <Text
            style={{ fontFamily: "NunitoSans_600SemiBold", textDecorationLine: "underline" }}
            onPress={() => {
              onDismiss();
              router.navigate(appHref("TermsOfServiceScreen"));
            }}
          >
            Terms
          </Text>{" "}
          and{" "}
          <Text
            style={{ fontFamily: "NunitoSans_600SemiBold", textDecorationLine: "underline" }}
            onPress={() => {
              onDismiss();
              router.navigate(appHref("PrivacyPolicyScreen"));
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
};

const StyleSheetFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export default AuthSheet;
