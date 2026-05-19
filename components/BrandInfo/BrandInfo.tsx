import React from "react";
import { View, Text, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./BrandInfo.styles";
import { BrandInfoProps } from "./BrandInfo.types";
import { useLocationInfo } from "../../contexts/location-context";

const BrandInfo: React.FC<BrandInfoProps> = ({ style }) => {
  const { loading, locationText, pincode } = useLocationInfo();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container, 
      Platform.OS === 'ios' && {
        paddingTop: Math.max(insets.top, 20),
      },
      style
    ]}>
      <View style={styles.leftSection}>
        <Image
          source={require("../../assets/beep-beep-location.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.locationText}>
            {loading ? "Locating you…" : locationText || "Unknown area"}
          </Text>
          {/* Always reserve a slot for the pincode so the header row's
              vertical position doesn't jump when the value arrives. */}
          <Text style={styles.pincodeText}>{pincode || " "}</Text>
        </View>
      </View>
      <Text style={styles.brandText}>UniPool</Text>
    </View>
  );
};

export default BrandInfo;
