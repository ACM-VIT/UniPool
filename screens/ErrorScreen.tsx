import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import AppColors from "../design-system/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ErrorScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/cone.png")} style={styles.cone} />
      <Text style={styles.message}>Yikes! Traffic's a bit tangled here.</Text>
      <Text style={styles.subtext}>
        Redirect yourself to the main route and keep moving forward!
      </Text>
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
  cone: {
    width: screenWidth * 0.75,
    height: screenHeight * 0.35,
    position: "absolute",
    top: screenHeight * 0.2,
    left: screenWidth * 0.14,
  },
  message: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: "50%",
    textAlign: "center",
  },
  subtext: {
    textAlign: "center",
    fontSize: 22,
    paddingTop: "5%",
  },
});

export default ErrorScreen;
