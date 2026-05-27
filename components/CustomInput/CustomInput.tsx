import React from "react";
import { TextInput } from "react-native";
import { CustomInputProps } from "./CustomInput.types";
import styles from "./CustomInput.styles";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";

const CustomInput: React.FC<CustomInputProps> = (props) => {
  const colors = useThemeColors();
  // Light mode keeps the historical lime-on-forest pairing (forest input,
  // lime text + lime placeholder). Dark mode uses a muted cream placeholder
  // on the raised charcoal nav-fill so the placeholder reads as recessed.
  const placeholder =
    colors.mode === "dark" ? colors.textTertiary : AppColors.primaryLightGreen;
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholder}
      style={[styles.input, { backgroundColor: colors.navFill, color: colors.navIconInactive }, props.style]}
    />
  );
};

export default CustomInput;
