import React, { ReactNode } from "react";
import { Text, StyleSheet, Dimensions, TextStyle } from "react-native";
import AppColors from "../design-system/colors";

const { width } = Dimensions.get("window");

interface HeaderTextProps {
  children: ReactNode;
  size?: number;
  paddingTop?: number;
}

const HeaderText: React.FC<HeaderTextProps> = ({
  children,
  size = 18,
  paddingTop = width * 0.06,
}) => (
  <Text style={[styles.header, { fontSize: size, paddingTop }]}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  header: {
    color: AppColors.secondaryDarkGreen,
    fontWeight: "300",
    paddingLeft: width * 0.06,
    paddingRight: width * 0.06,
    marginBottom: width * 0.05,
  },
});

export default HeaderText;
