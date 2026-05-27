import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Platform, AppState } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { RootStackParamList } from "../navigation/RootStackParamList";
import {
  appHref,
  routeNameFromPath,
} from "../navigation/routes";
import { NavBarProvider } from "../contexts/NavBarContext";
import SplashScreenComponent from "../screens/SplashScreen";
import MainNavBar, { MAIN_NAV_BAR_TOP_OFFSET } from "../components/MainNavBar";
import { BrandedAlertHost } from "../components/BrandedAlert";
import bottomNavItems from "../data/BottomNavigationItems";
import { useApi } from "../utils/ApiUtil";
import { useUser } from "../contexts/UserContext";

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import * as SplashScreen from "expo-splash-screen";
import { getAuth, getIdTokenResult, onAuthStateChanged, GoogleAuthProvider, signInWithCredential } from "@react-native-firebase/auth";

import * as Notifications from "expo-notifications";
import * as SystemUI from "expo-system-ui";
import * as Device from "expo-device";
import AppColors from "../design_systems/colors";
import { shouldShowPermissionsPrompt } from "../utils/permissionsPrompt";
import {
  isAuthenticationRedirectError,
  rollbackFirebaseSession,
} from "../utils/authFlow";

const DEBUG_APP =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_APP === "1";

const debugLog = (...args: any[]) => {
  if (DEBUG_APP) console.log(...args);
};

void SplashScreen.preventAutoHideAsync().catch(() => {});
void SystemUI.setBackgroundColorAsync(AppColors.primaryLightGreen).catch(() => {});

/**
 * Register for push notifications.
 *
 * When `promptIfNeeded=false` (the default for startup paths), this
 * function ONLY proceeds if the user has already granted notification
 * permission in a prior session. It never triggers the native iOS /
 * Android prompt — that prompt is reserved for explicit user actions
 * (requesting a ride, posting one, etc.) handled by the exported
 * `ensurePushNotificationsRegistered` helper below.
 *
 * Returns the device push token if permission was already granted and
 * registration succeeded; `null` otherwise.
 */
async function registerForPushNotificationsAsync(
  promptIfNeeded = false,
): Promise<string | null> {
  let token = null;

  if (Device.isDevice) {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        if (!promptIfNeeded) {
          // Silent startup path — don't ambush the user with a prompt
          // they haven't earned yet. We'll ask later, in context.
          return null;
        }
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        debugLog("Push notification permission not granted");
        return null;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
      debugLog("Push Token obtained:", token?.substring(0, 20) + "...");
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  } else {
    debugLog("Must use physical device for Push Notifications");
  }

  return token;
}

const globalStyles = StyleSheet.create({
  shellRoot: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  navBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    height: MAIN_NAV_BAR_TOP_OFFSET,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    // On Android, `elevation` beats `zIndex` for stacking. The bottom
    // sheet uses `elevation: 8`, which was making it draw over the
    // floating navbar (and the navbar looked invisible even though it
    // was rendered). Setting a higher elevation forces the navbar
    // back on top on Android.
    elevation: 30,
  },
});

