import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Dimensions, StatusBar } from "react-native";
import * as Location from "expo-location";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import styles from "./LocationPermissionScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import { ensurePushNotificationsRegistered } from "../../utils/pushNotifications";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import type { AppRouteTarget } from "../../navigation/routes";
import { useLocationInfo } from "../../contexts/location-context";

const { width, height } = Dimensions.get("window");
const RADAR = Math.min(width * 0.72, height * 0.36, 320);

/**
 * Polished radar illustration. Strictly brand palette:
 *   - Three faded forest reference rings (static) — anchor the
 *     composition so the screen never reads as "one tiny dot on a
 *     sea of lime" between pulse cycles.
 *   - Two animated sonar pulses staggered 1.1s apart — adds life.
 *   - A "You are here" puck (lime halo, forest core) breathing
 *     gently in the center, with a small lime heading triangle
 *     pointing north so it reads as a positioned marker, not an
 *     abstract dot.
 *   - Three "rides nearby" pins parked on the rings, each pulsing
 *     in/out on its own phase. These were the missing ingredient
 *     that took the radar from "loading spinner" to "illustration".
 */
const RING_RADII = [0.34, 0.56, 0.82] as const;

// Nearby ride pin positions, expressed as (angle in degrees, ring
// index). Spread around different bearings + different distances so
// they don't all bunch up on one axis. Angles chosen empirically to
// read as a balanced triangle in the upper hemisphere with one pin
// trailing behind the puck — felt the most "real map"-like.
const NEARBY_PINS: { angle: number; ring: number; delay: number }[] = [
  { angle: -65, ring: 1, delay: 0 },
  { angle: 35, ring: 2, delay: 450 },
  { angle: 155, ring: 1, delay: 900 },
];

const RadarMap: React.FC<{ size: number }> = ({ size }) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const pinPulses = useRef(NEARBY_PINS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.stagger(1100, [
        Animated.timing(pulse1, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Each nearby-ride pin breathes on its own loop, staggered so the
    // three never blink together — reads as ambient activity.
    pinPulses.forEach((pulse, idx) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(NEARBY_PINS[idx].delay),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  const ring1Size = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [size * 0.22, size * 0.92],
  });
  const ring1Op = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const ring2Size = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [size * 0.22, size * 0.92],
  });
  const ring2Op = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Static reference rings — three concentric forest hairlines at
          ~17%, 28% and 41% of the size. Visible even between pulse
          cycles so the screen never collapses to "one dot on lime". */}
      {RING_RADII.map((r, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            width: size * r,
            height: size * r,
            borderRadius: 999,
            borderWidth: 1.2,
            borderColor: AppColors.secondaryDarkGreen,
            opacity: 0.12 + (RING_RADII.length - i) * 0.04,
          }}
        />
      ))}

      {/* Animated sonar pulses — same outward-and-fade idea but now
          composed against the static rings above. */}
      <Animated.View
        style={{
          position: "absolute",
          width: ring1Size,
          height: ring1Size,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: AppColors.secondaryDarkGreen,
          opacity: ring1Op,
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: ring2Size,
          height: ring2Size,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: AppColors.secondaryDarkGreen,
          opacity: ring2Op,
        }}
      />

      {/* Nearby-ride pins — each parked on a ring at its angle. Small
          forest dots with a lime halo. They pulse subtly so the radar
          feels alive even when no sonar wave is travelling outward. */}
      {NEARBY_PINS.map((pin, idx) => {
        const radius = (size * RING_RADII[pin.ring]) / 2;
        const rad = (pin.angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const pulse = pinPulses[idx];
        const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] });
        const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
        const pinSize = size * 0.07;
        return (
          <Animated.View
            key={idx}
            style={{
              position: "absolute",
              width: pinSize,
              height: pinSize,
              borderRadius: 999,
              backgroundColor: AppColors.secondaryDarkGreen,
              borderWidth: 2,
              borderColor: AppColors.primaryLightGreen,
              transform: [{ translateX: x }, { translateY: y }, { scale }],
              opacity,
            }}
          />
        );
      })}

      {/* "You are here" puck — lime halo, forest core, with a small
          heading triangle pointing up. The triangle sells the metaphor
          of "you on a map" rather than a generic dot. */}
      <Animated.View
        style={{
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: 999,
          backgroundColor: AppColors.primaryLightGreen,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: breatheScale }],
          shadowColor: AppColors.secondaryDarkGreen,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.28,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <View
          style={{
            width: size * 0.1,
            height: size * 0.1,
            borderRadius: 999,
            backgroundColor: AppColors.secondaryDarkGreen,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Forest core's inner highlight — a tiny lime dot at the
              center makes the puck read as a real marker with depth
              instead of a flat circle. */}
          <View
            style={{
              width: size * 0.025,
              height: size * 0.025,
              borderRadius: 999,
              backgroundColor: AppColors.primaryLightGreen,
              opacity: 0.95,
            }}
          />
        </View>
        {/* Heading triangle above the puck — tiny lime tick that
            implies orientation, same trick Google Maps and Apple Maps
            use on their location pucks. */}
        <View
          style={{
            position: "absolute",
            top: -size * 0.045,
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.025,
            borderRightWidth: size * 0.025,
            borderBottomWidth: size * 0.045,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: AppColors.primaryLightGreen,
          }}
        />
      </Animated.View>
    </View>
  );
};

