import React from "react";
import { Image, Text } from "react-native";
import { GoogleAuthButtonProps } from "./GoogleAuthBox.types";
import styles from "./GoogleAuthBox.styles";
import { useThemeColors } from "../../contexts/ThemeContext";
import PressableScale from "../PressableScale";

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  onPress,
}) => {
  const colors = useThemeColors();
  return (
    // Sign-in is a committed action → a slightly weightier tap.
    <PressableScale style={[styles.button, { backgroundColor: colors.navFill }]} onPress={onPress} haptic="medium">
      <Image source={require("../../assets/google.png")} style={styles.icon} />
      <Text style={[styles.text, { color: colors.navIconInactive }]}>{label}</Text>
    </PressableScale>
  );
};

export default GoogleAuthButton;
