import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Lime brand canvas — the location-permission moment stays in-brand
    // (Cash App, Lime app, Lyft all keep their brand colour for these
    // hero permission interstitials).
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 90 : 60,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  visualContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  textBlock: {
    marginBottom: 24,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.secondaryDarkGreen,
    marginTop: 9,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
  },
  bullets: {
    marginBottom: 8,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    // Forest CTA on the lime canvas — same button system as Home,
    // SignUp, Trips, AvailableRides empty state.
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  secondaryBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
  },
});

export default styles;
