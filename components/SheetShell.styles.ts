import AppColors from "../design_systems/colors";

/**
 * Shared style tokens for sheet content (title, body, inputs,
 * buttons, OTP-style code field). Exported so individual sheets
 * can compose them without re-defining the brand surface.
 *
 * THEME MIGRATION NOTE: this object is a module-scope literal and
 * therefore captures the LIGHT palette colours at import time. It is
 * consumed as `sheetUi.X` in several files (CreateRide,
 * ChatMessages, VerifyAcademicSheet, ...) so converting it to a
 * `sheetUi(colors)` factory would force a multi-file rewrite. For
 * now it's intentionally left frozen — the SheetShell *chrome*
 * (background, handle, close X) above is fully theme-aware, and
 * individual sheets should inline-override the relevant text/input
 * colours with `useThemeColors()` if they need dark-mode fidelity.
 */
export const sheetUi = {
  sheetTitle: {
    fontFamily: "NunitoSans_800ExtraBold" as const,
    fontSize: 26,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 6,
    paddingRight: 44,
  },
  sheetBody: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    marginBottom: 22,
  },
  inputWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: "NunitoSans_700Bold" as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase" as const,
  },
  input: {
    backgroundColor: "rgba(38,59,51,0.05)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold" as const,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
  },
  inputCode: {
    fontSize: 26,
    letterSpacing: 12,
    textAlign: "center" as const,
    fontFamily: "NunitoSans_800ExtraBold" as const,
    paddingVertical: 16,
  },
  inputHint: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 6,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold" as const,
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  linkBtn: {
    paddingVertical: 10,
    alignItems: "center" as const,
  },
  linkBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold" as const,
    fontSize: 13.5,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
};
