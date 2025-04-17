import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Button,
  TouchableOpacity,
} from "react-native";
import GoogleAuthButton from "../components/GoogleAuthBox";
import AppColors from "../design-system/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const AuthScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subtext}>Let's get you started with.</Text>

      <Text style={styles.label}>Already been here?</Text>
      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <Text style={styles.text}>Login and Pick Up the Pace!</Text>
      </TouchableOpacity>

      <Text style={styles.label}>New around here?</Text>
      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <Text style={styles.text}>Sign Up to Start Your Journey!</Text>
      </TouchableOpacity>

      <Image source={require("../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: screenHeight * 0.1,
  },
  greeting: {
    fontSize: 25,
    fontWeight: "bold",
    color: AppColors.basicBlack,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 20,
    fontWeight: "500",
    color: AppColors.secondaryDarkGreen,
    marginBottom: screenHeight * 0.05,
  },
  label: {
    fontSize: 18,
    fontWeight: "500",
    color: AppColors.secondaryDarkGreen,
    marginTop: screenHeight * 0.05,
    marginBottom: screenHeight * 0.015,
  },
  image: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.4,
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  text: {
    color: AppColors.basicWhite,
    fontWeight: "bold",
  },
});

export default AuthScreen;
