import { StyleSheet, Dimensions, Platform } from "react-native";
import AppColors from "../../design_systems/colors";
import App from "../../App";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "ios" ? height * 0.12 : height * 0.08,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
    justifyContent: 'space-between',
  },
  genderContainer: {
    marginBottom: height * 0.02,
    marginTop: height * 0.002,
    zIndex: 1,
  },
  completeButton: {
    borderRadius: width * 0.03,
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.08,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.03,
    marginHorizontal: width * 0.02,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: height * 0.065,
    alignSelf: 'stretch',
    backgroundColor: AppColors.secondaryDarkGreen,
    borderWidth: 0,
  },
  completeButtonDisabled: {
    backgroundColor: AppColors.secondaryDarkGreen,
    elevation: 1,
    shadowOpacity: 0.1,
    opacity: 0.7,
  },
  completeButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: width * 0.045,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "center",
  },
  completeButtonTextDisabled: {
    color: AppColors.primaryLightGreen,
  },
  bottomIcon: {
    position: 'absolute',
    bottom: Platform.OS === "ios" ? -height * 0.04 : -23,
    right: -35,
    width: 350,
    height: 560,
    zIndex: -99999,
  },
});

export default styles;