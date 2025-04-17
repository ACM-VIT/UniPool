import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";
import AppColors from "../design-system/colors";

const CustomInput: React.FC<TextInputProps> = (props) => {
  return (
    <TextInput
      {...props}
      placeholderTextColor={AppColors.primaryLightGreen}
      style={[styles.input, props.style]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: AppColors.secondaryDarkGreen,
    marginHorizontal: "6%",
  },
});

export default CustomInput;
