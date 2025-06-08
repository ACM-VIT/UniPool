import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
    marginBottom: screenHeight * 0.15,
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
    height: screenHeight * 0.3,
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

export default styles;
