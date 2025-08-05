import React from "react";
import { View, Image, Text, Alert } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
import { SignInScreenProps } from "./SignInScreen.types";
import styles from "./SignInScreen.styles";
import GoogleAuthButton from "../../components/GoogleAuthBox";

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const handleGoogleSignIn = async () => {
    try {
      console.log("Starting Google Sign-In");
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-In successful", userInfo);

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);

      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, googleCredential);

      console.log("Signed in as:", userCredential.user.email);
      navigation.navigate("BookingScreen");
    } catch (err) {
      console.error("Google Sign-In error", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during sign-in";
      Alert.alert("Sign-In Failed", message);
    }
  };

  return (
    <View style={styles.container}>
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
