import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

export const spacing = {
  small: width * 0.03,
  medium: height * 0.035,
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    paddingTop: height * 0.05,
  },
  genderContainer: {
    marginBottom: height * 0.08,
  },
});

export default styles;
