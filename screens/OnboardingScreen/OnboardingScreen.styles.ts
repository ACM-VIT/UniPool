import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

export const SLIDE_WIDTH = width;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 28,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  wordmark: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.5,
    color: AppColors.primaryLightGreen,
  },
  wordmarkPool: {
    color: AppColors.basicWhite,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: AppColors.basicWhite,
    opacity: 0.7,
  },
  slide: {
    width,
    height,
    paddingTop: Platform.OS === "ios" ? 120 : 90,
    paddingBottom: 220,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  slideLight: {
    backgroundColor: AppColors.basicWhite,
  },
  illustration: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    width: "100%",
    paddingHorizontal: 4,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 36,
    color: AppColors.basicWhite,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  headlineDark: {
    color: AppColors.secondaryDarkGreen,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: AppColors.basicWhite,
    opacity: 0.78,
  },
  subheadDark: {
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    height: 8,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 17,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryBtnText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 15,
    color: AppColors.basicWhite,
    opacity: 0.85,
  },
  secondaryBtnTextDark: {
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
  },
});

export default styles;
