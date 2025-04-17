import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GenderSelectorProps } from "./GenderSelector.types";
import styles from "./GenderSelector.styles";

const options = [
  ["Male", "Female"],
  ["Others", "PNS"],
];

const GenderSelector: React.FC<GenderSelectorProps> = () => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {options.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((option, index) => {
            const isSelected = selectedGender === option;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.button, isSelected && styles.selectedButton]}
                onPress={() => setSelectedGender(option)}
              >
                <Text style={[styles.text, isSelected && styles.selectedText]}>
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
