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

const { width, height } = Dimensions.get("window");
const RADAR = Math.min(width * 0.72, height * 0.36, 320);

/**
 * Minimal radar — strictly brand palette. Three concentric forest-
 * tinted reference rings, two animated pulse rings emanating from
 * the center, and a lime / forest "you are here" puck. No map
 * tiles, no buildings, no pin scatter, no specular highlights —
 * the previous version had so much decorative chrome it looked like
 * a different app. Now it's just two colours (lime + forest) and
 * motion, in harmony with everything else on the lime canvas.
 */
const RadarMap: React.FC<{ size: number }> = ({ size }) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

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
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Reference rings dropped — they read as stray hairlines on
          the lime canvas. The two animated pulse rings below carry
          the radar metaphor on their own. */}
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

      {/* "You are here" puck — lime halo with a forest core. Same
          two-layer idiom Apple Maps uses, kept tiny so the radar
          rings dominate the composition. */}
      <Animated.View
        style={{
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: 999,
          backgroundColor: AppColors.primaryLightGreen,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: breatheScale }],
          shadowColor: AppColors.secondaryDarkGreen,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View
          style={{
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: 999,
            backgroundColor: AppColors.secondaryDarkGreen,
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
