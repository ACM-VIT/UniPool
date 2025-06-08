import React from "react";
import { View, Image, Text, Alert } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

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

      const googleCredential = auth.GoogleAuthProvider.credential(idToken!);

      const userCredential = await auth().signInWithCredential(googleCredential);

      console.log("Signed in:", userCredential.user.email);
      navigation.navigate("BookingScreen"); // Or your desired screen
    } catch (error) {
      console.error("Google Sign-In error", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "An unknown error occurred";
      Alert.alert("Sign-In Failed", errorMessage);
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
        label="Sign up with Google"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
};

export default SignInScreen;
