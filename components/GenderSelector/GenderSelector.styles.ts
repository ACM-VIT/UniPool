import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: width * 0.06,
    marginTop: width * 0.02,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: width * 0.03,
  },
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: width * 0.04,
    paddingHorizontal: width * 0.05,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
    marginHorizontal: width * 0.01,
    marginTop: width * 0.02,
    marginRight: width * 0.03,
    minHeight: 50,
  },
  selectedButton: {
    backgroundColor: AppColors.basicWhite,
  },
  text: {
    color: AppColors.primaryLightGreen,
    fontSize: 20,
    fontWeight: "400",
    fontFamily: "NunitoSans_400Regular",
  },
  selectedText: {
    color: AppColors.basicBlack,
  },
});

export default styles;
