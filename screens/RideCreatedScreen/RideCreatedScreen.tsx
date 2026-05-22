import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import styles from "./RideCreatedScreen.styles";
import { appHref, useDecodedLocalSearchParams } from "../../navigation/routes";

const RideCreatedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const router = useRouter();
  const params = useDecodedLocalSearchParams<{ rideId?: string }>();

  useEffect(() => {
    if (props.setNavBarVariant) {
      props.setNavBarVariant(0);
    }
    // Brief success interstitial → ride management screen (RideDetailsScreen
    // with the brand-new ride preloaded). Falls back to the bookings tab if
    // we somehow got here without an ID (defensive — shouldn't happen given
    // the CreateRide handler always passes one). The management screen is
    // where the host can share their ride link / QR with users.
    const timer = setTimeout(() => {
      if (params?.rideId) {
        router.replace(appHref("RideDetailsScreen", {
          rideId: params.rideId,
          expectedViewerState: "host",
        } as any) as any);
      } else {
        router.replace(appHref("BookingScreen"));
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant, router, params?.rideId]);

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/create.png")} style={styles.create} resizeMode="contain" />
    </View>
  );
};

export default RideCreatedScreen;
