import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
    // Top padding is applied dynamically in the component using
    // `useSafeAreaInsets()` so the back chip + wordmark hug the
    // status bar instead of floating ~50pt below it.
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    // Brand display face shared with splash and header wordmarks.
    fontFamily: "Trap-Bold",
    fontSize: 22,
    letterSpacing: -0.6,
    color: AppColors.secondaryDarkGreen,
  },
  heroBlock: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 32,
  },
  greeting: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: AppColors.secondaryDarkGreen,
    marginBottom: 12,
  },
  subtext: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 17,
    lineHeight: 24,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    marginBottom: 8,
  },
  lottieContainer: {
    height: height * 0.28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    overflow: "hidden",
    position: "relative",
  },
  lottieAnimation: {
    width: "120%",
    height: "120%",
  },
  watermarkHide: {
    // Lottielab tags free-tier exports with a tiny watermark in the
    // bottom-right of the artboard. Patch sized to the badge — colour
    // now matches the lime canvas behind it.
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 92,
    height: 22,
    backgroundColor: AppColors.primaryLightGreen,
    zIndex: 5,
  },
  authBlock: {
    // Forest dark anchor card at the bottom of the lime canvas. Bold,
    // confident, and the auth buttons read crisp against deep dark.
    // Two-tone brand: lime hero on top, forest base below.
    backgroundColor: AppColors.secondaryDarkGreen,
    marginHorizontal: -28,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: Platform.OS === "ios" ? 44 : 30,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  button: {
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  // Apple HIG-compliant contrast pairing.
  appleButton: {
    backgroundColor: "#000000",
  },
  appleButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: AppColors.basicWhite,
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  googleButton: {
    // White button stays white — it's the Google-branded surface.
    // Reads as the "secondary" option against the lime primary.
    backgroundColor: AppColors.basicWhite,
    borderWidth: 0,
  },
  googleButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  footerText: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: AppColors.primaryLightGreen,
    opacity: 0.55,
    textAlign: "center",
  },
  footerLink: {
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.primaryLightGreen,
    opacity: 1,
    textDecorationLine: "underline",
  },
});

export default styles;
