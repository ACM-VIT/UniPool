import React from "react";
import { View, Text, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./BrandInfo.styles";
import { BrandInfoProps } from "./BrandInfo.types";
import { useLocationInfo } from "../../contexts/location-context";

const BrandInfo: React.FC<BrandInfoProps> = ({ style }) => {
  const { loading, locationText, pincode, error } = useLocationInfo();
  const insets = useSafeAreaInsets();

  // Show the location strip only when we have a real, resolved
  // address. Permission-denied / fetching / unknown states collapse
  // to just the UniPool wordmark — without this, the lime header
  // bar reads as a cluttered error message stacked under the brand.
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
      // Android: this app sets the StatusBar non-translucent (lime
      // canvas, dark icons) in app/_layout.tsx, so the system already
      // draws the bar above our content area and useSafeAreaInsets
      // returns top=0. The old formula here added max(insets.top, 16)
      // + 6 — i.e. an unconditional 22pt cushion below the status
      // bar — which read as a chunky empty gap above the wordmark.
      // Now we honour the inset when it's real (translucent or
      // notch-affected Android variants) and otherwise sit close to
      // the top with a 4pt breathing margin from the bar's bottom
      // edge. iOS path above is unchanged.
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
            style={styles.icon}
            resizeMode="contain"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={styles.locationText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationText}
            </Text>
            <Text style={styles.pincodeText} numberOfLines={1}>
              {pincode || " "}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.brandText} numberOfLines={1}>UniPool</Text>
    </View>
  );
};

export default BrandInfo;
