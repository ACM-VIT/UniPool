import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  header: {
    color: AppColors.secondaryDarkGreen,
    fontWeight: "400",
    fontFamily: "NunitoSans_400Regular",
    paddingLeft: width * 0.06,
    paddingRight: width * 0.06,
    marginBottom: width * 0.03,
    marginTop: width * 0.04,
    lineHeight: 22,
  },
});

export default styles;
