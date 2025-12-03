import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: screenHeight * 0.1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: AppColors.basicBlack,
    marginBottom: 8,
    fontFamily: "NunitoSans_700Bold",
  },
  subtext: {
    fontSize: 22,
    fontWeight: "600",
    color: AppColors.secondaryDarkGreen,
    marginBottom: screenHeight * 0.15,
    fontFamily: "NunitoSans_600SemiBold",
  },
  lottieContainer: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: -100,
    position: 'relative',
  },
  lottieAnimation: {
    width: '120%',
    height: '120%',
  },
  watermarkHide: {
    position: 'absolute',
    bottom: screenHeight * 0.002,
    left: screenWidth * 0.44,
    width: screenWidth * 0.17,
    height: screenHeight * 0.02, 
    backgroundColor: AppColors.primaryLightGreen,
    zIndex: 10,
  },
  label: {
    fontSize: 22,
    fontWeight: "600",
    color: AppColors.basicBlack,
    marginTop: screenHeight * 0.05,
    marginBottom: screenHeight * 0.015,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: 'left',
  },
  image: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.3,
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingLeft: 24,
    borderRadius: 14.452,
    marginVertical: 12,
    borderWidth: 1.5,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    color: AppColors.primaryLightGreen,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 22,
    marginLeft: 16,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default styles;