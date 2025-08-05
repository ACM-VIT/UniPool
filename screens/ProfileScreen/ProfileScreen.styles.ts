import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    width: '100%',
    paddingTop: height * 0.01,
    marginBottom: height * 0.01,
  },
  headerRow: {
    paddingHorizontal: width * 0.051,
    marginBottom: height * 0.02,
  },
  headerTitle: {
    fontSize: width * 0.062,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
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
    backgroundColor: AppColors.basicWhite,
  },
  userName: {
    fontSize: width * 0.046,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.03,
    paddingHorizontal: width * 0.026,
  },
  statsCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.041,
    padding: width * 0.041,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: width * 0.01,
    minHeight: height * 0.1,
  },
  statsValue: {
    fontSize: width * 0.051,
    fontWeight: "700",
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    marginBottom: height * 0.005,
  },
  statsLabel: {
    fontSize: width * 0.031,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  statsUnit: {
    fontSize: width * 0.026,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.8,
    marginTop: width * 0.005,
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
    fontSize: width * 0.046,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: height * 0.015,
  },
  menuContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: width * 0.046,
    borderWidth: width * 0.0064,
    marginBottom: height * 0.03,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: width * 0.041,
    paddingVertical: height * 0.0175,
    backgroundColor: AppColors.primaryLightGreen,
    borderBottomWidth: width * 0.0038,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  menuItemIcon: {
    width: width * 0.056,
    height: width * 0.056,
    marginRight: height * 0.015,
    tintColor: AppColors.secondaryDarkGreen,
    resizeMode: 'contain',
  },
  menuItemText: {
    fontSize: width * 0.041,
    fontFamily: "NunitoSans_400Regular",
    flex: 1,
  },
  checkmarkIcon: {
    width: width * 0.041,
    height: width * 0.041,
    tintColor: AppColors.primaryLightGreen,
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