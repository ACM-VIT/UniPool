import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  /* Heart-eyes "Ride Requested" hero. Kept identical to the prior
     build — sizing rules preserve the asset's vertical proportions
     across small + large phones via the dual cap. */
  create: {
    width: Math.min(screenWidth * 0.55, 240),
    height: Math.min(screenHeight * 0.32, 260),
    resizeMode: "contain",
    maxWidth: "70%",
    maxHeight: "40%",
    marginBottom: 12,
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },

  /* "Request sent" card. Sits below the hero once the entrance
     animation settles. Three CTAs stacked in priority order:
     primary (View request status), secondary outlined (Message host),
     tertiary text link (Back to trips). Quiet hierarchy so the
     user's eye lands on "View request status" first. */
  ctaCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  ctaTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 24,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  ctaBody: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  ctaPrimary: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaPrimaryText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },
  /* Secondary — outlined pill in forest with no fill. Reads as
     "available but not the headline action". */
  ctaSecondary: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "transparent",
  },
  ctaSecondaryText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.3,
  },
  /* Tertiary — bare text link so the user always has a way back to
     the trips list without it competing with the two real CTAs. */
  ctaTertiary: {
    paddingVertical: 14,
    marginTop: 4,
  },
  ctaTertiaryText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    letterSpacing: 0.2,
  },
});

export default styles;
