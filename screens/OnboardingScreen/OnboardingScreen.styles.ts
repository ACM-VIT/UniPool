import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

export const SLIDE_WIDTH = width;

// Hero illustration container size. ~58% of the screen width on
// phones, clamped so it never towers on huge devices or shrinks
// uncomfortably on small ones. All three slides share this constant
// so the hero never "jumps" between panels.
export const HERO_SIZE = Math.min(Math.max(width * 0.58, 220), 280);

// Bottom chrome budget — page dots + primary CTA + sign-in link +
// safe-area gutter. Bumped a touch on iOS for the home indicator.
const BOTTOM_CHROME = Platform.OS === "ios" ? 232 : 212;
// Top chrome budget — wordmark + skip + a generous breath under the
// status bar / notch.
const TOP_CHROME = Platform.OS === "ios" ? 96 : 72;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
  },

  /* ----------------------------------------------------------------
   * Top chrome — wordmark + skip
   * -------------------------------------------------------------- */
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
    fontSize: 20,
    letterSpacing: -0.4,
    color: AppColors.primaryLightGreen,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
    color: AppColors.basicWhite,
    opacity: 0.55,
  },

  /* ----------------------------------------------------------------
   * Slide body — hero + text. All three slides have identical
   * geometry so the animated transitions land symmetrically.
   * -------------------------------------------------------------- */
  slide: {
    width,
    height,
    paddingTop: TOP_CHROME,
    paddingBottom: BOTTOM_CHROME,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroWrap: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Math.max(height * 0.04, 24),
  },
  textBlock: {
    width: "100%",
    paddingHorizontal: 4,
    marginTop: Math.max(height * 0.045, 28),
  },
  eyebrow: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12,
    letterSpacing: 1.6,
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    marginBottom: 12,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 32,
    lineHeight: 38,
    color: AppColors.basicWhite,
    letterSpacing: -0.7,
    marginBottom: 14,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15.5,
    lineHeight: 23,
    color: AppColors.basicWhite,
    opacity: 0.72,
    letterSpacing: -0.05,
  },

  /* ----------------------------------------------------------------
   * Bottom chrome — pagination + primary CTA + sign-in link.
   * Pinned absolute so the page indicators sit at a stable height
   * regardless of which slide is in view.
   * -------------------------------------------------------------- */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 26,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 8,
    marginBottom: 26,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: AppColors.primaryLightGreen,
  },
  // Lime fill, forest text — identical recipe to the Post a ride
  // / Rides around you CTAs on the home sheet, so the user enters
  // the product seeing the same button shape they'll tap inside.
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.3,
  },

});

export default styles;
