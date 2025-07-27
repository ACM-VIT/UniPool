import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  slideContainer: {
    marginVertical: 20,
    width: "100%",
  },
  sliderContainer: {
    borderRadius: 25,
    borderWidth: 2,
    height: 60,
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderButton: {
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slideTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 60,
  },
  slideIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  slideText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    fontFamily: "NunitoSans_600SemiBold",
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