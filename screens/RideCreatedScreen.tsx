import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native";
import MainNavBar from "../components/MainNavBar";
import AppColors from "../design-system/colors";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const RideCreateScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/create.png")} style={styles.create} />
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
    top: screenHeight * 0.37,
    left: screenWidth * 0.315,
  },
});

export default RideCreateScreen;
