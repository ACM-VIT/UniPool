import React from "react";
import {
  SafeAreaView,
  View,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SignUpScreenProps } from "./SignUpScreen.types";

import AppColors from "../../design_systems/colors";
import HeaderText from "../../components/HeaderText";
import CustomInput from "../../components/CustomInput";
import GenderSelector from "../../components/GenderSelector";
import GoogleAuthButton from "../../components/GoogleAuthBox";
import styles, { spacing } from "./SignUpScreen.styles";

const SignUpScreen: React.FC<SignUpScreenProps> = () => {
  const handleGoogleSignUp = () => {
    console.log("Sign up with Google pressed");
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
