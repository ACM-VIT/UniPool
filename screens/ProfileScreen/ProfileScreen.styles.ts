import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Lime brand canvas. Cream menu cards float inside (see menuContainer
    // below). Identity-first.
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    width: '100%',
    marginBottom: height * 0.01,
  },
  headerRow: {
    paddingHorizontal: width * 0.051,
    marginBottom: height * 0.02,
  },
  // Page title for all settings sub-pages (Profile, Personal Info,
  // Passengers History, Account Settings, etc.). Dialed from 800
  // ExtraBold @ 27pt to 700Bold @ 24pt — same pattern as the rest of
  // the calmed-down typography pass. Confident page header, not a
  // shouty banner.
  headerTitle: {
    fontSize: 24,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.3,
    marginLeft: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: width * 0.051,
    paddingBottom: height * 0.15,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: height * 0.03,
  },
  profileImageContainer: {
    marginBottom: height * 0.015,
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: width * 0.205,
    height: width * 0.205,
    borderRadius: width * 0.103,
    // Forest avatar slot on the lime canvas — when no image is loaded,
    // it reads as an empty slot, not a white pop.
    backgroundColor: AppColors.secondaryDarkGreen,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
  },
  userName: {
    fontSize: width * 0.054,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.03,
    paddingHorizontal: width * 0.026,
  },
  statsCard: {
    // Forest card on the lime canvas — bold, palette-matched, lifted
    // by a deeper shadow. Inverts the typography (lime numerals on
    // forest surface).
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.04,
    paddingVertical: width * 0.045,
    paddingHorizontal: width * 0.03,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: width * 0.012,
    minHeight: height * 0.1,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  statsIcon: {
    width: width * 0.064,
    height: width * 0.064,
    marginBottom: height * 0.008,
    // Lime tint so the icon reads on the forest statsCard.
    tintColor: AppColors.primaryLightGreen,
  },
  statsValue: {
    fontSize: width * 0.062,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.4,
  },
  statsLabel: {
    fontSize: width * 0.032,
    color: AppColors.primaryLightGreen,
    opacity: 0.75,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statsUnit: {
    fontSize: width * 0.028,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.6,
  },
  section: {
    marginBottom: height * 0.025,
  },
  newSection: {
    marginBottom: height * 0.025,
    marginLeft: width * 0.064,
    marginRight: width * 0.064,
  },
  sectionTitle: {
    // Matches the HomeScreen + chat-list section titles: sentence-
    // case, 600SemiBold, dimmed. The point is that these are quiet
    // mile-markers above their menu card, not headlines competing
    // for the eye. Was 800ExtraBold uppercase — too "shouty" for the
    // overall screen rhythm.
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: height * 0.01,
    marginLeft: 2,
    letterSpacing: -0.05,
    opacity: 0.7,
  },
  menuContainer: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.04,
    marginBottom: height * 0.025,
    overflow: "hidden",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: width * 0.045,
    paddingVertical: height * 0.018,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderBottomWidth: 1,
    // Light hairline on the forest card matches RideDetailsSelector's
    // row separators.
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  menuItemIcon: {
    width: width * 0.058,
    height: width * 0.058,
    marginRight: height * 0.016,
    resizeMode: 'contain',
    // Lime tint on every menu icon — without this, the PNGs render in
    // their native dark forest tone and disappear on the forest tile.
    tintColor: AppColors.primaryLightGreen,
  },
  menuItemText: {
    fontSize: width * 0.042,
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
    letterSpacing: -0.1,
  },
  checkmarkIcon: {
    width: width * 0.041,
    height: width * 0.041,
  },
  footerBranding: {
    position: 'relative',
    width: '100%',
    height: height * 0.25,
  },
  footerTextContainer: {
    position: 'absolute',
    top: height * 0.22,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  footerTitle: {
    fontSize: width * 0.128,
    color: AppColors.basicBlack,
    fontFamily: "Trap-Bold",
    lineHeight: width * 0.092,
    textAlign: "center",
    marginBottom: 0,
  },
  footerSubtitle: {
    fontSize: width * 0.128,
    color: AppColors.basicBlack,
    fontFamily: "Trap-Bold",
    lineHeight: width * 0.128,
    textAlign: "center",
    marginBottom: height * 0.01,
  },
  footerCredits: {
    fontSize: width * 0.036,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  footerImageContainer: {
    position: 'absolute',
    bottom: height * -0.035,
    left: 0,
    right: 0,
    width: '100%',
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  footerImage: {
    width: '112%',
    height: height * 0.625,
    borderTopLeftRadius: width * 0.103,
    borderTopRightRadius: width * 0.103,
    position: 'absolute',
    bottom: height * -0.106,
    resizeMode: 'contain',
  },

  bottomPadding: {
    height: height * 0,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: width * 0.041,
    fontSize: width * 0.041,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_400Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: width * 0.051,
  },
  errorText: {
    fontSize: width * 0.041,
    color: "red",
    textAlign: "center",
    fontFamily: "NunitoSans_400Regular",
  },

  navBarView: {
    position: "absolute",
    bottom: height * 0.015,
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },

  profileImageContainerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: width * 0.041,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  backButton: {
    position: "absolute",
    top: height * 0.07,
    left: width * 0.051,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: width * 0.051,
    paddingTop: height * 0.015,
    marginBottom: height * 0.04,
  },
  profileContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: width * 0.051,
  },
  userInfoContainer: {
    width: "100%",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.041,
    padding: width * 0.062,
    marginBottom: height * 0.1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: width * 0.041,
    paddingVertical: height * 0.01,
  },
  infoLabel: {
    fontSize: width * 0.041,
    fontWeight: "500",
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
  },
  infoValue: {
    fontSize: width * 0.041,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    flex: 2,
    textAlign: "right",
  },
});

export default styles;