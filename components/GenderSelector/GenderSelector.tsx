import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GenderSelectorProps } from "./GenderSelector.types";
import styles from "./GenderSelector.styles";
import { useThemeColors } from "../../contexts/ThemeContext";

const options = [
  ["Male", "Female"],
];


const GenderSelector: React.FC<GenderSelectorProps> = ({ value, onChange }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      {options.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((option, index) => {
            const isSelected = value === option;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  { backgroundColor: colors.navFill },
                  isSelected && { backgroundColor: colors.surfaceElevated },
                ]}
                onPress={() => onChange(option)}
              >
                <Text style={[
                  styles.text,
                  { color: colors.navIconInactive },
                  isSelected && (colors.mode === "dark"
                    ? { color: colors.textPrimary }
                    : styles.selectedText),
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default GenderSelector;
