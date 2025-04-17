import React from "react";
import { TextInput } from "react-native";
import { CustomInputProps } from "./CustomInput.types";
import styles from "./CustomInput.styles";
import AppColors from "../../design_systems/colors";

const CustomInput: React.FC<CustomInputProps> = (props) => {
  return (
    <TextInput
      {...props}
      placeholderTextColor={AppColors.primaryLightGreen}
      style={[styles.input, props.style]}
    />
  );
};

export default CustomInput;
