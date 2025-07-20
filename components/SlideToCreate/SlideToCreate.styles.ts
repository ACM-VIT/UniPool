import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  slideContainer: {
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
  },
  sliderContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    height: 60,
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
  },
  slideTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 60,
  },
  slideIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.primaryLightGreen,
  },
  slideText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.basicBlack,
    textAlign: "center",
    flex: 1,
    marginRight: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
  emojiIcon: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    marginTop: 20,
    marginBottom: 20,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.basicBlack,
    marginLeft: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
});

export default styles;
