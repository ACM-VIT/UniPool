import React from "react";
import { View, Text, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./BrandInfo.styles";
import { BrandInfoProps } from "./BrandInfo.types";
import { useLocationInfo } from "../../contexts/location-context";
import { useThemeColors } from "../../contexts/ThemeContext";

const BrandInfo: React.FC<BrandInfoProps> = ({ style }) => {
  const { loading, locationText, pincode, error } = useLocationInfo();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Show the location strip only after it resolves to a real address.
  const hasResolvedLocation =
    !error &&
    !loading &&
    !!locationText &&
    locationText !== "Fetching location..." &&
    locationText !== "Locating you…" &&
    locationText !== "Tap to enable location" &&
    locationText !== "Unknown area";

  return (
    <View style={[
      styles.container,
      Platform.OS === 'ios' && {
        paddingTop: Math.max(insets.top, 20),
      },
      // Android usually has a non-translucent status bar, so keep only
      // a small gap unless the platform reports a real top inset.
      Platform.OS === 'android' && {
        paddingTop: Math.max(insets.top, 4),
      },
      !hasResolvedLocation && styles.containerSolo,
      style,
    ]}>
      {hasResolvedLocation ? (
        <View style={styles.leftSection}>
          <Image
            source={require("../../assets/beep-beep-location.png")}
            style={[styles.icon, { tintColor: colors.brandText }]}
            resizeMode="contain"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.locationText, { color: colors.brandText }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationText}
            </Text>
            <Text
              style={[styles.pincodeText, { color: colors.brandText, opacity: 0.6 }]}
              numberOfLines={1}
            >
              {pincode || " "}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={[styles.brandText, { color: colors.brandText }]} numberOfLines={1}>
        UniPool
      </Text>
    </View>
  );
};

export default BrandInfo;
