import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import styles from "./LocationPermissionScreen.styles";
import { useThemeColors } from "../../contexts/ThemeContext";
import { useApi } from "../../utils/ApiUtil";
import { ensurePushNotificationsRegistered } from "../../utils/pushNotifications";
import {
  appHref,
  targetHref,
  useDecodedLocalSearchParams,
} from "../../navigation/routes";
import type { AppRouteTarget } from "../../navigation/routes";
import { useLocationInfo } from "../../contexts/location-context";
import {
  hasGrantedForegroundLocationPermission,
  markPermissionsPromptSeen,
} from "../../utils/permissionsPrompt";

/**
 * Permissions interstitial shown once per install before the user lands on
 * the home map. It asks for foreground location first, then notification
 * permission, and returns to `returnTo` or HomeScreen.
 *
 * If foreground location has already been granted, the screen records the
 * prompt as seen and exits without showing the CTA.
 */
const LocationPermissionScreen: React.FC = () => {
  const { replace } = useRouter();
  const routeParams = useDecodedLocalSearchParams<{ returnTo?: AppRouteTarget }>();
  const returnTo = routeParams.returnTo;
  const { apiUtil } = useApi();
  const { refreshLocation } = useLocationInfo();
  const colors = useThemeColors();
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  // Re-entrancy guard while native prompts and navigation are in flight.
  const [busy, setBusy] = useState(false);

  // Live dimensions keep the hero correctly sized during rotation and iPad split view.
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  // Cap the illustration so short screens still have room for copy and CTA.
  const heroWidth = isTablet
    ? Math.min(440, width * 0.55)
    : Math.min(360, width * 0.78, height * 0.42);
  const heroHeight = heroWidth * (468 / 742); // preserve SVG aspect

  const markSeenAndLeave = useCallback(async () => {
    try {
      await markPermissionsPromptSeen();
    } catch (e) {
      console.warn("Failed to persist permissions-prompt-seen flag", e);
    }
    if (returnTo) {
      replace(targetHref(returnTo));
    } else {
      replace(appHref("HomeScreen"));
    }
  }, [returnTo, replace]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await hasGrantedForegroundLocationPermission()) {
          if (!cancelled) await markSeenAndLeave();
          return;
        }
      } catch (e) {
        console.warn("Permission preflight failed; showing permission screen", e);
      }
      if (!cancelled) setCheckingPermissions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [markSeenAndLeave]);

  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.warn("Location prompt failed", e);
    }
    // Refresh location state after the native prompt so HomeScreen sees the
    // latest permission state immediately after navigation.
    void refreshLocation().catch((e) =>
      console.warn("refreshLocation after grant failed", e),
    );

    // Await the native notification prompt, then register the FCM token in the
    // background so slow networks do not block navigation.
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    } catch (e) {
      console.warn("Notification prompt failed", e);
    }
    void ensurePushNotificationsRegistered(apiUtil as any).catch((e) =>
      console.warn("Background push registration failed", e),
    );

    await markSeenAndLeave();
    // Do not reset busy after navigation; this screen should not be reused in place.
  };

  if (checkingPermissions) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={colors.statusBarStyle}
          backgroundColor={colors.statusBarBackground}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.statusBarBackground}
      />

      <View style={styles.center}>
        <View style={styles.heroWrap}>
          <View
            style={[
              styles.heroPlate,
              { width: heroWidth + 32, height: heroHeight + 32 },
              colors.mode === "dark" && { backgroundColor: colors.surface },
            ]}
          >
            <Image
              source={require("../../assets/unipool-hero.png")}
              style={{ width: heroWidth, height: heroHeight }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>One quick thing.</Text>
          <Text style={[styles.subhead, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
            Location helps us show ride pins near you. Notifications let
            us tell you when a seat opens up. You can choose what to
            share in the next system prompts.
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.navFill }, busy && { opacity: 0.7 }]}
            activeOpacity={0.88}
            onPress={handleContinue}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue to location and notification permissions"
            accessibilityState={{ busy, disabled: busy }}
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color={colors.navIconInactive}
                accessibilityLabel="Requesting permissions"
              />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.navIconInactive }]}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Platform parity guardrail — keeps Android's status-bar gap
          from collapsing on devices that report 0pt top inset (very
          old Android skins). iOS already uses SafeAreaView semantics
          everywhere else, no harm to add here. */}
      {Platform.OS === "android" ? <View style={styles.androidPad} /> : null}
    </View>
  );
};

export default LocationPermissionScreen;
