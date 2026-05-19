import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
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
  },
});

export default styles;
