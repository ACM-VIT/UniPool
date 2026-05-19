import React from "react";
import { TouchableOpacity, Image } from "react-native";
import { useNavigation } from "../../navigation/router-compat";
import styles from "./ChevronBack.styles";
import { ChevronBackProps } from "./ChevronBack.types";

const ChevronBack: React.FC<ChevronBackProps> = ({ onPress, style }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
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
