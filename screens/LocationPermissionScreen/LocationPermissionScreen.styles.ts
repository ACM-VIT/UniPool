import { StyleSheet, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  // Full-bleed lime canvas. Permission interstitials in best-in-class
  // apps (Cash App, Lyft, Lime) stay in brand colour rather than
  // bouncing to a neutral system sheet — owns the moment.
  root: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },

  // Single vertically-centred column for hero + copy + CTAs.
  // `justifyContent: space-between` on root would push the CTAs to
  // the absolute bottom edge; centring the whole cluster reads as
  // intentional composition rather than top-and-bottom-anchored
  // utility. The cluster's own internal spacing gives the rhythm.
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },

  // Hero — the brand mark in a soft cream tile. The tile is a hair
  // wider than the artwork so the lime blob in the illustration has
  // a calming gutter against the cream rather than bleeding into the
  // lime canvas behind it (the two limes would visually collide).
  heroWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlate: {
    borderRadius: 32,
    backgroundColor: AppColors.basicWhite,
    alignItems: "center",
    justifyContent: "center",
    // Restrained shadow — gives the plate a sense of being a
    // foreground card without over-styling. iOS picks up the shadow,
    // Android the elevation; the values are tuned so both platforms
    // land at roughly the same perceived lift.
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },

  // Headline + subhead read as one tight pair. Capped width keeps
  // the line breaks tasteful on wide phones + iPad.
  copy: {
    alignItems: "center",
    maxWidth: 360,
    paddingHorizontal: 4,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.7,
    textAlign: "center",
    marginBottom: 10,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15.5,
    lineHeight: 23,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.72,
    textAlign: "center",
    letterSpacing: -0.1,
  },

  // CTA stack — full-width forest primary, low-key secondary below.
  // Same button system as Home / SignUp / AvailableRides empty state
  // so the action affordance is muscle-memory by the time the user
  // lands here.
  ctaBlock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "stretch",
    gap: 6,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    letterSpacing: 0.1,
  },

  // Tiny bottom spacer so the secondary CTA doesn't kiss the nav-bar
  // line on older Android skins that under-report the bottom inset.
  androidPad: { height: 8 },
});

export default styles;
