import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import { haptic } from "../../components/haptics";
import styles from "./RideCreatedScreen.styles";
import { appHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { useTabletContentStyle } from "../../utils/responsive";
import { useThemeColors } from "../../contexts/ThemeContext";

const RideCreatedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const { replace } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const params = useDecodedLocalSearchParams<{ rideId?: string }>();
  const colors = useThemeColors();

  useEffect(() => {
    if (props.setNavBarVariant) {
      props.setNavBarVariant(0);
    }
    // Ride is live — confirm the create with a success tap as the
    // interstitial lands.
    haptic("success");
    // Brief success interstitial → ride management screen (RideDetailsScreen
    // with the brand-new ride preloaded). Falls back to the bookings tab if
    // we somehow got here without an ID (defensive — shouldn't happen given
    // the CreateRide handler always passes one). The management screen is
    // where the host can share their ride link / QR with users.
    const timer = setTimeout(() => {
      if (params?.rideId) {
        replace(appHref("RideDetailsScreen", {
          rideId: params.rideId,
          expectedViewerState: "host",
          // The host arrived here by submitting the create-ride
          // form — there's nothing meaningful to "go back" to.
          // RideDetailsScreen swaps the chevron for a Home glyph
          // when this is set, and routes to HomeScreen via
          // router.replace so the form doesn't linger in the
          // back stack.
          backToHome: true,
        } as any) as any);
      } else {
        replace(appHref("BookingScreen"));
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant, replace, params?.rideId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
      <Image source={require("../../assets/create.png")} style={styles.create} resizeMode="contain" />
    </View>
  );
};

export default RideCreatedScreen;
