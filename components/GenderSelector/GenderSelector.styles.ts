import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: width * 0.06,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: width * 0.02,
  },
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: width * 0.03,
    paddingHorizontal: width * 0.05,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginHorizontal: width * 0.005,
    marginTop: width * 0.03,
    marginRight: width * 0.05,
  },
  selectedButton: {
    backgroundColor: AppColors.basicWhite,
  },
  text: {
    color: AppColors.primaryLightGreen,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito Sans",
  },
  selectedText: {
    color: AppColors.basicBlack,
  },
});

export default styles;
