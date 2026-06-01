import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Protect the wordmark from rounded screen corners.
    paddingHorizontal: 20,
  },
  // Left-align the wordmark when the location strip is hidden.
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
  // Use palette text and a real bold weight so long addresses truncate cleanly.
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
    // Keep the wordmark fixed while the location strip shrinks first.
    flexShrink: 0,
    // Small guard against right-edge glyph clipping on rounded screens.
    paddingRight: 2,
  },
});

export default styles;
