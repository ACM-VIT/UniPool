import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import AppColors from "../design-system/colors";

const options = [
  ["Male", "Female"],
  ["Others", "PNS"],
];

const { width } = Dimensions.get("window");

const GenderSelector = () => {
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: width * 0.06,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: width * 0.02,
  },
  button: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: width * 0.03,
    paddingHorizontal: width * 0.05,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginHorizontal: width * 0.005,
    marginTop: width * 0.03,
    marginRight: width * 0.05,
  },
  selectedButton: {
    backgroundColor: AppColors.basicWhite,
  },
  text: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontWeight: "600",
  },
  selectedText: {
    color: AppColors.basicBlack,
  },
});

export default GenderSelector;
