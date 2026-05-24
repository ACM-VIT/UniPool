import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";
import { haptic } from "./PressableScale";
import { displayRideLocation } from "../utils/LocationService";

type PreviewRide = {
  start_location: string;
  end_location: string;
  start_time?: string;
  total_price?: number;
  host_user_name?: string;
};

type Props = {
  ride: PreviewRide;
  onDismiss: () => void;
  onOpen: () => void;
};

/**
 * Compact bottom sheet that surfaces when the user taps a ride pin
 * on the home map. Shows just enough info to decide whether to open
 * the ride (destination, when, fare) plus a single primary CTA.
 *
 * Earlier versions ran dense — three meta cells, a dismiss X, a host
 * row, a thick lime CTA pill — and ate ~40% of the map. This rewrite
 * trims to the load-bearing elements only: a drag indicator, the
 * route block, a single-line meta row, and the View ride button.
 * Backdrop tap still dismisses; the drag-indicator visually invites
 * the same gesture without a literal swipe handler (kept simple
 * because the backdrop already covers the gesture surface).
 *
 * Visual idiom matches the existing ride card surfaces (forest
 * plate, lime accent typography, large radius) so the sheet reads as
 * a familiar UniPool surface rather than an out-of-place modal.
 */
const RoutePreviewCard: React.FC<Props> = ({ ride, onDismiss, onOpen }) => {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 280,
      // Slight overshoot so the sheet arrives instead of ramping in
      // linearly — same easing the booking sheet + payment sheet
      // already use elsewhere in the app.
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const handleDismiss = () => {
    haptic("light");
    Animated.timing(slide, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  };

  const handleOpen = () => {
    haptic("medium");
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onOpen();
    });
  };

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  const opacity = slide;
  // Backdrop is intentionally subtle — the map below stays legible,
  // and the focus is the sheet itself, not a heavy modal scrim.
  const backdrop = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.16],
  });

  // Comma-stripped, ellipsized labels — full-length place names
  // ("Bangalore Kempegowda International Airport") would wrap the
  // route block and push the sheet height up.
  const shortStart = useMemo(() => shorten(ride.start_location), [ride.start_location]);
  const shortEnd = useMemo(() => shorten(ride.end_location), [ride.end_location]);

  // "Thu, 4 Jun · 17:00" — short weekday + date + 24h time, all in
  // one row. Suppressed entirely if there's no parseable start time
  // so cluster summaries with partial data still render clean.
  const timeLabel = useMemo(() => {
    if (!ride.start_time) return "";
    const d = new Date(ride.start_time);
    if (isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} · ${hh}:${mm}`;
  }, [ride.start_time]);

  // Card sits just above the main nav bar. 96pt on iOS / 86pt on
  // Android matches the nav bar's top edge across phones; iPad
  // floats the nav at the same offset so this works there too.
  const bottomOffset = insets.bottom + (Platform.OS === "ios" ? 96 : 86);

  return (
    <>
      <Animated.View
        pointerEvents="auto"
        style={[styles.backdrop, { opacity: backdrop }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss ride preview"
        />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          {
            bottom: bottomOffset,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.card}>
          {/* Drag indicator — implies dismiss-by-swipe even though
              the actual dismiss path is the backdrop tap. Apple's
              standard sheet idiom; the visual cue alone is enough. */}
          <View style={styles.handle} />

          {/* Route block. Filled dot for pickup, ring dot for drop,
              short connector between. Single-glyph pin language
              shared with every other ride card surface in the app. */}
          <View style={styles.route}>
            <View style={styles.pinCol}>
              <View style={styles.pinFilled} />
              <View style={styles.pinConnector} />
              <View style={styles.pinOutline} />
            </View>
            <View style={styles.routeText}>
              <Text style={styles.startLabel} numberOfLines={1}>
                {shortStart}
              </Text>
              <Text style={styles.endLabel} numberOfLines={1}>
                {shortEnd}
              </Text>
            </View>
          </View>

          {/* Meta row — date+time on the left, price on the right.
              Hairline above so the row reads as a separate band of
              info from the route block, but the divider is thin
              enough to keep the sheet feeling unified. Suppresses
              entirely if neither value is set. */}
          {(timeLabel || ride.total_price != null) ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLeft} numberOfLines={1}>
                {timeLabel || ""}
              </Text>
              {ride.total_price != null ? (
                <Text style={styles.metaRight}>₹{ride.total_price}</Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={handleOpen}
            style={({ pressed }) => [
              styles.cta,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`View ride to ${shortEnd}`}
          >
            <Text style={styles.ctaText}>View ride</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
};

const shorten = (s: string): string => {
  const safe = displayRideLocation(s);
  const first = (safe.split(",")[0] || "").trim();
  return first.length > 28 ? first.slice(0, 27).trimEnd() + "…" : first;
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: AppColors.secondaryDarkGreen,
    zIndex: 11,
  },
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignSelf: "center",
    maxWidth: 420,
    width: undefined,
    zIndex: 12,
  },
  card: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
  },

  // ---------------------------------------------------------------
  // Drag indicator
  // ---------------------------------------------------------------
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.32,
    marginBottom: 12,
  },

  // ---------------------------------------------------------------
  // Route block
  // ---------------------------------------------------------------
  route: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    paddingHorizontal: 2,
  },
  pinCol: {
    width: 12,
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  pinFilled: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  pinConnector: {
    flex: 1,
    width: 2,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.35,
    marginVertical: 2,
    borderRadius: 1,
  },
  pinOutline: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    backgroundColor: "transparent",
  },
  routeText: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 1,
    gap: 8,
  },
  startLabel: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13.5,
    letterSpacing: -0.1,
    opacity: 0.7,
  },
  endLabel: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    letterSpacing: -0.3,
  },

  // ---------------------------------------------------------------
  // Meta row (time + price)
  // ---------------------------------------------------------------
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(181,215,80,0.16)",
  },
  metaLeft: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13.5,
    letterSpacing: -0.1,
    opacity: 0.85,
    flexShrink: 1,
  },
  metaRight: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    letterSpacing: -0.2,
    marginLeft: 12,
  },

  // ---------------------------------------------------------------
  // CTA
  // ---------------------------------------------------------------
  cta: {
    marginTop: 14,
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    letterSpacing: 0.2,
  },
});

export default RoutePreviewCard;
