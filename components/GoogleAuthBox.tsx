import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  View,
  GestureResponderEvent,
} from "react-native";
import AppColors from "../design-system/colors";

interface GoogleAuthButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
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

export default GoogleAuthButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  text: {
    alignSelf: "center",
    color: AppColors.basicWhite,
    fontWeight: "bold",
  },
});
