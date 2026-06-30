import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, Platform, Share, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import appJson from "../../app.json";
import { ProfileScreenProps } from "./ProfileScreen.types";
import styles from "./ProfileScreen.styles";
import AppColors from "../../design_systems/colors";
import LoadingComponent from "../../components/LoadingComponent";
import { useApi } from "../../utils/ApiUtil";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../../utils/responsive";
import bottomNavItems from "../../data/BottomNavigationItems";
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import BrandedAlert from "../../components/BrandedAlert";
import { appHref } from "../../navigation/routes";
import { useUser } from "../../contexts/UserContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { ThemePreference } from "../../design_systems/palettes";
import {
  isAuthenticationRedirectError,
  isSignupRequiredError,
  rollbackFirebaseSession,
} from "../../utils/authFlow";

const DEBUG_PROFILE =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_PROFILE === "1";

const debugLog = (...args: any[]) => {
  if (DEBUG_PROFILE) console.log(...args);
};

type RuntimeVersionConfig = string | { policy?: string } | undefined;

type AppVersionConfig = {
  version?: string;
  runtimeVersion?: RuntimeVersionConfig;
  ios?: { buildNumber?: string };
  android?: { versionCode?: number | string };
};

const bundledExpoConfig = appJson.expo as AppVersionConfig;

const infoValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const firstInfoValue = (...values: unknown[]) => {
  for (const value of values) {
    const text = infoValue(value);
    if (text) return text;
  }
  return undefined;
};

const runtimeVersionFromConfig = (
  runtimeVersion: RuntimeVersionConfig,
  appVersion?: string,
) => {
  if (typeof runtimeVersion === "string") {
    return runtimeVersion;
  }
  if (runtimeVersion?.policy === "appVersion") {
    return appVersion;
  }
  return undefined;
};

interface UserData {
  id: string;
  name: string;
  email: string;
  contact_number: string;
  gender: string;
  yob: number;
  created_at: string;
  updated_at: string;
  profile_picture_url?: string;
  total_bookings?: number;
  total_hosted_rides?: number;
  completed_trips?: number;
  distance_travelled?: number;
  weight_saved?: number;
}

interface ApiResponse {
  user: UserData;
}

interface MenuItem {
  id: string;
  title: string;
  icon?: any;
  hasCheckmark?: boolean;
  onPress?: () => void;
}

/**
 * Inline segmented control for the appearance toggle (System / Light /
 * Dark). Reads + writes the theme preference from ThemeContext. Pill-
 * shaped track with a sliding indicator behind the active segment;
 * mirrors the iOS Settings "Appearance" picker so the affordance is
 * familiar without us having to teach a new pattern.
 */
