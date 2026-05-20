import React, { useEffect, useRef, useState } from "react";
import { Animated, View, Image, Easing, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import styles from "./RideRequestedScreen.styles";
import { appHref } from "../../navigation/routes";
import { useApi } from "../../utils/ApiUtil";

// Confirmation interstitial. Lands with a spring scale + fade-in,
// holds briefly so the user registers the moment, then morphs into a
// "Message host" handoff card so the user doesn't have to hunt for
// the pending chat in the trips tab — the moment they tap "Request",
// chatting with the host is one tap away from where they are.
const HOLD_MS = 1300;

type RouteParams = {
  rideId?: string;
  bookingId?: string;
  hostUserId?: string;
  hostUserName?: string;
};

const RideRequestedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const { apiUtil } = useApi();
  const [viewerId, setViewerId] = useState<string | null>(null);

  // Entrance: scale + fade. Read as a confident "done!" pulse instead
  // of a slideshow image.
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Drives the CTA-card slide-up that takes over after the celebration.
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (props.setNavBarVariant) props.setNavBarVariant(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 90,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslate, {
          toValue: 0,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant]);

  // Need the viewer's UUID to derive the dm_<sortedUUIDs> DM room id.
  useEffect(() => {
    apiUtil
      .get<{ user: { id: string } }>("/user/details")
      .then((r) => setViewerId(r.user.id))
      .catch(() => {});
  }, [apiUtil]);

  const hostUserId = (params.hostUserId as string) || "";
  const hostUserName = (params.hostUserName as string) || "the host";
  const hostFirstName = hostUserName.trim().split(/\s+/)[0] || "the host";

  const makeDMRoomId = (a: string, b: string) => {
    const sorted = [a, b].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  };

  const openHostChat = () => {
    if (!viewerId || !hostUserId) {
      router.navigate(appHref("BookingScreen"));
      return;
    }
    router.replace(
      appHref("ChatMessages", {
        chatId: makeDMRoomId(viewerId, hostUserId),
        chatTitle: hostUserName,
        chatSubtitle: "Pending request",
        isGroupChat: false,
        otherUserId: hostUserId,
        pendingHostInquiry: true,
        pendingRideId: params.rideId,
        pendingHostName: hostUserName,
      } as any),
    );
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/request.png")}
        style={[styles.create, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />

      <Animated.View
        style={[
          styles.ctaCard,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslate }],
          },
        ]}
      >
        <Text style={styles.ctaTitle}>Request sent</Text>
        <Text style={styles.ctaBody}>
          {hostFirstName} hasn't decided yet, send a quick hello and tell them
          your pickup point.
        </Text>
        <TouchableOpacity
          style={styles.ctaPrimary}
          activeOpacity={0.85}
          onPress={openHostChat}
          disabled={!hostUserId}
        >
          <Text style={styles.ctaPrimaryText}>
            Message {hostFirstName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSecondary}
          activeOpacity={0.7}
          onPress={() => router.navigate(appHref("BookingScreen"))}
        >
          <Text style={styles.ctaSecondaryText}>Back to trips</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default RideRequestedScreen;
