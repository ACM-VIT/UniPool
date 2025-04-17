import React from "react";
import { View, StyleSheet, Dimensions, Image, Text } from "react-native";
import AppColors from "../design-system/colors";
import GoogleAuthButton from "../components/GoogleAuthBox";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SignInScreen: React.FC = () => {
  const handleGoogleSignIn = () => {
    console.log("Sign In with Google pressed");
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/UFO.png")} style={styles.create} />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  create: {
    width: screenWidth * 0.4,
    height: screenHeight * 0.3,
    position: "absolute",
    top: screenHeight * 0.3,
    left: screenWidth * 0.3,
  },
  textContainer: {
    alignItems: "center",
    marginTop: screenHeight * 0.4,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.secondaryDarkGreen,
  },
  subtitle: {
    fontSize: 18,
    color: AppColors.secondaryDarkGreen,
    marginTop: 10,
  },
});

export default SignInScreen;
