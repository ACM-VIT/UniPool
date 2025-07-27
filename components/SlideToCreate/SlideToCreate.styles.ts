import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  slideContainer: {
    marginVertical: 20,
    width: "100%",
  },
  sliderContainer: {
    borderRadius: 15,
    borderWidth: 2,
    height: 60,
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderButton: {
    borderRadius: 15,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  sliderButtonImage: {
    width: 90,
    height: 60,
    borderRadius: 15,
    resizeMode: "contain",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -20,
  },
  slideTextContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 80,
    marginTop: -10,
    zIndex: 999,

  },
  slideIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  slideText: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    color: AppColors.basicBlack,
    flex: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    zIndex: 999,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  endIcon: {
    width: 24,
    height: 24,
    marginLeft: 10,
    resizeMode: "contain",
  },
  loadingContainer: {
    borderRadius: 25,
    borderWidth: 2,
    marginVertical: 20,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
});

export default styles;