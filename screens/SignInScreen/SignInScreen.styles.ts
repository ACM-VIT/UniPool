import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

export default styles;
