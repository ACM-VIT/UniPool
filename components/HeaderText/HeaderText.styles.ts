import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  header: {
    color: AppColors.secondaryDarkGreen,
    fontWeight: "300",
    paddingLeft: width * 0.06,
    paddingRight: width * 0.06,
    marginBottom: width * 0.05,
  },
});

export default styles;
