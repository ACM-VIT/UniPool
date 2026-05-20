import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Bumped from 14 → 20 so the "UniPool" wordmark on the right has
    // breathing room from the iPhone's rounded screen-corner curvature
    // on Dynamic Island devices. The previous 14pt let the final "l"
    // get clipped by the bezel curve.
    paddingHorizontal: 20,
  },
  // When the location strip is hidden (permission denied / loading),
  // the wordmark would otherwise drift to the right edge under
  // space-between. Left-align it so it sits where the brand mark
  // would naturally go.
  containerSolo: {
    justifyContent: "flex-start",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  // Was 16/bold-on-Regular-family which renders synthetic-bold + ugly
  // on Android, plus a `#222` raw hex off-palette. Now uses the brand
  // palette + a real bold weight; truncates cleanly when text is long.
  locationText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.15,
    flexShrink: 1,
  },
  pincodeText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    marginTop: 0,
    letterSpacing: 0.1,
  },
  brandText: {
    fontFamily: "Trap-Bold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    // Never let the wordmark be the flex-shrink target — the location
    // strip on the left should shrink + ellipsize first if the row
    // runs out of room. Previously the "l" in "UniPool" was getting
    // chopped because Text in a flex row defaults to shrinkable.
    flexShrink: 0,
    // A pixel of padding so the rightmost glyph's antialiasing edge
    // can't get clipped by the iPhone bezel curve on Dynamic Island
    // devices, where the screen's curved corner eats into the last
    // ~2pt of visible width.
    paddingRight: 2,
  },
});

export default styles;
