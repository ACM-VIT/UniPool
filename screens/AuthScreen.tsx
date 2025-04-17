import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import GoogleAuthButton from "../components/GoogleAuthBox";
import AppColors from "../design-system/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const AuthScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, There!</Text>
      <Text style={styles.subtext}>Let’s get you started with</Text>

      <Text style={styles.label}>Already been here?</Text>
      <GoogleAuthButton label="Sign-in with Google" onPress={() => {}} />

      <Text style={styles.label}>New around here?</Text>
      <GoogleAuthButton label="Sign-up with Google" onPress={() => {}} />

      <Image source={require("../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    paddingLeft: screenWidth * 0.05,
    paddingRight: screenWidth * 0.05,
    width: "100%",
    justifyContent: "flex-start",
    paddingTop: screenHeight * 0.1,
  },
  greeting: {
    fontSize: 25,
    fontWeight: "bold",
    color: AppColors.basicBlack,
    marginTop: screenWidth * 0.01,
  },
  subtext: {
    fontWeight: "medium",
    fontSize: 20,
    color: AppColors.secondaryDarkGreen,

    marginBottom: screenWidth * 0.4,
  },
  label: {
    fontWeight: "medium",
    fontSize: 20,
    color: AppColors.secondaryDarkGreen,
    marginTop: screenWidth * 0.025,
    marginBottom: screenWidth * 0.0125,
  },
  image: {
    width: screenWidth * 0.75,
    height: screenHeight * 0.35,
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },
});

export default AuthScreen;
