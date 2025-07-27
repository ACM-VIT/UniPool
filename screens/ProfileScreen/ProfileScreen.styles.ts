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
    paddingHorizontal: 20,
    paddingTop: height * 0.01,
    marginBottom: height * 0.01,
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: height * 0.02,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  
  profileSection: {
    alignItems: "center",
    marginBottom: height * 0.03,
  },
  profileImageContainer: {
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.basicWhite,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.03,
    paddingHorizontal: 10,
  },
  statsCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 4,
    minHeight: 80,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  statsUnit: {
    fontSize: 10,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.8,
    marginTop: 2,
  },
  section: {
    marginBottom: height * 0.025,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: AppColors.secondaryDarkGreen,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: AppColors.secondaryDarkGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: AppColors.primaryLightGreen,
    borderBottomWidth: 1.5,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  menuItemIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    tintColor: AppColors.secondaryDarkGreen,
    resizeMode: 'contain',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    flex: 1,
  },
  checkmarkIcon: {
    width: 16,
    height: 16,
    tintColor: AppColors.primaryLightGreen,
  },

  footerBranding: {
    position: 'relative',
    width: '100%',
    height: 400,
    marginTop: height * 0.03,
  },
  footerTextContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  footerTitle: {
    fontSize: 32,
    fontWeight: "400",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_400Regular",
    lineHeight: 36,
    textAlign: "center",
    marginBottom: -8,
  },
  footerSubtitle: {
    fontSize: 50,
    fontWeight: "800",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_700Bold",
    lineHeight: 50,
    textAlign: "center",
    marginBottom: 8,
  },
  footerCredits: {
    fontSize: 14,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  footerImageContainer: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    width: '100%',
    height: 400,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  footerImage: {
    width: '112%',
    height: 500,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    position: 'absolute',
    bottom: -85,
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
    marginTop: 16,
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_400Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
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
    marginRight: 16,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  backButton: {
    position: "absolute",
    top: height * 0.07,
    left: 20,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: height * 0.015,
    marginBottom: height * 0.04,
  },
  profileContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  userInfoContainer: {
    width: "100%",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    padding: 24,
    marginBottom: height * 0.1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    flex: 2,
    textAlign: "right",
  },
});

export default styles;