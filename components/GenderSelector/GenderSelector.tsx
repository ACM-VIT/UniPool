import React from "react";
import { View, Text } from "react-native";
import { GenderSelectorProps } from "./GenderSelector.types";
import styles from "./GenderSelector.styles";
import { useThemeColors } from "../../contexts/ThemeContext";
import PressableScale from "../PressableScale";

const options = [
  ["Male", "Female"],
];


const GenderSelector: React.FC<GenderSelectorProps> = ({ value, onChange }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      {options.map((row) => (
        <View key={row.join("|")} style={styles.row}>
          {row.map((option) => {
            const isSelected = value === option;
            return (
              <PressableScale
                key={option}
                style={[
                  styles.button,
                  { backgroundColor: colors.navFill },
                  isSelected && { backgroundColor: colors.surfaceElevated },
                ]}
                // Segmented value change → a crisp selection tick.
                haptic="selection"
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
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default GenderSelector;
