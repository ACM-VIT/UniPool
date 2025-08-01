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
