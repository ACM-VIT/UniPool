import React from "react";
import { TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import styles from "./ChevronBack.styles";
import { ChevronBackProps } from "./ChevronBack.types";

const ChevronBack: React.FC<ChevronBackProps> = ({ onPress, style }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={handlePress}>
      <Image 
        source={require("../../assets/arrow-square-left.png")} 
        style={styles.icon}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default ChevronBack;
