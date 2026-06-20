import React, { useEffect, useRef } from "react";
import { Animated, View, Easing, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import PressableScale from "../../components/PressableScale";
import { haptic } from "../../components/haptics";
import styles from "./RideRequestedScreen.styles";
import { appHref } from "../../navigation/routes";
import { useUser } from "../../contexts/UserContext";
import { useTabletContentStyle } from "../../utils/responsive";
import { useThemeColors } from "../../contexts/ThemeContext";

// Confirmation interstitial shown after a ride request is submitted.
const HOLD_MS = 1100;

type RouteParams = {
  rideId?: string;
  bookingId?: string;
  hostUserId?: string;
  hostUserName?: string;
};

const RideRequestedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const { replace, navigate } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const params = useLocalSearchParams<RouteParams>();
  const colors = useThemeColors();
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

    // Request landed — confirm the submit as the "done!" pulse plays.
    haptic("success");

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
      replace(appHref("RideDetailsScreen", {
        rideId,
        expectedViewerState: "pending_passenger",
        // RideDetails should return home instead of back to the submitted form.
        backToHome: true,
      } as any));
    } else {
      replace(appHref("BookingScreen"));
    }
  };

  const openHostChat = () => {
    if (!viewerId || !hostUserId) {
      navigate(appHref("BookingScreen"));
      return;
    }
    replace(
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
    <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
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
        <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Request sent</Text>
        <Text style={[styles.ctaBody, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
          {hostFirstName} has been notified. We'll let you know the
          moment they accept.
        </Text>

        <PressableScale
          style={[styles.ctaPrimary, { backgroundColor: colors.navFill }]}
          onPress={viewRequestStatus}
        >
          <Text style={[styles.ctaPrimaryText, { color: colors.navIconInactive }]}>View request status</Text>
        </PressableScale>

        <PressableScale
          style={[styles.ctaSecondary, { borderColor: colors.textPrimary }]}
          onPress={openHostChat}
          disabled={!hostUserId}
        >
          <Text style={[styles.ctaSecondaryText, { color: colors.textPrimary }]}>
            Message {hostFirstName}
          </Text>
        </PressableScale>

        <PressableScale
          style={styles.ctaTertiary}
          onPress={() => replace(appHref("BookingScreen"))}
          haptic={null}
        >
          <Text style={[styles.ctaTertiaryText, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Back to trips</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
};

export default RideRequestedScreen;
