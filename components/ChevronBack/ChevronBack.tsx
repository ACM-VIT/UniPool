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
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      // ChevronBack renders a 24×24 icon with 8pt padding — about 40pt
      // of actual hit area, just below Apple's 44pt HIG minimum. We add
      // a 10pt hitSlop on each side so the *touch* target is ~60pt even
      // though the painted button stays small and tight against the
      // header. No visual change, just a friendlier finger zone.
      hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
      // VoiceOver users hear "Back" + "Button" so they understand what
      // happens when they activate this. Without an explicit label the
      // screen reader would just say "Image" — opaque for blind users.
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Image
        source={require("../../assets/arrow-square-left.png")}
        style={styles.icon}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default ChevronBack;
