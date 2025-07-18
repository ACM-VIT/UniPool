import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    paddingTop: height * 0.06,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 50,
  },
  profileContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    marginBottom: height * 0.05,
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.basicWhite,
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
});

export default styles;
