import React, { useState, useEffect } from "react";
import { View, Text, Image } from "react-native";
import * as Location from "expo-location";
import styles from "./BrandInfo.styles";
import { BrandInfoProps } from "./BrandInfo.types";

const BrandInfo: React.FC<BrandInfoProps> = ({ style }) => {
  const [locationText, setLocationText] = useState("Fetching location...");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationText("Permission denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(loc.coords);
      if (geocode && geocode.length > 0) {
        const first = geocode[0];
        const locStr = `${first.city ? first.city + ", " : ""}${
          first.region ? first.region + ", " : ""
        }${first.country || ""}`;
        setLocationText(locStr);
        setPincode(first.postalCode || "");
      }
    })();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        <Image 
          source={require("../../assets/beep-beep-location.png")} 
          style={styles.icon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.locationText}>{locationText}</Text>
          {pincode ? <Text style={styles.pincodeText}>{pincode}</Text> : null}
        </View>
      </View>
      <Text style={styles.brandText}>UniPool</Text>
    </View>
  );
};

export default BrandInfo;