import { StyleSheet, Platform } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Lime brand canvas — the permissions moment stays in-brand
    // (Cash App, Lime app, Lyft all keep their brand colour for hero
    // permission interstitials).
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    // Centre the radar + text + CTA cluster vertically on iPad. On a
    // phone `flex: 1` heroBlock fills the space and the rest stacks
    // below it; on iPad the radar would otherwise eat ~1200pt of
    // vertical canvas and push the CTAs to the very bottom edge.
    // `justifyContent: center` re-anchors the cluster in the middle of
    // whatever envelope we have.
    justifyContent: "center",
    // Everything inside is composed on the vertical axis of the radar
    // — headline, subhead, feature rows, buttons all centred so the
    // page reads as one composed unit rather than a left-rag list.
    alignItems: "center",
  },
  // Hero block — radar centerpiece. With root `justifyContent: center`
  // the cluster centres regardless of canvas size, so we drop the
  // `flex: 1` that previously stretched the radar block to fill the
  // entire available height (great on phones, ugly on iPad).
  heroBlock: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  // Centred copy block — everything reads on the vertical axis of the
  // radar above. Capped width on wide phones so long lines don't
  // stretch into airline-safety-card territory.
  textBlock: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 20,
    alignItems: "center",
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 26,
    lineHeight: 32,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: "center",
    maxWidth: 320,
  },
  subhead: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.78,
    textAlign: "center",
    paddingHorizontal: 6,
    maxWidth: 320,
  },
  // Two short "what this unlocks" lines. No pill background, no
  // lime icon chip — those felt blocky next to the airy radar.
  // Just a small forest glyph beside calm forest text, tightly
  // aligned on the same baseline as the rest of the typography.
  featureRows: {
    marginTop: 18,
    gap: 12,
    alignSelf: "stretch",
    paddingHorizontal: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: 320,
    alignSelf: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13.5,
    lineHeight: 18,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
    letterSpacing: -0.05,
  },
  // CTA block — primary + secondary stacked, centred. `width: 100%`
  // so the primary button fills the column nicely; max-width keeps
  // it from going edge-to-edge on tablets.
  ctaBlock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "stretch",
    gap: 4,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    // Forest CTA on the lime canvas — same button system as Home,
    // SignUp, Trips, AvailableRides empty state.
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.1,
  },
});

export default styles;
