import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const window = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    paddingTop: window.height * 0.062,
  },
  backButton: {
    position: "absolute",
    top: window.height * 0.04,
    left: 20,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: 1,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: "2%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: "2%",
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_400Regular",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.basicBlack,
    right: "2%",
    fontFamily: "NunitoSans_400Regular",
  },
  pageContainer: {
    width: window.width,
    paddingHorizontal: window.width * 0.05,
  },
  sectionTitle: {
    fontSize: 20,
    marginLeft: window.width * 0.03,
    marginBottom: window.height * 0.02,
    marginTop: window.height * 0.02,
    fontFamily: "NunitoSans_400Regular",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: AppColors.basicWhite,
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: AppColors.basicBlack,
  },
  airplaneIcon: {
    width: window.width * 0.9,
    height: window.width * 0.63,
    left: window.width * 0.23,
    bottom: window.height * 0.02,
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
    bottom: window.height * 0.015,
  },
});

export default styles;
