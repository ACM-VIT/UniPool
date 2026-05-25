import React from "react";
import { View, Image, Text } from "react-native";
import { useRouter } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
import styles from "./SignInScreen.styles";
import GoogleAuthButton from "../../components/GoogleAuthBox";
import BrandedAlert from "../../components/BrandedAlert";
import { appHref } from "../../navigation/routes";
import { useTabletContentStyle } from "../../utils/responsive";

const DEBUG_SIGN_IN =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_SIGN_IN === "1";

const debugLog = (...args: any[]) => {
  if (DEBUG_SIGN_IN) console.log(...args);
};

const SignInScreen: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const handleGoogleSignIn = async () => {
    try {
      debugLog("Starting Google Sign-In");
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      debugLog("Google Sign-In successful");

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);

      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, googleCredential);

      debugLog("Signed in as:", userCredential.user.email);
      router.navigate(appHref("BookingScreen"));
    } catch (err) {
      console.error("Google Sign-In error", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during sign-in";
      BrandedAlert.alert("Sign-In Failed", message);
    }
  };

  return (
    <View style={[styles.container, tabletContentStyle]}>
      <Image source={require("../../assets/UFO.png")} style={styles.create} />

      <View style={styles.textContainer}>
        <Text style={styles.title}>Unipool</Text>
        <Text style={styles.subtitle}>Let's get started</Text>
      </View>

      <GoogleAuthButton
        label="Sign in with Google"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
};

export default SignInScreen;
