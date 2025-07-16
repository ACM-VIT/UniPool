import React from "react";
import {
  SafeAreaView,
  View,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
} from "react-native";
import { SignUpScreenProps } from "./SignUpScreen.types";

import AppColors from "../../design_systems/colors";
import HeaderText from "../../components/HeaderText";
import CustomInput from "../../components/CustomInput";
import GenderSelector from "../../components/GenderSelector";
import GoogleAuthButton from "../../components/GoogleAuthBox";
import styles, { spacing } from "./SignUpScreen.styles";


import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const handleGoogleSignUp = async () => {
    try {
      console.log("Starting Google Sign-Up");

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-Up successful", userInfo);
      const idToken = userInfo.data?.idToken;

      const googleCredential = auth.GoogleAuthProvider.credential(idToken!);
      
      const userCredential = await auth().signInWithCredential(googleCredential);
      console.log("Signed up:", userCredential.user.email);
      if (navigation) navigation.navigate("BookingScreen"); // Or your desired screen
    } catch (error) {
      console.error("Google Sign-Up error", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "An unknown error occurred";
      // Optionally show an alert
      Alert.alert("Sign-Up Failed", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <HeaderText size={18}>Just finishing</HeaderText>

        <HeaderText size={18} paddingTop={spacing.medium}>
          To make it easier for us to find you a ride please provide us with the
          following information as well:
        </HeaderText>

        <HeaderText paddingTop={spacing.medium}>Contact Number</HeaderText>
        <CustomInput placeholder="Do not prefix with 0" />

        <HeaderText paddingTop={spacing.medium}>Year of Birth</HeaderText>
        <CustomInput placeholder="DD-MM-YYYY" />

        <HeaderText paddingTop={spacing.medium}>Gender</HeaderText>
        <View style={styles.genderContainer}>
          <GenderSelector />
        </View>

        <GoogleAuthButton
          label="Sign up with Google"
          onPress={handleGoogleSignUp}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
