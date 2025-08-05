import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  create: {
    width: Math.min(screenWidth * 0.8, 300),
    height: Math.min(screenHeight * 0.5, 400),
    resizeMode: "contain",
    maxWidth: "90%",
    maxHeight: "60%",
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default styles;