const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const AppearanceSegmented: React.FC = () => {
  const { preference, setPreference, colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceInset,
        borderRadius: 999,
        padding: 4,
        marginHorizontal: 16,
        marginTop: 4,
      }}
    >
      {APPEARANCE_OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => setPreference(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Appearance: ${opt.label}`}
          >
            <Text
              style={{
                fontFamily: "NunitoSans_700Bold",
                fontSize: 13,
                letterSpacing: 0.2,
                color: active ? colors.textOnAccent : colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  // Theme-aware overrides. Module-scope styles bake the lime canvas
  // + forest ink at load time; the inline `[styles.X, { color }]`
  // overrides below let the canvas + text adapt to whichever
  // palette is active without rewriting every style block.
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const { replace, navigate } = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiUtil } = useApi();
  // iPad-only: phone-shape centred column so the stat cards and
  // account/help/about sections sit in a readable width instead of
  // stretching the full 1032pt canvas. Hook returns null on phones.
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const screenActiveRef = useRef(true);
  const hasFocusedOnceRef = useRef(false);
  // True from just before the native share sheet opens until a short
  // beat after it closes. The OS (iOS UIActivityViewController and the
  // Android chooser alike) delivers the dismissal tap to whatever view
  // sits under the finger, which lands on a Profile menu row and fires
  // its navigation. renderMenuItem's onPress checks this to swallow
  // that stray "ghost tap".
  const shareGuardRef = useRef(false);
  const { user: contextUser, loading: contextUserLoading } = useUser();

  const showProfileError = useCallback((message: string) => {
    if (screenActiveRef.current) {
      BrandedAlert.alert('Error', message);
    }
  }, []);

  const profileScreenNavItems = bottomNavItems.map((item, index) => ({
    ...item,
    isActive: index === 3,
  }));

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      const auth = require('@react-native-firebase/auth').getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        debugLog("No authenticated user found in ProfileScreen");
        setError("Please sign in to view your profile");
        setLoading(false);
        return;
      }

      if (contextUser && contextUser.completed_trips !== undefined) {
        setUserData(contextUser as unknown as UserData);
        return;
      }

      debugLog("User authenticated, fetching profile data...");
      const response = await apiUtil.get<ApiResponse>("/user/details");
      setUserData(response.user);
      debugLog("User data fetched successfully:", response);
    } catch (error: any) {
      if (isAuthenticationRedirectError(error)) {
        debugLog("Authentication redirect in ProfileScreen - clearing stale session");
        await rollbackFirebaseSession(apiUtil);
        replace(appHref("HomeScreen"));
        return;
      }
      
      if (isSignupRequiredError(error)) {
        debugLog("User not found in database - redirecting to signup");
        replace(appHref("SignUpScreen", {
          newUser: error.response?.data?.newUser || null,
          returnTo: { screen: "ProfileScreen" },
        }));
        return;
      }
      
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Failed to load user data";
      setError(errorMessage);
      BrandedAlert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiUtil, contextUser, replace]);

  useEffect(() => {
    return () => {
      screenActiveRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      screenActiveRef.current = true;
      return () => {
        screenActiveRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    if (contextUser) {
      setUserData(contextUser as unknown as UserData);
      setLoading(false);
    } else if (!contextUserLoading) {
      fetchUserData();
    }
  }, [contextUser, contextUserLoading, fetchUserData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      void fetchUserData();
    }, [fetchUserData]),
  );

  const profileStats = useMemo(() => {
    const completedTrips = userData?.completed_trips ?? 0;
    const totalTrips =
      completedTrips > 0
        ? completedTrips
        : (userData?.total_bookings ?? 0) + (userData?.total_hosted_rides ?? 0);
    return {
      trips: totalTrips,
      distanceKm: userData?.distance_travelled ?? 0,
    };
  }, [userData]);

  const appInfo = useMemo(() => {
    const expoConfig = Constants.expoConfig as AppVersionConfig | null;
    const configuredBuildVersion =
      Platform.OS === "ios"
        ? expoConfig?.ios?.buildNumber
        : expoConfig?.android?.versionCode?.toString();
    const bundledBuildVersion =
      Platform.OS === "ios"
        ? bundledExpoConfig.ios?.buildNumber
        : bundledExpoConfig.android?.versionCode?.toString();
    const configRuntimeVersion = runtimeVersionFromConfig(
      expoConfig?.runtimeVersion,
      expoConfig?.version,
    );
    const bundledRuntimeVersion = runtimeVersionFromConfig(
      bundledExpoConfig.runtimeVersion,
      bundledExpoConfig.version,
    );

    return {
      version:
        firstInfoValue(
          Constants.nativeAppVersion,
          expoConfig?.version,
          bundledExpoConfig.version,
        ) ?? "Unknown",
      build: firstInfoValue(
        Constants.nativeBuildVersion,
        configuredBuildVersion,
        bundledBuildVersion,
      ),
      runtime:
        firstInfoValue(
          Updates.runtimeVersion,
          Constants.expoRuntimeVersion,
          configRuntimeVersion,
          bundledRuntimeVersion,
        ) ?? "Unknown",
      ota: Updates.updateId
        ? Updates.updateId.slice(0, 8)
        : Updates.isEmbeddedLaunch
          ? "Embedded"
          : "Not available",
    };
  }, []);

  const appInfoRows = useMemo(
    () => [
      {
        label: "Version",
        value: appInfo.build ? `${appInfo.version} (${appInfo.build})` : appInfo.version,
      },
      { label: "Runtime", value: appInfo.runtime },
      { label: "OTA", value: appInfo.ota },
    ],
    [appInfo],
  );


  // "Bookings" row was removed — the Trips tab in the main nav is the
  // canonical surface for booked / hosted / past rides, so a second
  // entry point under Settings was redundant.
  const myDetailsItems: MenuItem[] = [
    {
      id: "personal_info",
      title: "Personal Information",
      icon: require("../../assets/user-male.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to PersonalInformationScreen");
        try {
          navigate(appHref("PersonalInformationScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Personal Information screen");
        }
      },
    },
    {
      id: "passengers",
      title: "Passengers travelled with",
      icon: require("../../assets/car.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to PassengersHistoryScreen");
        try {
          navigate(appHref("PassengersHistoryScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Passengers History screen");
        }
      },
    },
    {
      id: "trip_history",
      title: "Trip history",
      icon: require("../../assets/clock.png"),
      hasCheckmark: true,
      onPress: () => {
        try {
          navigate(appHref("TripHistoryScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Trip history screen");
        }
      },
    },
  ];

  const preferencesItems: MenuItem[] = [
    {
      id: "default_address",
      title: "Default Start Address",
      icon: require("../../assets/location-pin-2.png"),
      onPress: () => {
        debugLog("Navigating to DefaultAddressScreen");
        try {
          navigate(appHref("DefaultAddressScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Default Address screen");
        }
      },
    },
  ];

  const openACMVITSite = () => {
    Linking.openURL('https://acmvit.in').catch((error) => {
      console.warn('[ProfileScreen] ACM-VIT link failed', error);
      showProfileError('Unable to open the link.');
    });
  };

  const openHelpEmail = () => {
    Linking.openURL('mailto:outreach.acmvit@gmail.com').catch((error) => {
      console.warn('[ProfileScreen] help email failed', error);
      showProfileError('Unable to open mail app.');
    });
  };

  const openShareDialog = async () => {
    // Hold a short guard after the native share sheet closes so its dismissal
    // tap cannot fall through to the menu row underneath.
    shareGuardRef.current = true;
    try {
      await Share.share({
        message: 'Check out UniPool by ACM-VIT: https://acmvit.in',
        url: 'https://acmvit.in',
        title: 'ACM-VIT',
      });
    } catch (error) {
      console.warn('[ProfileScreen] share failed', error);
      showProfileError('Unable to open share sheet.');
    } finally {
      setTimeout(() => {
        shareGuardRef.current = false;
      }, 600);
    }
  };

  const openRateApp = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.carpoolitapp';
    // Replace with the App Store listing URL after first iOS submission.
    const appStoreUrl = 'https://apps.apple.com/app/unipool/id6740000000';
    const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
    Linking.openURL(url).catch((error) => {
      console.warn('[ProfileScreen] app store link failed', error);
      showProfileError('Unable to open app store. Please search for UniPool manually.');
    });
  };

  const handleLogout = () => {
    debugLog("Logout button pressed");
    BrandedAlert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            debugLog("User confirmed logout");
            try {
              const [{ getAuth, signOut }, { default: AsyncStorage }] = await Promise.all([
                import('@react-native-firebase/auth'),
                import('../../utils/safeAsyncStorage'),
              ]);

              debugLog("Starting logout process...");
              const auth = getAuth();
              await signOut(auth);
              debugLog("Firebase signout completed");

              await Promise.all([
                AsyncStorage.removeItem('unipool_start_address'),
                AsyncStorage.removeItem('defaultAddress'),
                AsyncStorage.removeItem('lastUserVerification'),
              ]);
              debugLog("AsyncStorage cleared (including lastUserVerification)");

              setUserData(null);
              debugLog("Navigating to AuthScreen...");

              replace(appHref("AuthScreen"));
              debugLog("Navigation reset completed");
            } catch (e) {
              console.error('Logout error:', e);
              BrandedAlert.alert('Logout Failed', 'An error occurred while logging out.');
            }
          },
        },
      ]
    );
  };

  const moreItems: MenuItem[] = [
    {
      id: "share",
      title: "Share",
      icon: require("../../assets/megaphone.png"),
      onPress: openShareDialog,
    },
    {
      id: "rate_app",
      title: "Rate App",
      icon: require("../../assets/star.png"),
      hasCheckmark: true,
      onPress: openRateApp,
    },
    {
      id: "know_about",
      title: "Know about ACM-VIT",
      icon: require("../../assets/acm.png"),
      hasCheckmark: true,
      onPress: openACMVITSite,
    },
    {
      id: "help",
      title: "Help",
      icon: require("../../assets/question.png"),
      hasCheckmark: true,
      onPress: openHelpEmail,
    },
    {
      id: "privacy_policy",
      title: "Privacy Policy",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        navigate(appHref("PrivacyPolicyScreen"));
      },
    },
    {
      id: "terms_of_service",
      title: "Terms of Service",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        navigate(appHref("TermsOfServiceScreen"));
      },
    },
    {
      id: "account_settings",
      title: "Account Settings",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to AccountSettingsScreen");
        try {
          navigate(appHref("AccountSettingsScreen"));
          debugLog("Navigation to AccountSettingsScreen completed");
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Account Settings");
        }
      },
    },
    {
      id: "logout",
      title: "Logout",
      icon: require("../../assets/arrow-square-left.png"),
      onPress: handleLogout,
    },
  ];

  const renderMenuItem = (item: MenuItem) => {
    const isHighPriorityItem = ['help', 'account_settings', 'logout'].includes(item.id);
    // Keep menu rows on the themed raised surface in both color modes.
    const themedMenuOverride = {
      backgroundColor: themeColors.navFill,
      borderColor: themeColors.inkSubtle,
    };
    const itemStyle = isHighPriorityItem
      ? [styles.menuItem, themedMenuOverride, { zIndex: 3000, elevation: 3000, position: 'relative' as const }]
      : [styles.menuItem, themedMenuOverride];

    return (
      <TouchableOpacity
        key={item.id}
        style={itemStyle}
        onPress={() => {
          // Ignore the stray tap the OS delivers to the row underneath
          // when the native share sheet is dismissed (iOS + Android).
          if (shareGuardRef.current) return;
          debugLog(`Menu item pressed: ${item.title} (${item.id})`);
          if (item.onPress) {
            item.onPress();
          } else {
            console.warn(`No onPress handler for item: ${item.title}`);
          }
        }}
        activeOpacity={0.7}
      >
        {item.icon && (
          <Image
            source={item.icon}
            style={[
              styles.menuItemIcon,
              // Dark mode uses the same neutral icon color as the row label.
              themeColors.mode === "dark" && { tintColor: themeColors.textOnDark, opacity: 0.85 },
            ]}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.menuItemText, { color: themeColors.textOnDark }]}>{item.title}</Text>
      </TouchableOpacity>
    );
  };

  const renderStatsCard = (value: string, label: string, unit?: string, icon?: any) => (
    // Stats use the same raised surface treatment as the menu rows.
    <View style={[styles.statsCard, { backgroundColor: themeColors.navFill }]}>
      {icon && (
        <Image
          source={icon}
          style={[
            styles.statsIcon,
            themeColors.mode === "dark" && { tintColor: themeColors.textOnDark, opacity: 0.85 },
          ]}
          resizeMode="contain"
        />
      )}
      <Text
        style={[
          styles.statsValue,
          themeColors.mode === "dark" && { color: themeColors.textOnDark },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statsLabel,
          themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
        ]}
      >
        {label}
      </Text>
      {unit && (
        <Text
          style={[
            styles.statsUnit,
            themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.55 },
          ]}
        >
          {unit}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <LoadingComponent />
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.destructive }]}>
            {error || "Unable to load profile data"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header — matches the Chats tab pattern: no BrandInfo wordmark
          above, just a bold 34pt title that consumes its own top safe-
          area inset. The 24pt + BrandInfo combo was the older Settings
          chrome; the inbox-style header reads as a single confident
          stop instead of a two-row stack. */}
      <View
        style={[
          { paddingHorizontal: 22, paddingTop: Math.max(insets.top, 16) + 10, paddingBottom: 14 },
          tabletContentStyle,
        ]}
      >
        <Text
          style={{
            fontFamily: "NunitoSans_800ExtraBold",
            fontSize: 34,
            lineHeight: 38,
            letterSpacing: -0.9,
            color: themeColors.textPrimary,
          }}
        >
          Profile
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                userData.profile_picture_url
                  ? { uri: userData.profile_picture_url }
                  : require("../../assets/user-male.png")
              }
              style={[
                styles.profileImage,
                // Dark mode: avatar empty-state fill + ring use the
                // neutral charcoal hierarchy instead of forest +
                // lime, so the ring no longer reads as a bright
                // brand splash against the dark canvas. Light mode
                // keeps the historical forest fill + lime ring.
                themeColors.mode === "dark" && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.inkSoft,
                },
              ]}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{userData.name}</Text>
        </View>

        <View style={styles.statsContainer}>
          {renderStatsCard(
            profileStats.trips.toString(),
            "trips"
          )}
          {renderStatsCard(
            profileStats.distanceKm.toString(),
            "travelled",
            "km"
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Account</Text>
          <View style={styles.menuContainer}>
            {myDetailsItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Preferences</Text>
          <View style={styles.menuContainer}>
            {preferencesItems.map(renderMenuItem)}
          </View>
        </View>

        {/* Appearance — the segmented control writes to ThemeContext +
            AsyncStorage; ThemedRoot re-renders the canvas + StatusBar
            on the next frame so the switch feels instant. "System"
            mirrors the OS-level preference and live-updates if the
            user toggles it in Settings while the app is open.
            ⚠️ Temporarily hidden for the 2.0.8 / 2.0.9 release while
            dark mode is held back. The component + ThemeContext stay
            wired up so re-enabling is just deleting the `false &&`. */}
        {false && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Appearance</Text>
            <AppearanceSegmented />
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>More</Text>
          <View style={[styles.menuContainer, { zIndex: 2000, elevation: 2000, position: 'relative' }]}>
            {moreItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Information</Text>
          <View
            style={[
              styles.appInfoCard,
              {
                backgroundColor: themeColors.navFill,
                borderColor: themeColors.inkSubtle,
              },
            ]}
          >
            <View style={styles.appInfoBrandRow}>
              <View style={styles.appInfoIconTile}>
                <Image
                  source={require("../../assets/profile-app-icon.png")}
                  style={styles.appInfoIcon}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.appInfoBrandText}>
                <Text style={[styles.appInfoWordmark, { color: themeColors.textOnDark }]}>UniPool</Text>
                <Text style={[styles.appInfoSubtitle, { color: themeColors.textOnDark }]}>ACM-VIT</Text>
              </View>
            </View>
            <View style={[styles.appInfoDivider, { backgroundColor: themeColors.inkSubtle }]} />
            {appInfoRows.map((row) => (
              <View key={row.label} style={styles.appInfoRow}>
                <Text style={[styles.appInfoLabel, { color: themeColors.textOnDark }]}>{row.label}</Text>
                <Text
                  style={[styles.appInfoValue, { color: themeColors.textOnDark }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.footerBranding, { zIndex: 1 }]}>
          {/* Dark mode: "Viva la Vida!" + the credit row use cream
              text so they're readable on the dark canvas. Light
              mode keeps the historical basicBlack + forest. */}
          <Text
            style={[
              styles.footerSubtitle,
              themeColors.mode === "dark" && { color: themeColors.textOnDark },
            ]}
          >
            Viva la Vida!
          </Text>
          <View style={styles.footerImageContainer}>
            <Image
              source={require("../../assets/trees-footer.png")}
              style={styles.footerImage}
              resizeMode="contain"
            />
          </View>
          {(() => {
            // "Crafted with ♥ by ACM-VIT" — the heart SVG and "by ACM-VIT"
            // label were hardcoded forest, which read as invisible on the
            // dark canvas. Resolve to the cream text color in dark, forest
            // (the historical hex) in light.
            const creditColor =
              themeColors.mode === "dark" ? themeColors.textOnDark : AppColors.secondaryDarkGreen;
            return (
              <View style={[styles.footerTextContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -100 }]}>
                <Text style={[styles.footerCredits, { fontSize: 16, fontFamily: "NunitoSans_400Regular", color: creditColor, textAlign: 'center', marginBottom: 4 }]}>Crafted with </Text>
                <View style={{ marginHorizontal: 4, marginBottom: 2 }}>
                  <Svg width={22} height={20} viewBox="0 0 41 37" fill="none">
                    <G clipPath="url(#clip0_75_2248)">
                      <Path d="M18.8159 35.4322L19.0203 35.4944C19.7717 35.7218 20.4815 35.9362 20.9492 36.876C20.9611 36.8997 20.9777 36.9207 20.9981 36.9376C21.0185 36.9544 21.0422 36.9667 21.0676 36.9737C21.0836 36.9779 21.1 36.9802 21.1166 36.9802C21.1529 36.9802 21.1882 36.9695 21.2187 36.9496C21.5636 36.7228 21.8885 36.5174 22.1969 36.3223C22.8432 35.9132 23.4014 35.5603 23.9352 35.1491C25.8498 33.7063 27.5968 32.0501 29.1433 30.2115C31.1758 27.7539 33.2774 25.2125 35.2557 22.5522C36.4939 20.8868 37.5497 19.0276 38.4419 17.4163C39.3342 15.786 39.8655 13.9796 39.9991 12.1217C40.2412 9.06857 39.522 6.31658 37.8618 3.94232C36.0139 1.29984 33.5563 0.0129204 30.5627 0.112139C27.1855 0.226084 24.2154 1.52953 21.7346 3.98644C21.6143 4.11123 21.5029 4.24446 21.4014 4.38516C21.2085 4.63919 21.0254 4.88033 20.75 4.97587C17.8563 2.13 15.6438 1.01675 12.3341 0.731431C8.93742 0.438376 6.18756 1.54135 4.16053 4.00801C3.15455 5.22727 2.27284 6.54579 1.52877 7.94362C-0.057273 10.9421 -0.387768 14.1315 0.547998 17.4237C1.38255 20.3622 2.77409 23.109 4.64544 25.5118C8.38686 30.331 13.1546 33.6691 18.8159 35.4322ZM4.80495 8.51149C5.2396 7.68449 5.72382 6.88505 6.25483 6.11755C7.51729 4.25706 9.29657 3.31807 11.5529 3.31807C11.8325 3.31807 12.1193 3.33246 12.4134 3.36131C15.4273 3.65712 17.845 4.99777 19.5993 7.34589C19.81 7.6279 20.0395 7.88897 20.2419 8.11906C20.3243 8.21294 20.4018 8.30116 20.4701 8.38197C20.4986 8.41565 20.538 8.43808 20.5812 8.44542C21.3948 8.58716 21.7237 8.16118 21.9678 7.75216C23.3766 5.39281 25.5694 3.98447 28.8689 3.32031C29.6502 3.18415 30.4473 3.16395 31.2345 3.26045C32.4843 3.37955 33.5565 3.99977 34.4215 5.10333C35.4072 6.36917 35.9915 7.90599 36.0976 9.51269C36.2721 11.3698 35.9343 13.2396 35.1217 14.9149C34.5094 16.2134 33.8124 17.4695 33.0354 18.6747C31.5927 20.8209 30.0519 22.9546 28.5621 25.0179L28.0443 25.7358C26.9348 27.274 25.7874 28.8245 24.6781 30.3238C24.2777 30.8648 23.8778 31.406 23.478 31.9476C23.3055 32.1814 23.1259 32.4104 22.936 32.653C22.8733 32.7329 22.8097 32.8142 22.7449 32.8973C22.2128 32.6764 21.6947 32.4604 21.1866 32.2495C19.9874 31.7514 18.844 31.2763 17.7033 30.7942C14.546 29.4813 11.6861 27.5337 9.29747 25.07C6.8484 22.5257 5.15098 19.8037 4.10857 16.7483C3.15804 13.9614 3.38572 11.267 4.80495 8.51149Z" fill={creditColor}/>
                    </G>
                    <Defs>
                      <ClipPath id="clip0_75_2248">
                        <Rect width="40.1069" height="37" fill="white"/>
                      </ClipPath>
                    </Defs>
                  </Svg>
                </View>
                <Text style={[styles.footerCredits, { fontSize: 16, fontFamily: "NunitoSans_400Regular", color: creditColor, textAlign: 'center', marginBottom: 4 }]}>by ACM-VIT</Text>
              </View>
            );
          })()}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