GoogleSignin.configure({
  webClientId:
    "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const NAVBAR_HIDDEN_ROUTES = [
  "SplashScreen",
  "OnboardingScreen",
  "LocationPermissionScreen",
  "AuthScreen",
  "SignUpScreen",
  "CreateRide",
  "AvailableRidesSelectedScreen",
  "ChatMessages",
  "RideDetailsScreen",
];

const AppShell = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { apiUtil } = useApi();
  const { user: viewerUser } = useUser();
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  // Tri-state: undefined = not checked yet; null = no detour needed
  // (user already saw the prompt OR permission is already granted);
  // a string = the route name we want to send them to FIRST before
  // their actual destination. The bootstrap gate waits for this to
  // resolve so the splash stays up until we know where to go.
  const [locationDetour, setLocationDetour] =
    useState<"LocationPermissionScreen" | null | undefined>(undefined);
  const [authStateResolved, setAuthStateResolved] = useState(false);
  const lastPostedPushTokenRef = useRef<string | null>(null);
  const [lastUserVerification, setLastUserVerification] = useState<number | null>(null);

  const isCachedAuthValid = () => {
    if (!lastUserVerification) return false;
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    return lastUserVerification > twentyFourHoursAgo;
  };

  const markUserAsVerified = () => {
    const now = Date.now();
    setLastUserVerification(now);
    try {
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem('lastUserVerification', now.toString());
      });
    } catch (error) {
      debugLog('Could not store verification timestamp:', error);
    }
  };

  const isSignupRequiredError = (error: any) =>
    error?.response?.status === 404 &&
    error?.response?.data?.message === "User not found in database, signup required";

  useEffect(() => {
    const loadCachedVerification = async () => {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const cached = await AsyncStorage.getItem('lastUserVerification');
        if (cached) {
          setLastUserVerification(parseInt(cached));
        }
      } catch (error) {
        debugLog('Could not load cached verification:', error);
      }
    };
    loadCachedVerification();
  }, []);

  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    NunitoSans: NunitoSans_600SemiBold,
    // Brand wordmark face. Was previously assumed loaded via the
    // (defunct) RN asset linker — without explicit registration here,
    // every `fontFamily: "Trap-Bold"` consumer (BrandInfo wordmark,
    // SplashScreen logo, ErrorComponent, profile + chat headers) falls
    // back to the system font on Android. iOS happened to resolve it
    // because the .otf shipped via the asset bundle, but Android needs
    // the explicit register.
    "Trap-Bold": require("../assets/fonts/trap/Trap-Bold.otf"),
  });

  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
  const [navBarText, setNavBarText] = useState<string>("");
  const [navBarIcon, setNavBarIcon] = useState<any>(
    require("../assets/wallet.png")
  );
  const [navBarItems, setNavBarItems] = useState(bottomNavItems);
  const navBarControls = useMemo(
    () => ({
      setNavBarVariant,
      setNavBarText,
      setNavBarIcon,
      setNavBarItems,
    }),
    [],
  );
  const currentRouteName = routeNameFromPath(pathname) ?? initialRoute ?? "SplashScreen";
  const isBootstrapping =
    showCustomSplash ||
    !fontsLoaded ||
    loading ||
    !initialRoute ||
    !authStateResolved ||
    // Splash stays up until we've decided whether to detour through
    // the LocationPermissionScreen. Otherwise the user could see a
    // half-second of HomeScreen flash before being navigated away.
    locationDetour === undefined;

  const handleNotificationNavigation = (data: any) => {
    const type = String(data?.type || "");
    const rideId = data?.ride_id || data?.rideId;
    const dmRoomId = data?.dm_room_id || data?.dmRoomId;

    if (type === "chat_message") {
      if (rideId) {
        router.navigate(appHref("ChatMessages", {
          chatId: String(rideId),
          chatTitle: String(data.chat_title || "Chat"),
          chatSubtitle: String(data.chat_subtitle || "Ride Chat"),
          userId: viewerUser?.id,
          isGroupChat: true
        }));
      }
    } else if (type === "direct_message") {
      if (dmRoomId) {
        router.navigate(appHref("ChatMessages", {
          chatId: String(dmRoomId),
          chatTitle: String(data.sender_name || data.chat_title || "Chat"),
          userId: viewerUser?.id,
          isGroupChat: false,
          otherUserId: data.sender_id ? String(data.sender_id) : undefined,
        }));
      } else {
        router.navigate(appHref("TripsListScreen"));
      }
    } else if (type === "booking_accepted" || type === "ride_request_approved") {
      if (rideId) {
        router.navigate(appHref("ChatMessages", {
          chatId: String(rideId),
          chatTitle: String(data.chat_title || "Trip chat"),
          chatSubtitle: String(data.chat_subtitle || "Ride Chat"),
          userId: viewerUser?.id,
          isGroupChat: true,
        }));
      } else {
        router.navigate(appHref("TripsListScreen"));
      }
    } else if (type === "booking_request" || type === "ride_request_received") {
      if (dmRoomId || rideId) {
        router.navigate(appHref("ChatMessages", {
          chatId: String(dmRoomId || rideId),
          chatTitle: String(data.passenger_name || data.chat_title || "Ride request"),
          userId: viewerUser?.id,
          isGroupChat: !dmRoomId,
          otherUserId: data.passenger_id ? String(data.passenger_id) : undefined,
          pendingHostInquiry: !!dmRoomId,
          viewerIsHost: !!dmRoomId,
          pendingRideId: rideId ? String(rideId) : undefined,
          pendingHostName: data.passenger_name ? String(data.passenger_name) : undefined,
          hostPendingRequestBookingId: data.booking_id ? String(data.booking_id) : undefined,
        } as any));
      } else {
        router.navigate(appHref("TripsListScreen"));
      }
    } else if (type === "booking_rejected") {
      router.navigate(appHref("HomeScreen"));
    } else if (type === "booking_withdrawn") {
      // Accepted passenger backed out before the ride. Drop the host
      // on the ride's management view so they can see the freshly-
      // opened seat and (if they want) share the ride again to
      // refill it. Fall back to Home if for some reason the push
      // lacks a ride_id.
      if (rideId) {
        router.navigate(appHref("RideDetailsScreen", {
          rideId: String(rideId),
        }));
      } else {
        router.navigate(appHref("HomeScreen"));
      }
    } else if (data?.type === "ride_reminder") {
      if (rideId) {
        router.navigate(appHref("RideDetailsScreen", {
          rideId: String(rideId)
        }));
      }
    } else if (type === "rating_prompt") {
      // 12h-after-trip "how was the ride?" push lands here.
      if (rideId) {
        router.navigate(appHref("PostTripRatingScreen", {
          rideId: String(rideId),
        }));
      }
    } else if (type === "ride_cancelled" || type === "ride_cancelled_pending") {
      // Host pulled a ride before the user's pending request was
      // accepted — drop them at Home so they can find another.
      router.navigate(appHref("HomeScreen"));
    } else if (type === "ride_updated") {
      if (rideId) {
        router.navigate(appHref("RideDetailsScreen", {
          rideId: String(rideId)
        }));
      }
    } else if (rideId) {
      router.navigate(appHref("RideDetailsScreen", {
        rideId: String(rideId)
      }));
    }
  };

  useEffect(() => {
    const authInstance = getAuth();
    
    debugLog("Setting up Firebase auth state listener...");
    
    const currentUser = authInstance.currentUser;
    debugLog("Current user on startup:", currentUser ? `Signed in as ${currentUser.email}` : "No current user");

    const checkGoogleSignInStatus = async () => {
      try {
        const googleUser = GoogleSignin.getCurrentUser();
        debugLog("Google Sign-In status:", googleUser ? "Signed in" : "Not signed in");
        if (googleUser) {
          debugLog("Google current user:", googleUser?.user?.email || "No email");
          
          if (!currentUser) {
            debugLog("Attempting to restore Firebase auth from Google user...");
            try {
              const userInfo = await GoogleSignin.signInSilently();
              debugLog("Google silent sign-in successful");
              
              const tokens = await GoogleSignin.getTokens();
              const idToken = tokens.idToken;
              
              if (idToken) {
                const googleCredential = GoogleAuthProvider.credential(idToken);
                
                await signInWithCredential(authInstance, googleCredential);
                debugLog("Firebase auth restored from Google credentials");
              } else {
                debugLog("No ID token available from Google");
              }
            } catch (silentSignInError: any) {
              debugLog("Google silent sign-in failed:", silentSignInError);
            }
          }
        }
      } catch (err: any) {
        debugLog("Google Sign-In status check error:", err);
      }
    };
    
    checkGoogleSignInStatus();
    
    let authCheckTimeout: NodeJS.Timeout;
    let hasAuthStateChanged = false;
    // Boot-time routing decision happens exactly once on the first
    // auth-state resolution. Subsequent changes (in-session sign-in
    // via AuthSheet, sign-out from settings, token refresh) are
    // handled by the originating screen — re-running the probe here
    // would race with them and produce a flash of screens.
    let bootRouteDecided = false;

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      hasAuthStateChanged = true;
      setAuthStateResolved(true);

      if (authCheckTimeout) {
        clearTimeout(authCheckTimeout);
      }

      debugLog("Auth state changed:", user ? "User signed in" : "User signed out");
      if (bootRouteDecided) {
        // Not our problem any more — the screen that initiated the
        // change (AuthSheet, AccountSettings, etc.) drives routing.
        return;
      }
      bootRouteDecided = true;
      if (user) {
        debugLog("User UID:", user.uid);
        debugLog("User email:", user.email);
        debugLog("Last sign in:", user.metadata.lastSignInTime);
        
        try {
          const tokenResult = await getIdTokenResult(user, false);
          apiUtil.primeAuthToken(user.uid, tokenResult.token, Date.parse(tokenResult.expirationTime));
          debugLog("Token valid until:", new Date(tokenResult.expirationTime));
          
          const now = new Date();
          const expirationTime = new Date(tokenResult.expirationTime);
          if (expirationTime > now) {
            debugLog("Token is valid, checking user details in database...");
            
            try {
              await apiUtil.get("/user/details?summary=1");
              debugLog("User details found in database, setting route to HomeScreen");
              markUserAsVerified();
              setInitialRoute("HomeScreen");
            } catch (userDetailsError: any) {
              if (isSignupRequiredError(userDetailsError)) {
                debugLog("User not found in database, redirecting to signup");
                setInitialRoute("SignUpScreen");
              } else if (isAuthenticationRedirectError(userDetailsError)) {
                console.error("Persisted Firebase session rejected by backend:", userDetailsError);
                await rollbackFirebaseSession(apiUtil);
                setInitialRoute("HomeScreen");
              } else if (userDetailsError.message && userDetailsError.message.includes("Timeout")) {
                if (isCachedAuthValid()) {
                  debugLog("Network timeout but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Network timeout and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else if (userDetailsError.status >= 500) {
                if (isCachedAuthValid()) {
                  debugLog("Server error but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Server error and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else {
                console.error("Error checking user details:", userDetailsError);
                debugLog("Redirecting to AuthScreen due to user details error");
                setInitialRoute("HomeScreen");
              }
            }
          } else {
            debugLog("Token is expired, forcing refresh...");
            const freshToken = await getIdTokenResult(user, true);
            apiUtil.primeAuthToken(user.uid, freshToken.token, Date.parse(freshToken.expirationTime));
            debugLog("Fresh token obtained, checking user details in database...");
            
            try {
              await apiUtil.get("/user/details?summary=1");
              debugLog("User details found in database, setting route to HomeScreen");
              markUserAsVerified();
              setInitialRoute("HomeScreen");
            } catch (userDetailsError: any) {
              if (isSignupRequiredError(userDetailsError)) {
                debugLog("User not found in database, redirecting to signup");
                setInitialRoute("SignUpScreen");
              } else if (isAuthenticationRedirectError(userDetailsError)) {
                console.error("Persisted Firebase session rejected by backend:", userDetailsError);
                await rollbackFirebaseSession(apiUtil);
                setInitialRoute("HomeScreen");
              } else if (userDetailsError.message && userDetailsError.message.includes("Timeout")) {
                if (isCachedAuthValid()) {
                  debugLog("Network timeout but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Network timeout and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else if (userDetailsError.status >= 500) {
                if (isCachedAuthValid()) {
                  debugLog("Server error but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Server error and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else {
                console.error("Error checking user details:", userDetailsError);
                debugLog("Redirecting to AuthScreen due to user details error");
                setInitialRoute("HomeScreen");
              }
            }
          }
        } catch (tokenError) {
          console.error("Token validation error:", tokenError);
          debugLog("Redirecting to AuthScreen due to token error");
          if (isAuthenticationRedirectError(tokenError)) {
            await rollbackFirebaseSession(apiUtil);
          }
          setInitialRoute("HomeScreen");
        }
      } else {
        // No Firebase user. We no longer hard-gate on auth — let guests browse
        // the app and we'll prompt for sign-in only at gated actions
        // (CreateRide, Book, Profile). First-launch users still see the
        // onboarding carousel; everyone else lands on Home.
        try {
          const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
          const seen = await AsyncStorage.getItem("hasSeenOnboarding");
          if (seen === "true") {
            debugLog("No user, onboarding seen — HomeScreen (guest)");
            setInitialRoute("HomeScreen");
          } else {
            debugLog("No user, first run — OnboardingScreen");
            setInitialRoute("OnboardingScreen");
          }
        } catch (e) {
          debugLog("Onboarding flag check failed, defaulting to OnboardingScreen", e);
          setInitialRoute("OnboardingScreen");
        }
      }

      setLoading(false);
    });
    
    authCheckTimeout = setTimeout(async () => {
      if (!hasAuthStateChanged) {
        debugLog("Auth state timeout - checking current user manually");
        bootRouteDecided = true;

        try {
          await authInstance.currentUser?.reload();
        } catch (reloadError: any) {
          debugLog("Auth reload error:", reloadError);
        }
        
        const manualCurrentUser = authInstance.currentUser;
        if (manualCurrentUser) {
          debugLog("Found current user manually:", manualCurrentUser.email);
          
          try {
            const tokenResult = await getIdTokenResult(manualCurrentUser, true); // Force refresh
            apiUtil.primeAuthToken(manualCurrentUser.uid, tokenResult.token, Date.parse(tokenResult.expirationTime));
            debugLog("Token refreshed and valid until:", new Date(tokenResult.expirationTime));
            
            // Check if user exists in database before proceeding to HomeScreen
            try {
              await apiUtil.get("/user/details?summary=1");
              debugLog("User details found in database, setting route to HomeScreen");
              markUserAsVerified(); // Mark as verified on success
              setInitialRoute("HomeScreen");
            } catch (userDetailsError: any) {
              if (isSignupRequiredError(userDetailsError)) {
                debugLog("User not found in database, redirecting to signup");
                setInitialRoute("SignUpScreen");
              } else if (isAuthenticationRedirectError(userDetailsError)) {
                console.error("Persisted Firebase session rejected by backend:", userDetailsError);
                await rollbackFirebaseSession(apiUtil);
                setInitialRoute("HomeScreen");
              } else if (userDetailsError.message && userDetailsError.message.includes("Timeout")) {
                if (isCachedAuthValid()) {
                  debugLog("Network timeout but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Network timeout and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else if (userDetailsError.status >= 500) {
                if (isCachedAuthValid()) {
                  debugLog("Server error but cached auth is valid (within 24h), proceeding to HomeScreen");
                  setInitialRoute("HomeScreen");
                } else {
                  debugLog("Server error and no valid cached auth, redirecting to AuthScreen");
                  setInitialRoute("HomeScreen");
                }
              } else {
                console.error("Error checking user details:", userDetailsError);
                debugLog("Redirecting to AuthScreen due to user details error");
                setInitialRoute("HomeScreen");
              }
            }
          } catch (tokenError: any) {
            console.error("Token refresh failed:", tokenError);
            if (isAuthenticationRedirectError(tokenError)) {
              await rollbackFirebaseSession(apiUtil);
            }
            setInitialRoute("HomeScreen");
          }
        } else {
          // Same guest-mode logic as above (timeout path).
          try {
            const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
            const seen = await AsyncStorage.getItem("hasSeenOnboarding");
            setInitialRoute(seen === "true" ? "HomeScreen" : "OnboardingScreen");
          } catch (e) {
            setInitialRoute("OnboardingScreen");
          }
        }
        setAuthStateResolved(true);
        setLoading(false);
      }
    }, 100);
    
    return () => {
      unsubscribe();
      if (authCheckTimeout) {
        clearTimeout(authCheckTimeout);
      }
    };
  }, []);

  useEffect(() => {
    // Token registration runs on three events:
    //   1. Effect mount (cold start)
    //   2. App returning to foreground (AppState.change → "active")
    //   3. Auth state resolving + user is signed in
    //
    // Three signals because real users hit one of these but not
    // always all three — a host who signed in on AuthScreen, never
    // went through LocationPermissionScreen, and brought the app
    // to foreground from background would previously have had NO
    // token registered (the old code only registered when
    // initialRoute === "HomeScreen" at mount). That gap is exactly
    // the "host has no FCM token" log line we kept seeing in prod —
    // the host could not get DM / booking pings until they happened
    // to hit one of the niche paths that posted the token.
    //
    // Idempotent: once a user/token pair is posted in this shell,
    // repeat triggers skip the network write entirely.
    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      if (!authStateResolved) {
        // Auth not ready yet — bail. The deps array will re-fire
        // this effect once authStateResolved flips, by which point
        // apiUtil has a bearer token to attach.
        return;
      }
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      const cacheKey = `${uid}:${token}`;
      if (lastPostedPushTokenRef.current === cacheKey) return;
      try {
        await apiUtil.post("/users/me/token", { token });
        lastPostedPushTokenRef.current = cacheKey;
        debugLog("Push token posted to backend.");
      } catch (error) {
        console.error("Failed to send push token to backend:", error);
      }
    };

    setupNotifications();

    // Foreground-resume listener. Fires every time the user brings
    // UniPool back to the foreground from background — captures the
    // case where the OS rotated the FCM token while the app was
    // suspended (Apple does this periodically, especially after
    // OS updates).
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void setupNotifications();
      }
    });

    if (!Device.isDevice) {
      return () => {
        appStateSub.remove();
      };
    }

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      debugLog("Notification received:", notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      debugLog("Notification response:", response);
      
      const data = response.notification.request.content.data as any;
      
      handleNotificationNavigation(data);
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        debugLog("App opened from notification:", response);
        const data = response.notification.request.content.data as any;
        
        setTimeout(() => {
          handleNotificationNavigation(data);
        }, 1000);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      appStateSub.remove();
    };
  }, [apiUtil, authStateResolved]);

  useEffect(() => {
    if (fontsLoaded && !loading && initialRoute && authStateResolved) {
      // First-run users get a brief brand beat before we hand them to
      // the onboarding carousel — auth + storage resolve in well under
      // a frame on a warm device, so the old 100ms floor meant the
      // splash flashed past unseen. Returning + signed-in users still
      // skip the wait so it never feels like an artificial delay.
      const minDurationMs = initialRoute === "OnboardingScreen" ? 900 : 100;
      const timer = setTimeout(() => {
        setShowCustomSplash(false);
        SplashScreen.hideAsync();
      }, minDurationMs);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, loading, initialRoute, authStateResolved]);

  // Decide whether the user should land on LocationPermissionScreen
  // FIRST instead of their normal initial route. Runs once `initialRoute`
  // is computed. Only intercepts HomeScreen — onboarding / sign-up /
  // verification / etc. flows shouldn't be hijacked by a permission
  // prompt mid-funnel.
  useEffect(() => {
    if (!initialRoute || locationDetour !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        if (initialRoute !== "HomeScreen") {
          if (!cancelled) setLocationDetour(null);
          return;
        }
        // New combined-prompt sheet covers BOTH location + notifications.
        // Renamed key so the rollout shows the new sheet once even to
        // users who previously dismissed the old location-only one.
        // If foreground location is already granted, the prompt has
        // nothing useful to ask for on startup; skip it and mark it
        // seen so onboarding/signup paths don't route through it later.
        const needsPrompt = await shouldShowPermissionsPrompt();
        if (!cancelled) {
          setLocationDetour(needsPrompt ? "LocationPermissionScreen" : null);
        }
      } catch (e) {
        console.warn("Location-detour check failed; skipping prompt", e);
        if (!cancelled) setLocationDetour(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRoute, locationDetour]);

  useEffect(() => {
    if (!isBootstrapping && initialRoute && (!pathname || pathname === "/")) {
      if (locationDetour === "LocationPermissionScreen") {
        // Send the user through the radar screen first; LocationPermissionScreen
        // reads `returnTo` and lands them on their real destination
        // after Allow / Not now.
        router.replace(
          appHref("LocationPermissionScreen", {
            returnTo: { screen: initialRoute },
          } as any) as any,
        );
      } else {
        router.replace(appHref(initialRoute) as any);
      }
    }
  }, [initialRoute, isBootstrapping, pathname, router, locationDetour]);

  const showNavBar =
    !isBootstrapping && !NAVBAR_HIDDEN_ROUTES.includes(currentRouteName as string);
  
  return (
    <View style={globalStyles.shellRoot}>
      {/* Brand-styled replacement for `Alert.alert`. Mounted once at
          the top of the tree; any code can call BrandedAlert.show()
          to surface a dialog without touching the native chrome. */}
      <BrandedAlertHost />
      {/* The `unipool://verify?t=…` magic link is now handled by
          app/verify.tsx — a full polished landing screen instead of a
          silent listener + toast. */}
      <NavBarProvider
        value={navBarControls}
      >
        <View style={globalStyles.shellRoot}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: AppColors.primaryLightGreen },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="AuthScreen" options={{ headerShown: false, presentation: "card" }} />
            <Stack.Screen name="SignUpScreen" options={{ headerShown: false, presentation: "card", animation: "none", gestureEnabled: false }} />
            <Stack.Screen name="PostTripRatingScreen" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="TripHistoryScreen" options={{ headerShown: false }} />
            <Stack.Screen name="AvailableRidesSelectedScreen" options={{ headerShown: false, animation: "none" }} />
            <Stack.Screen name="ChatMessages" options={{ headerShown: false, animation: "none" }} />
            <Stack.Screen name="PassengerInfoScreen" options={{ headerShown: false, animation: "none" }} />
            <Stack.Screen name="RideRequestedScreen" options={{ headerShown: false, animation: "none" }} />
            <Stack.Screen name="TripsListScreen" options={{ headerShown: false, animation: "none" }} />
          </Stack>

          {showNavBar && (
            <View pointerEvents="box-none" style={globalStyles.navBarWrapper}>
              {navBarVariant === 1 ? (
                <MainNavBar
                  variant={1}
                  text={navBarText}
                  iconPath={navBarIcon}
                  onPress={() => {
                    router.navigate(appHref("AvailableRidesScreen", { fromLocation: "", toLocation: "" }));
                    setNavBarVariant(0);
                    setNavBarText("");
                    setNavBarIcon(require("../assets/wallet.png"));
                    setNavBarItems(bottomNavItems);
                  }}
                  // Close X — defers to a handler set by the active
                  // screen (HomeScreen wires this up to clear its
                  // From / To selection). Same `window`-bag pattern
                  // already used for `mainNavBarOnPress` above.
                  onClose={() => {
                    const handler = (window as any).mainNavBarOnClose;
                    if (typeof handler === "function") handler();
                  }}
                />
              ) : navBarVariant === 2 ? (
                <MainNavBar
                  variant={2}
                  text={navBarText}
                  iconPath={navBarIcon}
                  onPress={() => {
                    router.navigate(appHref("AvailableRidesSelectedScreen"));
                  }}
                />
              ) : (
                <MainNavBar
                  variant={0}
                  bottomNavItems={navBarItems}
                  iconPath={navBarIcon}
                />
              )}
            </View>
          )}

          {isBootstrapping && (
            <View style={StyleSheet.absoluteFill} pointerEvents="auto">
              <SplashScreenComponent />
            </View>
          )}
        </View>
      </NavBarProvider>
    </View>
  );
};

export default AppShell;
