import React, { useEffect, useRef } from "react";
import { Animated, View, Image, Easing, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import styles from "./RideRequestedScreen.styles";
import { appHref } from "../../navigation/routes";
import { useUser } from "../../contexts/UserContext";
import { useTabletContentStyle } from "../../utils/responsive";

// Confirmation interstitial. Lands with a spring scale + fade-in,
// holds briefly so the user registers the moment, then morphs into a
// stacked action card. The heart-eyes Ride Requested artwork is kept
// as the hero — it's the brand's celebration glyph for "your tap
// went through". The action card carries three CTAs in priority
// order:
//   Primary   — View request status (deep-links to the ride details
//               page, which shows the pending booking + host card +
//               everything the user needs to track the request).
//   Secondary — Message {host} (outlined pill, demoted from primary;
//               most users at this moment want to know what happens
//               next, not immediately DM a stranger).
//   Tertiary  — Back to trips (quiet text link, escape hatch).
const HOLD_MS = 1100;

type RouteParams = {
  rideId?: string;
  bookingId?: string;
  hostUserId?: string;
  hostUserName?: string;
};

const RideRequestedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const params = useLocalSearchParams<RouteParams>();
  // Viewer's UUID from the shared `UserContext`. Used to derive the
  // dm_<sortedUUIDs> DM room id for the "Message host" CTA. Sourced
  // from context so this screen doesn't re-fetch `/user/details` on
  // top of whatever the host's notification flow already triggered.
  const { user: viewer } = useUser();
  const viewerId = viewer?.id ?? null;

  // Entrance: scale + fade. Read as a confident "done!" pulse instead
  // of a slideshow image.
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Drives the CTA-card slide-up that takes over after the entrance.
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

  const rideId = (params.rideId as string) || "";
  const hostUserId = (params.hostUserId as string) || "";
  const hostUserName = (params.hostUserName as string) || "the host";
  const hostFirstName = hostUserName.trim().split(/\s+/)[0] || "the host";

  const makeDMRoomId = (a: string, b: string) => {
    const sorted = [a, b].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  };

  // Primary action — drop the user on the ride's detail page, which
  // surfaces their pending booking state with the "Waiting on host"
  // treatment. If for some reason we don't have a rideId, fall back
  // to the trips screen so the button still goes somewhere useful
  // rather than dead-ending.
  const viewRequestStatus = () => {
    if (rideId) {
      router.replace(appHref("RideDetailsScreen", {
        rideId,
        expectedViewerState: "pending_passenger",
        // The previous screen in the stack is the search-results
        // form the user submitted to request this ride. Tapping
        // back from RideDetailsScreen there would dump them on
        // that form — confusing. Setting this swaps the chevron
        // for a Home glyph that lands on HomeScreen via replace.
        backToHome: true,
      } as any));
    } else {
      router.replace(appHref("BookingScreen"));
    }
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
        userId: viewerId,
        isGroupChat: false,
        otherUserId: hostUserId,
        pendingHostInquiry: true,
        pendingRideId: rideId,
        pendingHostName: hostUserName,
      } as any),
    );
  };

  return (
    <View style={[styles.container, tabletContentStyle]}>
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
          {hostFirstName} has been notified. We'll let you know the
          moment they accept.
        </Text>

        <TouchableOpacity
          style={styles.ctaPrimary}
          activeOpacity={0.85}
          onPress={viewRequestStatus}
        >
          <Text style={styles.ctaPrimaryText}>View request status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaSecondary}
          activeOpacity={0.85}
          onPress={openHostChat}
          disabled={!hostUserId}
        >
          <Text style={styles.ctaSecondaryText}>
            Message {hostFirstName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaTertiary}
          activeOpacity={0.7}
          onPress={() => router.replace(appHref("BookingScreen"))}
        >
          <Text style={styles.ctaTertiaryText}>Back to trips</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default RideRequestedScreen;
