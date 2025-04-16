import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native"; // <-- Added Image import
import MainNavBar from "../components/MainNavBar";
import AppColors from "../design-system/colors";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const RideRequestScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/request.png")} style={styles.request} />
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
  request: {
    width: screenWidth * 0.4,
    height: screenHeight * 0.3,
    position: "absolute",
    top: screenHeight * 0.37,
    left: screenWidth * 0.315,
  },
});

export default RideRequestScreen;
