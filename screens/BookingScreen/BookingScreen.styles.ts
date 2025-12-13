import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const window = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    width: "100%",
  },

  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: AppColors.primaryLightGreen,
    paddingTop: window.height * 0.035,
    paddingBottom: 6,
  },

  scrollContent: {
    paddingTop: window.height * 0.13,
    paddingBottom: 120,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: window.width * 0.05,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
  },

  sectionDate: {
    fontSize: 13,
    marginTop: 4,
    color: "#4C5A3E",
    fontFamily: "NunitoSans_400Regular",
  },

  viewAllButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },

  viewAllButtonText: {
    color: "white",
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },

  pageContainer: {
    width: window.width,
    paddingHorizontal: window.width * 0.05,
  },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  paginationDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#A9A9A9",
    marginHorizontal: 4,
  },

  paginationDotActive: {
    backgroundColor: AppColors.basicBlack,
  },

  emptyPage: {
    width: window.width,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },

  emptyText: {
    fontSize: 14,
    color: "#444",
    fontFamily: "NunitoSans_400Regular",
  },

  airplaneIcon: {
    position: "absolute",
    width: window.width * 0.55,
    height: window.width * 0.28,
    bottom: 70,
    right: -25,
    zIndex: 5,
    opacity: 1,
  },
});
