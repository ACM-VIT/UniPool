import React from "react";
import { Text, Dimensions } from "react-native";
import styles from "./HeaderText.styles";
import { HeaderTextProps } from "./HeaderText.types";

const { width } = Dimensions.get("window");

const HeaderText: React.FC<HeaderTextProps> = ({
  children,
  size = 20,
  paddingTop = width * 0.06,
  
  letterSpacing = 2,
}) => (
  <Text style={[styles.header, { fontSize: size, paddingTop }]}>
    {children}
  </Text>
);

export default HeaderText;
