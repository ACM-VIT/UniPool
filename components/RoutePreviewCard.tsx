import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
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
 * Floating peek card that surfaces while the route-preview dotted
 * line is animating across the map. Slides up from above the bottom
 * nav, snaps in with a soft ease-out, and exits in reverse on
 * dismiss. Carries the minimum info needed to commit ("yes, this is
 * the ride I want to open") — destination, departure time, price,
 * host first name — and a single primary CTA. The dotted line on the
 * map does the heavy lifting; the card is just the action surface.
 *
 * Visual language matches the existing ride cards (forest plate,
 * lime accent text, rounded corners, modest drop shadow) so the
 * peek feels like a familiar surface rather than a new component.
 */
const RoutePreviewCard: React.FC<Props> = ({ ride, onDismiss, onOpen }) => {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 320,
      // Slight overshoot via Easing.out(back) gives the card a sense
      // of arriving rather than ramping in linearly. Subtle — back
      // factor 1.4 keeps it from looking bouncy/cartoonish.
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const handleDismiss = () => {
    haptic("light");
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
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
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onOpen();
    });
  };

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });
  const opacity = slide;

  // Short comma-stripped labels for both endpoints. Long names
  // ("Bangalore Kempegowda International Airport") would push the
  // card off the screen; the truncation matches the ride-pin labels
  // so the visual rhythm is consistent.
  const shortEnd = useMemo(() => shortenLoc(ride.end_location), [ride.end_location]);
  const shortStart = useMemo(() => shortenLoc(ride.start_location), [ride.start_location]);

  const timeLabel = useMemo(() => {
    if (!ride.start_time) return "";
    const d = new Date(ride.start_time);
    if (isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} · ${hh}:${mm}`;
  }, [ride.start_time]);

  const hostFirstName = useMemo(() => {
    if (!ride.host_user_name) return "";
    return (ride.host_user_name.split(/\s+/)[0] || "").trim();
  }, [ride.host_user_name]);

  // Card sits above the main nav bar's top edge. On phones the nav
  // pill lives roughly 84pt above the bottom safe-area inset; this
  // card stacks ~12pt above that. On iPad the nav floats lower so
  // the same offset works.
  const bottomOffset =
    insets.bottom + (Platform.OS === "ios" ? 96 : 86);

  // Backdrop dim — a near-transparent forest wash over the map while
  // the preview is active. Pulls the eye to the dotted line + the
  // card without actually hiding any pins (the wash is light enough
  // that ride pins underneath remain legible). Tap on the wash
  // dismisses the preview, which is the canonical "close" gesture
  // on Maps + Apple Pay sheets.
  const backdrop = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  return (
    <>
      <Animated.View
        pointerEvents={slide ? "auto" : "none"}
        style={[
          styles.backdrop,
          { opacity: backdrop },
        ]}
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
      <Pressable
        onPress={handleOpen}
        android_ripple={undefined}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.92 },
        ]}
      >
        {/* Route row — dotted forest connector between start and end
            mirrors the on-map dotted line so the card and the map
            read as one composition. */}
        <View style={styles.routeRow}>
          <View style={styles.routeStack}>
            <View style={styles.dotFilled} />
            <View style={styles.routeConnector}>
              <View style={styles.routeDash} />
              <View style={styles.routeDash} />
              <View style={styles.routeDash} />
            </View>
            <View style={styles.dotOutline} />
          </View>
          <View style={styles.routeText}>
            <Text style={styles.endpointLabel} numberOfLines={1}>
              {shortStart}
            </Text>
            <View style={{ height: 6 }} />
            <Text style={[styles.endpointLabel, styles.endpointDest]} numberOfLines={1}>
              {shortEnd}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close ride preview"
          >
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path
                d="M2 2 L 10 10 M 10 2 L 2 10"
                stroke={AppColors.primaryLightGreen}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Meta row — host + time + price. Each cell renders only if
            its value exists so the card stays compact on partial
            data (cluster summaries can omit time/price). */}
        {(hostFirstName || timeLabel || ride.total_price != null) && (
          <View style={styles.metaRow}>
            {hostFirstName ? (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Host</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {hostFirstName}
                </Text>
              </View>
            ) : null}
            {timeLabel ? (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Departs</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {timeLabel}
                </Text>
              </View>
            ) : null}
            {ride.total_price != null ? (
              <View style={[styles.metaCell, styles.metaCellRight]}>
                <Text style={styles.metaLabel}>Per seat</Text>
                <Text style={[styles.metaValue, styles.metaPrice]}>
                  ₹{ride.total_price}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>View ride</Text>
          <Text style={styles.ctaArrow}>›</Text>
        </View>
      </Pressable>
      </Animated.View>
    </>
  );
};

// "Bangalore, KA" → "Bangalore", "VIT Vellore Main Gate" left as-is
// up to ~26 chars then ellipsis. Symmetric to the pin label
// shortening on the map so card + pin read with the same rhythm.
// Routes through displayRideLocation first so legacy rides stored
// with the literal "Current location" string (created before the
// picker reverse-geocoded GPS picks) get the neutral fallback
// instead of leaking that UX shorthand onto a card.
const shortenLoc = (s: string): string => {
  const safe = displayRideLocation(s);
  const first = (safe.split(",")[0] || "").trim();
  return first.length > 26 ? first.slice(0, 25).trimEnd() + "…" : first;
};

const styles = StyleSheet.create({
  // Soft forest wash over the map while the preview is active.
  // Cap opacity at 0.18 so ride pins underneath remain legible.
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.secondaryDarkGreen,
    zIndex: 11,
  },
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    // Cap the card width on iPad so it doesn't span the full canvas.
    // alignSelf: "center" + maxWidth keeps the card centred and
    // narrow on tablets while filling the available width on phones.
    alignSelf: "center",
    maxWidth: 420,
    width: undefined,
    zIndex: 12,
  },
  card: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  // Vertical pin + dotted connector + outline pin, mirrors the
  // dotted line on the map.
  routeStack: {
    width: 16,
    alignItems: "center",
    paddingVertical: 2,
  },
  dotFilled: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  dotOutline: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    backgroundColor: "transparent",
  },
  routeConnector: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  routeDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.7,
  },
  routeText: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  endpointLabel: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
    opacity: 0.85,
  },
  endpointDest: {
    fontFamily: "NunitoSans_800ExtraBold",
    opacity: 1,
    fontSize: 15,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(181,215,80,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  // (Dismiss glyph is now a vector cross; the old text glyph style
  // was removed because typeface-rendered × characters land at
  // different baselines per platform and looked tilted on iOS.)

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(181,215,80,0.18)",
    gap: 18,
  },
  metaCell: {
    flexDirection: "column",
  },
  metaCellRight: {
    marginLeft: "auto",
  },
  metaLabel: {
    color: AppColors.primaryLightGreen,
    opacity: 0.55,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaValue: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    letterSpacing: -0.1,
    marginTop: 2,
  },
  metaPrice: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14,
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: AppColors.primaryLightGreen,
    gap: 2,
  },
  ctaText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  ctaArrow: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 19,
    lineHeight: 19,
    marginLeft: 4,
    marginTop: -1,
  },
});

export default RoutePreviewCard;
