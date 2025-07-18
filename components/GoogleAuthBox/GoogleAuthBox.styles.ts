import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 25,
    borderRadius: 8,
    marginVertical: 5,
    alignSelf: "center",
    width: "80%",
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  text: {
    color: AppColors.basicWhite,
    fontWeight: "bold",
    fontSize: 20,
  },
});

export default styles;
