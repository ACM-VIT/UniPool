import { StyleSheet } from "react-native";
import AppColors from "../../design_systems/colors";

const styles = StyleSheet.create({
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 16,
    paddingLeft: 24,
    borderRadius: 14.452,
    borderWidth: 1.5,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
    marginTop: 32,
    minHeight: 56,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: AppColors.primaryLightGreen,
    fontWeight: "600",
    fontSize: 22,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 16,
  },
});

export default styles;
