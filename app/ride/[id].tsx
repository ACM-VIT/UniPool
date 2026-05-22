import React, { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { appHref } from "../../navigation/routes";
import AppColors from "../../design_systems/colors";

/**
 * Deep-link landing for ride share links shaped
 * `https://unipool.acmvit.in/ride/<rideId>` (and the equivalent
 * `unipool://ride/<rideId>` custom scheme).
 *
 * ShareRideSheet emits this URL into the QR + the native share
 * sheet. expo-router matches the dynamic `[id]` segment against
 * the path, then we hand off to RideDetailsScreen with the rideId
 * the rest of the app already understands. Render a lime canvas
 * for the single frame between mount and replace so the user
 * never sees a black flash from a transparent root view.
 */
export default function RideDeepLinkRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (!id) {
      // Malformed share URL; bounce to Home instead of getting
      // stuck on an empty deep-link route.
      router.replace("/");
      return;
    }
    router.replace(appHref("RideDetailsScreen", { rideId: id } as any));
  }, [id, router]);

  return <View style={{ flex: 1, backgroundColor: AppColors.primaryLightGreen }} />;
}
