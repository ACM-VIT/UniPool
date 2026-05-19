import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Animated, Easing, ActivityIndicator, Platform, Pressable, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  AppleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
let appleAuth: any = null;
if (Platform.OS === "ios") {
  appleAuth = require("@invertase/react-native-apple-authentication").appleAuth;
}

import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import { navigationRef } from "../../navigation/navigationRef";
import type { RootStackParamList } from "../../navigation/RootStackParamList";
import BrandedAlert from "../BrandedAlert";

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

/**
 * Lightweight bottom-sheet sign-in (Vibecode / FotMob pattern from Mobbin).
 *
 * Triggered by gated actions — booking, posting, opening Trips/Profile/Chat.
 * Sits over the underlying screen with a dim backdrop so the user keeps
 * spatial context. Slides up ~46% of the viewport, has tap-to-dismiss on
 * the backdrop, swipe-down would be nice but is not strictly required.
 */
type SigningProvider = "apple" | "google" | null;

const AuthSheet: React.FC<Props> = ({ visible, reason, returnTo, onDismiss }) => {
  const { apiUtil } = useApi();
  // Track which provider is mid-flow so only that button shows the spinner.
  // (Both buttons showing "Signing in…" simultaneously confused users — they
  // weren't sure which provider was actually authenticating.)
  const [signingIn, setSigningIn] = useState<SigningProvider>(null);
  const isSigningIn = signingIn !== null;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
      ]).start();
    }
  }, [visible]);

  const handleSuccess = async () => {
    try {
      await apiUtil.get("/user/details");
      onDismiss();
      // Existing user — drop them at the gated destination.
      if (returnTo && navigationRef.isReady?.()) {
        (navigationRef as any).navigate(returnTo.screen, returnTo.params);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // New user — they still need profile completion. Send them to
        // SignUp full-screen (one-time onboarding step) carrying returnTo.
        onDismiss();
        if (navigationRef.isReady?.()) {
          (navigationRef as any).navigate("SignUpScreen", {
            newUser: err.response?.data?.newUser || null,
            returnTo,
          });
        }
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
      await signInWithCredential(getAuth(), cred);
      await handleSuccess();
    } catch (error: any) {
      const code = error?.code;
      if (code === "SIGN_IN_CANCELLED" || code === "12501") return;
      BrandedAlert.alert("Couldn't sign you in", error?.message || "Try again in a moment.");
    } finally {
      setSigningIn(null);
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== "ios" || !appleAuth || isSigningIn) return;
    setSigningIn("apple");
    try {
      const resp = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      if (!resp.identityToken) throw new Error("Apple sign-in didn't return a token");
      const cred = AppleAuthProvider.credential(resp.identityToken, resp.nonce);
      await signInWithCredential(getAuth(), cred);
      await handleSuccess();
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") return;
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

      {/* Bottom sheet card — taller surface with hero brand pill, value
          props, then OAuth buttons. Aims for ~56% screen height so the
          content has room to breathe instead of feeling cramped. */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: AppColors.basicWhite,
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
        <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(38,59,51,0.18)", marginBottom: 18 }} />

        {/* Close action — top right */}
        <TouchableOpacity onPress={onDismiss} disabled={isSigningIn} activeOpacity={0.6} style={{ position: "absolute", top: 22, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(38,59,51,0.08)", alignItems: "center", justifyContent: "center", zIndex: 4 }}>
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path d="M3 3 L 13 13 M13 3 L 3 13" stroke={AppColors.secondaryDarkGreen} strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>

        {/* Headline + subhead — anchors the sheet without a brand pill
            or value-prop checklist. The close X is already in the top
            right corner, the buttons below say what to do; nothing
            else needs to compete for the eye. */}
        <View style={{ marginBottom: 26, paddingRight: 44 }}>
          <Text style={{ fontFamily: "NunitoSans_800ExtraBold", fontSize: 28, color: AppColors.secondaryDarkGreen, letterSpacing: -0.6, lineHeight: 34 }}>
            Sign in to UniPool
          </Text>
          <Text style={{ fontFamily: "NunitoSans_400Regular", fontSize: 15, lineHeight: 22, color: AppColors.secondaryDarkGreen, opacity: 0.62, marginTop: 6 }}>
            {reason ? `Sign in ${reason}.` : "Hop on to find student rides going your way."}
          </Text>
        </View>

        {/* Apple — iOS only. Forest CTA, white icon + label (Apple's HIG
            spec: monochrome white-on-black icon). */}
        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={{ height: 56, borderRadius: 14, backgroundColor: AppColors.secondaryDarkGreen, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12, opacity: signingIn === "google" ? 0.4 : 1, shadowColor: AppColors.basicBlack, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 2 }}
            onPress={handleApple}
            disabled={isSigningIn}
            activeOpacity={0.85}
          >
            {signingIn === "apple" ? (
              <ActivityIndicator size="small" color={AppColors.basicWhite} />
            ) : (
              <Svg width={18} height={20} viewBox="0 0 384 512" fill={AppColors.basicWhite}>
                <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </Svg>
            )}
            <Text style={{ fontFamily: "NunitoSans_700Bold", fontSize: 17, color: AppColors.basicWhite, marginLeft: 10, letterSpacing: 0.2 }}>
              {signingIn === "apple" ? "Signing in…" : "Continue with Apple"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Google — white surface + 4-colour "G" per Google's brand spec. */}
        <TouchableOpacity
          style={{ height: 56, borderRadius: 14, backgroundColor: AppColors.basicWhite, borderWidth: 1, borderColor: "rgba(38,59,51,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 22, opacity: signingIn === "apple" ? 0.4 : 1, shadowColor: AppColors.basicBlack, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}
          onPress={handleGoogle}
          disabled={isSigningIn}
          activeOpacity={0.85}
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
          <Text style={{ fontFamily: "NunitoSans_700Bold", fontSize: 17, color: AppColors.secondaryDarkGreen, marginLeft: 10, letterSpacing: 0.2 }}>
            {signingIn === "google" ? "Signing in…" : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        {/* Footer T&C — terse so the sheet stays compact */}
        <Text style={{ fontFamily: "NunitoSans_400Regular", fontSize: 11.5, lineHeight: 17, color: AppColors.secondaryDarkGreen, opacity: 0.5, textAlign: "center" }}>
          By continuing you agree to our{" "}
          <Text
            style={{ fontFamily: "NunitoSans_600SemiBold", textDecorationLine: "underline" }}
            onPress={() => {
              onDismiss();
              if (navigationRef.isReady?.()) (navigationRef as any).navigate("TermsOfServiceScreen");
            }}
          >
            Terms
          </Text>{" "}
          and{" "}
          <Text
            style={{ fontFamily: "NunitoSans_600SemiBold", textDecorationLine: "underline" }}
            onPress={() => {
              onDismiss();
              if (navigationRef.isReady?.()) (navigationRef as any).navigate("PrivacyPolicyScreen");
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </Animated.View>
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
