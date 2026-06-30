import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

// Width-relative typography scale, capped so tablets get only a modest bump.
const fontScale = Math.min(Math.max(width / 390, 1.0), 1.18);
const fs = (size: number) => Math.round(size * fontScale);

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
    // paddingTop is applied dynamically from the safe-area inset in
    // the component, so the back chip hugs the status bar.
    paddingBottom: 24,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  backBtn: {
    display: "none",
    width: 0,
    height: 0,
    opacity: 0,
  },
  heroBlock: {
    marginBottom: 24,
  },
  headlineRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headline: {
    flex: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: fs(30),
    lineHeight: fs(36),
    letterSpacing: -0.6,
    color: AppColors.secondaryDarkGreen,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: fs(17),
    lineHeight: fs(23),
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
  },
  fieldLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: fs(15),
    letterSpacing: -0.1,
    color: AppColors.secondaryDarkGreen,
    // Keep labels readable without competing with entered values.
    opacity: 0.85,
    marginBottom: 8,
    marginTop: 18,
  },
  // Inline modifier on a field label — used for "(Optional)" hints so
  // it reads as a lighter aside rather than competing with the label.
  fieldLabelMuted: {
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.65,
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
    fontSize: fs(16),
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    marginRight: 8,
  },
  // Country code pill inside the phone input — tap to open the
  // CountryPicker. Lives flush with the left edge of the input
  // wrap so flag + dial code feel like part of the field itself.
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    paddingLeft: 0,
    gap: 6,
  },
  countryFlag: {
    fontSize: fs(22),
  },
  countryDial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: fs(16),
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  countryDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(181,215,80,0.20)",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: fs(17),
    color: AppColors.basicWhite,
    paddingVertical: 0,
  },
  helper: {
    marginTop: 6,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: fs(13),
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
    fontSize: fs(15),
    color: AppColors.primaryLightGreen,
    opacity: 0.85,
  },
  genderChipTextSelected: {
    color: AppColors.secondaryDarkGreen,
    opacity: 1,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  // Optional academic verify — single-row button matching the
  // forest input surface so it reads as part of the form. After
  // verification it inverts to a lime "done" pill with a check.
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 56,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  verifyBtnDone: {
    backgroundColor: AppColors.primaryLightGreen,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: fs(15),
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.1,
  },
  verifyBtnTextDone: {
    color: AppColors.secondaryDarkGreen,
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
    fontSize: fs(17),
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  privacyNote: {
    marginTop: 12,
    fontFamily: "NunitoSans_400Regular",
    fontSize: fs(13),
    lineHeight: fs(18),
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textAlign: "center",
  },
});

export default styles;
