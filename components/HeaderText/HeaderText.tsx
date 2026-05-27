import React from "react";
import { Text, Dimensions } from "react-native";
import styles from "./HeaderText.styles";
import { HeaderTextProps } from "./HeaderText.types";
import { useThemeColors } from "../../contexts/ThemeContext";

const { width } = Dimensions.get("window");

const HeaderText: React.FC<HeaderTextProps> = ({
  children,
  size = 22,
  paddingTop = width * 0.06,
  paddingBottom = width * 0.03,

}) => {
  const colors = useThemeColors();
  return (
    <Text style={[styles.header, { fontSize: size, paddingTop, color: colors.textPrimary }]}>
      {children}
    </Text>
  );
};

export default HeaderText;
