import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: width * 0.02,
  },
  genderContainer: {
    marginBottom: height * 0.04,
    marginTop: height * 0.02,
    zIndex: 1,
  },
  completeButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.03,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.08,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.03,
    marginHorizontal: width * 0.05,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completeButtonDisabled: {
    backgroundColor: AppColors.secondaryDarkGreen + "60",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  completeButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: width * 0.045,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
  completeButtonTextDisabled: {
    color: AppColors.primaryLightGreen + "80",
  },
  bottomIcon: {
    position: 'absolute',
    bottom: -23,
    right: -35,
    width: 350,
    height: 560,
    zIndex: -99999,
  },
});

export default styles;
