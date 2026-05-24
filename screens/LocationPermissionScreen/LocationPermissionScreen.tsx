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
import AppColors from "../../design_systems/colors";
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
  HAS_SEEN_PERMISSIONS_PROMPT_KEY,
  hasGrantedForegroundLocationPermission,
  markPermissionsPromptSeen,
} from "../../utils/permissionsPrompt";

// Persisted flag — once the user has seen the combined location +
// notifications permission sheet (whether they tapped Allow access or
// Not now), we don't show it unprompted again. Read by AppShell.
export { HAS_SEEN_PERMISSIONS_PROMPT_KEY };

/**
 * Permissions interstitial — fired once per install before the user
 * lands on the home map. Visual centerpiece is the canonical UniPool
 * brand illustration (the same one carrying the launch website's
 * hero), not a generic map / radar concept. The previous radar SVG
 * read as a placeholder loader and felt off-brand next to the rest of
 * the app.
 *
 * Layout (top → bottom, centred vertically on phone, capped on iPad
 * so the hero doesn't dominate the 1200pt canvas):
 *
 *   [hero brand illustration]
 *   "One quick thing"
 *   "Allow location + notifications so we can show ride pins near
 *    you and ping you when a seat opens up."
 *   [Allow access primary CTA]
 *   [Not now secondary]
 *
 * Behaviour is unchanged from the previous screen: preflight
 * check skips the sheet if location is already granted, both
 * permission prompts fire sequentially on Allow, the
 * permissions-prompt-seen flag persists either way, and the user
 * is returned to `returnTo` or HomeScreen on exit.
 */
const LocationPermissionScreen: React.FC = () => {
  const router = useRouter();
  const routeParams = useDecodedLocalSearchParams<{ returnTo?: AppRouteTarget }>();
  const returnTo = routeParams.returnTo;
  const { apiUtil } = useApi();
  const { refreshLocation } = useLocationInfo();
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  // True from the first Allow tap until the chain finishes navigating.
  // Without this the button stays tappable while the native prompts +
  // FCM round-trip are in flight, and users spam-tap thinking
  // nothing happened — each tap then queues another handleAllow()
  // and the screen feels broken.
  const [busy, setBusy] = useState(false);

  // Live window dims so the hero sizes correctly on rotation + iPad
  // multitasking. Static `Dimensions.get` once at module load froze
  // the value and ignored split-view sizing on tablets.
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  // Hero is the visual anchor. On phones we want it generous (78% of
  // width clamped to ~360pt so a 16 Pro Max doesn't get a 460pt
  // illustration); on iPad we cap harder so the composition reads as
  // one tight card rather than a wallpaper. The 0.42 of height keeps
  // the hero from stealing space from the CTA block on short screens.
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
      router.replace(targetHref(returnTo));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  }, [returnTo, router]);

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

  const goHome = markSeenAndLeave;

  const handleAllow = async () => {
    // Re-entrancy guard. Without this, tapping the button a second
    // time while the chain below is still in flight kicks off a
    // parallel chain — each one shows the native prompt again
    // (already granted, no-ops fast) and races into navigation.
    // The user perceives this as "I have to spam the button" because
    // there's no visual signal the first tap did anything.
    if (busy) return;
    setBusy(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (e) {
      console.warn("Location prompt failed", e);
    }
    // Fire-and-forget refresh so the LocationProvider picks up the
    // freshly-granted permission before BrandInfo paints on
    // HomeScreen. Without this, the provider's mount-time read
    // (which happened BEFORE this screen) would have cached
    // "Permission not granted" and BrandInfo would stay stuck on
    // "Tap to enable location" until the next background → foreground
    // cycle.
    void refreshLocation().catch((e) =>
      console.warn("refreshLocation after grant failed", e),
    );

    // Notification setup is split in two so navigation isn't held
    // hostage by the FCM token fetch + backend POST that
    // ensurePushNotificationsRegistered does after the prompt:
    //
    //   1. AWAIT the native prompt + Android channel setup. This
    //      MUST finish before we navigate — otherwise the OS
    //      notification-permission sheet pops up on top of the
    //      HomeScreen, which reads as a glitch.
    //
    //   2. FIRE-AND-FORGET the token retrieval + /users/me/token
    //      POST. These can take 2-5s on a slow network with zero
    //      visible progress, which is exactly what made users
    //      spam-tap the button. The token still gets registered;
    //      it just happens after navigation.
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
    // No setBusy(false) — we've navigated away. If the navigation
    // somehow fails, leaving busy=true is a better failure mode
    // than re-enabling the button into a half-broken state.
  };

  if (checkingPermissions) {
    return (
      <View style={styles.root}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={AppColors.primaryLightGreen}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={AppColors.primaryLightGreen}
      />

      <View style={styles.center}>
        <View style={styles.heroWrap}>
          {/* The brand illustration sits inside a soft cream tile —
              same pattern as the website's hero split. Gives the
              ink-on-lime art a calmer surround than dropping it
              straight onto the lime canvas, where the lime blob in
              the artwork would fight the background. */}
          <View
            style={[
              styles.heroPlate,
              { width: heroWidth + 32, height: heroHeight + 32 },
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
          <Text style={styles.headline}>One quick thing.</Text>
          <Text style={styles.subhead}>
            Allow location and notifications so we can show ride pins
            near you and ping you the moment a seat opens up.
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
            activeOpacity={0.88}
            onPress={handleAllow}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Allow location and notification access"
            accessibilityState={{ busy, disabled: busy }}
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color={AppColors.primaryLightGreen}
                accessibilityLabel="Requesting permissions"
              />
            ) : (
              <Text style={styles.primaryBtnText}>Allow access</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, busy && { opacity: 0.4 }]}
            activeOpacity={0.7}
            onPress={goHome}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Skip permissions for now"
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={styles.secondaryBtnText}>Not now</Text>
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
