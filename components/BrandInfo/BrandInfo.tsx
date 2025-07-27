import React from "react";
import { View, Text, Image } from "react-native";
import styles from "./BrandInfo.styles";
import { BrandInfoProps } from "./BrandInfo.types";
import { useLocationInfo } from "../../contexts/location-context";

const BrandInfo: React.FC<BrandInfoProps> = ({ style }) => {
  const { loading, locationText, pincode } = useLocationInfo();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        <Image
          source={require("../../assets/beep-beep-location.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.locationText}>
            {loading ? "Fetching location..." : locationText || "—"}
          </Text>
          {pincode ? <Text style={styles.pincodeText}>{pincode}</Text> : null}
        </View>
      </View>
      <Text style={styles.brandText}>UniPool</Text>
    </View>
  );
};

export default BrandInfo;
