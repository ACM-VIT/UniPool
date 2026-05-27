import React from "react";
import { TouchableOpacity, Image, Text } from "react-native";
import { GoogleAuthButtonProps } from "./GoogleAuthBox.types";
import styles from "./GoogleAuthBox.styles";
import { useThemeColors } from "../../contexts/ThemeContext";

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  onPress,
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.navFill }]} onPress={onPress}>
      <Image source={require("../../assets/google.png")} style={styles.icon} />
      <Text style={[styles.text, { color: colors.navIconInactive }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default GoogleAuthButton;
