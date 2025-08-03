import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import AppColors from "../design_systems/colors";

const LoadingComponent = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/loader.json")}
        autoPlay
        loop
        style={styles.lottie}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.primaryLightGreen,
  },
  lottie: {
    width: 150,
    height: 150,
  },
});

export default LoadingComponent;
