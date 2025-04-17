import React from "react";
import { TouchableOpacity, Image, Text } from "react-native";
import { GoogleAuthButtonProps } from "./GoogleAuthBox.types";
import styles from "./GoogleAuthBox.styles";

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Image source={require("../../assets/google.png")} style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

export default GoogleAuthButton;
