import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Lime brand canvas — sign-up sits in the same surface family as
    // every other onboarding-adjacent screen.
    backgroundColor: AppColors.primaryLightGreen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Platform.OS === "ios" ? 12 : 4,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(181,215,80,0.18)",
  },
  stepPillText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.4,
  },
  heroBlock: {
    marginBottom: 24,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: AppColors.secondaryDarkGreen,
    marginBottom: 10,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    lineHeight: 22,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
  },
  fieldLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    marginBottom: 8,
    marginTop: 18,
  },
  inputWrap: {
    height: 56,
    borderRadius: 14,
    // Forest dark input on the lime canvas — same surface system as
    // RideDetailsSelector and the CreateRide steppers.
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  inputWrapFocused: {
    borderColor: AppColors.primaryLightGreen,
    borderWidth: 2,
  },
  prefix: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 16,
    color: AppColors.basicWhite,
    paddingVertical: 0,
  },
  helper: {
    marginTop: 6,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderChip: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  genderChipSelected: {
    backgroundColor: AppColors.primaryLightGreen,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  genderChipText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.primaryLightGreen,
    opacity: 0.85,
  },
  genderChipTextSelected: {
    color: AppColors.secondaryDarkGreen,
    opacity: 1,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  ctaWrap: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    backgroundColor: "transparent",
    borderTopWidth: 0,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnDisabled: {
    backgroundColor: "rgba(38,59,51,0.55)",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  privacyNote: {
    marginTop: 12,
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.5,
    textAlign: "center",
  },
});

export default styles;
