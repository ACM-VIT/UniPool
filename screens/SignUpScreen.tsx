import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import AppColors from "../design-system/colors";
import HeaderText from "../components/HeaderText";
import CustomInput from "../components/CustomInput";
import GenderSelector from "../components/GenderSelector";
import GoogleAuthButton from "../components/GoogleAuthBox";

const { width, height } = Dimensions.get("window");

const SignUpScreen: React.FC = () => {
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

        <HeaderText size={18} paddingTop={width * 0.03}>
          To make it easier for us to find you a ride please provide us with the
          following information as well:
        </HeaderText>

        <HeaderText paddingTop={height * 0.035}>Contact Number</HeaderText>
        <CustomInput placeholder="Do not prefix with 0" />

        <HeaderText paddingTop={height * 0.028}>Year of Birth</HeaderText>
        <CustomInput placeholder="DD-MM-YYYY" />

        <HeaderText paddingTop={height * 0.035}>Gender</HeaderText>
        <View style={styles.genderContainer}>
          <GenderSelector />
        </View>

        <GoogleAuthButton
          label="Sign up with Google"
          onPress={handleGoogleSignUp}
        />
      </KeyboardAvoidingView>

      {/* <View style={styles.beepImageWrapper}>
        <Image
          source={require("../assets/Warning.png")}
          style={styles.beepImage}
        />
      </View> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    paddingTop: height * 0.05,
  },
  beepImageWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0.24 * width,
    padding: 10,
  },
  beepImage: {
    width: width * 0.96,
    height: height * 0.5,
    resizeMode: "contain",
  },
  genderContainer: {
    marginBottom: height * 0.08,
  },
});

export default SignUpScreen;