// Persisted flag — once the user has seen the combined location +
// notifications permission sheet (whether they tapped Allow access or
// Not now), we don't show it unprompted again. Read by AppShell.
export const HAS_SEEN_PERMISSIONS_PROMPT_KEY = "hasSeenPermissionsPrompt";

/**
 * Inline icon glyph next to a feature row. Pure forest stroke / fill,
 * no pill background. The previous "lime circle with forest icon"
 * pills felt blocky next to the airy radar; a bare glyph reads as
 * part of the typography instead of a UI chip.
 */
const FeatureGlyph: React.FC<{ kind: "location" | "bell" }> = ({ kind }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {kind === "location" ? (
      <>
        <Path
          d="M12 2 C 7.6 2, 4 5.6, 4 10 C 4 16, 12 22, 12 22 C 12 22, 20 16, 20 10 C 20 5.6, 16.4 2, 12 2 Z"
          fill={AppColors.secondaryDarkGreen}
        />
        <Circle cx="12" cy="10" r="3" fill={AppColors.primaryLightGreen} />
      </>
    ) : (
      <>
        <Path
          d="M12 3 C 9 3, 7 5, 7 8 V 12 L 5 15 H 19 L 17 12 V 8 C 17 5, 15 3, 12 3 Z"
          fill={AppColors.secondaryDarkGreen}
        />
        <Path
          d="M10 17 C 10 18.5, 11 19.5, 12 19.5 C 13 19.5, 14 18.5, 14 17 Z"
          fill={AppColors.secondaryDarkGreen}
        />
      </>
    )}
  </Svg>
);

const LocationPermissionScreen: React.FC = () => {
  const router = useRouter();
  const routeParams = useDecodedLocalSearchParams<{ returnTo?: AppRouteTarget }>();
  const returnTo = routeParams.returnTo;
  const { apiUtil } = useApi();
  const { refreshLocation } = useLocationInfo();

  const markSeenAndLeave = async () => {
    try {
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.setItem(HAS_SEEN_PERMISSIONS_PROMPT_KEY, "true");
    } catch (e) {
      console.warn("Failed to persist permissions-prompt-seen flag", e);
    }
    if (returnTo) {
      router.replace(targetHref(returnTo));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const goHome = markSeenAndLeave;

  const handleAllow = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.warn("Location prompt failed", e);
    }
    // Fire-and-forget refresh so the LocationProvider picks up the
    // freshly-granted permission before BrandInfo paints on HomeScreen.
    // Without this, the provider's mount-time read (which happened
    // BEFORE this screen) would have cached "Permission not granted"
    // and BrandInfo would stay stuck on "Tap to enable location"
    // until the next time the app backgrounded + foregrounded.
    void refreshLocation().catch((e) =>
      console.warn("refreshLocation after grant failed", e),
    );
    try {
      await ensurePushNotificationsRegistered(apiUtil as any);
    } catch (e) {
      console.warn("Notification prompt failed", e);
    }
    await markSeenAndLeave();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLightGreen} />

      <View style={styles.heroBlock}>
        <RadarMap size={RADAR} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.headline}>Make UniPool work for you.</Text>
        <Text style={styles.subhead}>
          A couple of permissions and we can match you with the right rides at the right time.
        </Text>

        <View style={styles.featureRows}>
          <View style={styles.featureRow}>
            <FeatureGlyph kind="location" />
            <Text style={styles.featureText}>
              Carpools heading your way on the map
            </Text>
          </View>
          <View style={styles.featureRow}>
            <FeatureGlyph kind="bell" />
            <Text style={styles.featureText}>
              A ping the moment your seat is confirmed
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ctaBlock}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleAllow}>
          <Text style={styles.primaryBtnText}>Allow access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={goHome}>
          <Text style={styles.secondaryBtnText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LocationPermissionScreen;
