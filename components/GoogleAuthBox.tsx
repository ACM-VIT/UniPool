import React from "react";
import { TouchableOpacity, Image, Text, StyleSheet } from "react-native";
import AppColors from "../design-system/colors";

interface GoogleAuthButtonProps {
  label: string;
  onPress: () => void;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Image source={require("../assets/google.png")} style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

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
  },
});

export default GoogleAuthButton;
