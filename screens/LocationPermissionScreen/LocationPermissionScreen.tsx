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
const RADAR = Math.min(width * 0.78, height * 0.38, 340);

/**
 * Polished map-card illustration. Replaces the old radar concept,
 * which read as an abstract loader rather than "find rides near you".
 *
 * Composition (rendered top → bottom, soft tilt for character):
 *   • Rounded card with subtle shadow + slight tilt
 *   • Map plate with stylised forest roads on a warm off-white tile
 *   • Soft block fills for buildings + a curve of "park" tone
 *   • One central "You are here" pin (lime stem + forest core,
 *     gently breathing)
 *   • Two top-down car silhouettes pinned on roads
 *   • Dashed forest route from the closer car to the You pin —
 *     reads as "this ride is heading your way"
 *
 * Strictly brand palette. RN Animated keeps the You pin breathing
 * and the route dashes shimmering so the card feels alive without
 * the visual noise of the previous radar sweep + pulses.
 */

/**
 * Top-down car silhouette used for each "ride nearby" marker. Painted
 * in forest with a lime windshield + rear window so it tracks the
 * brand palette without needing a tint. The wrapper rotates the SVG
 * to match each car's bearing relative to the centre puck.
 */
const CarPin: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Body */}
    <Path
      d="M8 3.5 L 16 3.5 L 17.2 7 L 17.2 17.2 L 16 20.5 L 8 20.5 L 6.8 17.2 L 6.8 7 Z"
      fill={AppColors.secondaryDarkGreen}
    />
    {/* Windshield */}
    <Path
      d="M8 5.5 L 16 5.5 L 16 8 L 8 8 Z"
      fill={AppColors.primaryLightGreen}
      opacity={0.85}
    />
    {/* Rear window */}
    <Path
      d="M8 19 L 16 19 L 16 16.5 L 8 16.5 Z"
      fill={AppColors.primaryLightGreen}
      opacity={0.55}
    />
    {/* Side stripe — adds a touch of detail at small sizes */}
    <Path
      d="M7.6 10 L 16.4 10 L 16.4 10.7 L 7.6 10.7 Z"
      fill={AppColors.primaryLightGreen}
      opacity={0.25}
    />
  </Svg>
);

const RadarMap: React.FC<{ size: number }> = ({ size }) => {
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.18] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.12] });

  // Card geometry — square-ish frame, rounded corners, no tilt for a
  // calm composition.
  const W = size;
  const H = size * 0.88;
  const RADIUS = 28;

  return (
    <View style={{ width: W, height: H, alignItems: "center", justifyContent: "center" }}>
      {/* Card surface — warm cream tile on the lime canvas. No tilt,
          subtle border, soft shadow. */}
      <View
        style={{
          width: W,
          height: H,
          borderRadius: RADIUS,
          overflow: "hidden",
          backgroundColor: "#F4F6EC",
          borderWidth: 1,
          borderColor: "rgba(38,59,51,0.06)",
          shadowColor: AppColors.basicBlack,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.14,
          shadowRadius: 22,
          elevation: 6,
        }}
      >
        {/* Stylised map — minimal: one sage park, two white avenues
            crossing, one quiet block. That's it. */}
        <Svg width={W} height={H} viewBox="0 0 100 88">
          {/* Soft park curve in the upper-left. */}
          <Path
            d="M -10 -10 Q 30 -10 36 18 Q 30 32 18 34 Q 4 36 -10 28 Z"
            fill="#DCE5C7"
            fillOpacity={0.7}
          />
          {/* Main avenue — diagonal NE → SW, white stroke with a
              calm forest hairline along the edge for definition. */}
          <Path
            d="M -6 22 L 110 70"
            stroke="rgba(38,59,51,0.08)"
            strokeWidth={9.4}
            strokeLinecap="round"
          />
          <Path
            d="M -6 22 L 110 70"
            stroke="#FFFFFF"
            strokeWidth={8}
            strokeLinecap="round"
          />
          {/* Cross avenue — slight curve, slightly thinner. */}
          <Path
            d="M 60 -8 Q 56 40 68 96"
            stroke="rgba(38,59,51,0.08)"
            strokeWidth={7.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 60 -8 Q 56 40 68 96"
            stroke="#FFFFFF"
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
          {/* One quiet building block — gives the composition a beat
              of weight without going city-skyline. */}
          <Path d="M 18 58 h 18 v 10 h -18 z" fill="#B8C5A4" fillOpacity={0.55} />
        </Svg>

        {/* Static dashed route — short forest dashes connecting the
            single car to the You pin. Static, not animated; the
            user wants polish, not motion overload. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: H * 0.26,
            left: W * 0.42,
            width: W * 0.24,
            height: 2,
            transform: [{ rotate: "32deg" }],
            flexDirection: "row",
            gap: 4,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 2,
                borderRadius: 1,
                backgroundColor: AppColors.secondaryDarkGreen,
                opacity: 0.55,
              }}
            />
          ))}
        </View>

        {/* One car — upper-right on the cross avenue. */}
        <View
          style={{
            position: "absolute",
            top: H * 0.16,
            right: W * 0.18,
            transform: [{ rotate: "20deg" }],
          }}
        >
          <CarPin size={W * 0.12} />
        </View>

        {/* "You are here" pin — centre. Breathing lime halo behind a
            forest pin head with a lime ring + tiny lime core. */}
        <View
          style={{
            position: "absolute",
            top: H * 0.48 - W * 0.08,
            left: W * 0.5 - W * 0.08,
            width: W * 0.16,
            height: W * 0.16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: W * 0.16,
              height: W * 0.16,
              borderRadius: 999,
              backgroundColor: AppColors.primaryLightGreen,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            }}
          />
          <View
            style={{
              width: W * 0.09,
              height: W * 0.09,
              borderRadius: 999,
              backgroundColor: AppColors.secondaryDarkGreen,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2.5,
              borderColor: AppColors.primaryLightGreen,
              shadowColor: AppColors.basicBlack,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.22,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View
              style={{
                width: W * 0.022,
                height: W * 0.022,
                borderRadius: 999,
                backgroundColor: AppColors.primaryLightGreen,
              }}
            />
          </View>
        </View>
      </View>
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
