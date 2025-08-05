import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    fontSize: 20,
    backgroundColor: AppColors.secondaryDarkGreen,
    marginHorizontal: "6%",
    marginBottom: 20,
    fontFamily: "NunitoSans_400Regular",
    fontWeight: "400",
    color: AppColors.primaryLightGreen,
    minHeight: 50,
  },
});

export default styles;
