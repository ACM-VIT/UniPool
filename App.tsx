import 'react-native-gesture-handler';
import React, { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { navigationRef } from "./navigation/navigationRef";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigation/RootStackParamList";

import AuthScreen from "./screens/AuthScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SplashScreenComponent from "./screens/SplashScreen";
import ErrorScreen from "./screens/ErrorScreen";
import RideCreatedScreen from "./screens/RideCreatedScreen";
import RideRequestedScreen from "./screens/RideRequestedScreen";
import BookingScreen from "./screens/BookingScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CreateRide from "./screens/CreateRide";
import RideDetailsScreen from "./screens/RideDetailsScreen";

import BookingsScreen from "./screens/BookingsScreen";
import PersonalInformationScreen from "./screens/PersonalInformationScreen";
import PassengersHistoryScreen from "./screens/PassengersHistoryScreen";
import AccountSettingsScreen from "./screens/AccountSettingsScreen";
import AvailableRideScreenSelected from "./screens/AvailableRideScreens/AvailableRideScreenSelected";

import { PassengerInfoScreen, ChatConversationScreen, TripsListScreen } from "./screens/ChatScreens";

import MainNavBar from "./components/MainNavBar";
import bottomNavItems from "./data/BottomNavigationItems";
import { ApiProvider, useApi } from "./utils/ApiUtil";
import { ErrorProvider } from "./contexts/ErrorContext";

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import * as SplashScreen from "expo-splash-screen";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithCredential } from "@react-native-firebase/auth";

import { LocationProvider } from "./contexts/location-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

async function registerForPushNotificationsAsync(): Promise<string | null> {
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
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permission not granted");
        return null;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
      console.log("Push Token obtained:", token?.substring(0, 20) + "...");
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

const globalStyles = StyleSheet.create({
  navBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 20,
  },
});

GoogleSignin.configure({
  webClientId:
    "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppContent = () => {
  const { apiUtil } = useApi();
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [authStateResolved, setAuthStateResolved] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    NunitoSans: NunitoSans_600SemiBold,
  });

  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
  const [navBarText, setNavBarText] = useState<string>("");
  const [navBarIcon, setNavBarIcon] = useState<any>(
    require("./assets/wallet.png")
  );
  const [navBarItems, setNavBarItems] = useState(bottomNavItems);

  const [navStateVersion, setNavStateVersion] = useState(0);

  const handleNotificationNavigation = (data: any) => {
    if (!navigationRef.current) return;

    if (data?.type === "chat_message") {
      if (data.ride_id) {
        navigationRef.current.navigate("ChatMessages", {
          chatId: String(data.ride_id),
          chatTitle: String(data.chat_title || "Chat"),
          chatSubtitle: String(data.chat_subtitle || "Ride Chat"),
          isGroupChat: true
        });
      }
    } else if (data?.type === "ride_request_approved") {
      if (data.ride_id) {
        navigationRef.current.navigate("RideDetailsScreen", {
          ride: { id: String(data.ride_id) }
        });
      }
    } else if (data?.type === "ride_request_received") {
      if (data.ride_id) {
        navigationRef.current.navigate("RideDetailsScreen", {
          ride: { id: String(data.ride_id) }
        });
      }
    } else if (data?.type === "ride_reminder") {
      if (data.ride_id) {
        navigationRef.current.navigate("RideDetailsScreen", {
          ride: { id: String(data.ride_id) }
        });
      }
    } else if (data?.ride_id || data?.rideId) {
      const rideId = data.ride_id || data.rideId;
      navigationRef.current.navigate("RideDetailsScreen", {
        ride: { id: String(rideId) }
      });
    }
  };

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    const authInstance = getAuth();
    
    console.log("Setting up Firebase auth state listener...");
    
    const currentUser = authInstance.currentUser;
    console.log("Current user on startup:", currentUser ? `Signed in as ${currentUser.email}` : "No current user");

    const checkGoogleSignInStatus = async () => {
      try {
        const googleUser = GoogleSignin.getCurrentUser();
        console.log("Google Sign-In status:", googleUser ? "Signed in" : "Not signed in");
        if (googleUser) {
          console.log("Google current user:", googleUser?.user?.email || "No email");
          
          if (!currentUser) {
            console.log("Attempting to restore Firebase auth from Google user...");
            try {
              const userInfo = await GoogleSignin.signInSilently();
              console.log("Google silent sign-in successful");
              
              const tokens = await GoogleSignin.getTokens();
              const idToken = tokens.idToken;
              
              if (idToken) {
                const googleCredential = GoogleAuthProvider.credential(idToken);
                
                await signInWithCredential(authInstance, googleCredential);
                console.log("Firebase auth restored from Google credentials");
              } else {
                console.log("No ID token available from Google");
              }
            } catch (silentSignInError: any) {
              console.log("Google silent sign-in failed:", silentSignInError);
            }
          }
        }
      } catch (err: any) {
        console.log("Google Sign-In status check error:", err);
      }
    };
    
    checkGoogleSignInStatus();
    
    let authCheckTimeout: NodeJS.Timeout;
    let hasAuthStateChanged = false;
    
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      hasAuthStateChanged = true;
      setAuthStateResolved(true);
      
      if (authCheckTimeout) {
        clearTimeout(authCheckTimeout);
      }
      
      console.log("Auth state changed:", user ? "User signed in" : "User signed out");
      if (user) {
        console.log("User UID:", user.uid);
        console.log("User email:", user.email);
        console.log("Last sign in:", user.metadata.lastSignInTime);
        console.log("Token refresh time:", user.metadata.lastSignInTime);
        
        try {
          const tokenResult = await user.getIdTokenResult(false);
          console.log("🎟️ Token valid until:", new Date(tokenResult.expirationTime));
        } catch (tokenError) {
          console.error("Token validation error:", tokenError);
        }
      }
      
      setInitialRoute(user ? "HomeScreen" : "AuthScreen");
      setLoading(false);
    });
    
    authCheckTimeout = setTimeout(async () => {
      if (!hasAuthStateChanged) {
        console.log("Auth state timeout - checking current user manually");
        
        try {
          await authInstance.currentUser?.reload();
        } catch (reloadError: any) {
          console.log("Auth reload error:", reloadError);
        }
        
        const manualCurrentUser = authInstance.currentUser;
        if (manualCurrentUser) {
          console.log("Found current user manually:", manualCurrentUser.email);
          
          try {
            const tokenResult = await manualCurrentUser.getIdTokenResult(true); // Force refresh
            console.log("Token refreshed and valid until:", new Date(tokenResult.expirationTime));
            setInitialRoute("HomeScreen");
          } catch (tokenError: any) {
            console.error("Token refresh failed:", tokenError);
            setInitialRoute("AuthScreen");
          }
        } else {
          console.log("No current user found - redirecting to auth");
          setInitialRoute("AuthScreen");
        }
        setAuthStateResolved(true);
        setLoading(false);
      }
    }, 5000);
    
    return () => {
      unsubscribe();
      if (authCheckTimeout) {
        clearTimeout(authCheckTimeout);
      }
    };
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        console.log("Push token obtained, sending to backend...");
        
        // Send token to backend only if user is authenticated
        if (authStateResolved && initialRoute === "HomeScreen") {
          try {
            await apiUtil.post("/users/me/token", { token });
            console.log("Push token successfully sent to backend.");
          } catch (error) {
            console.error("Failed to send push token to backend:", error);
          }
        }
      }
    };

    setupNotifications();

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("🔔 Notification received:", notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("🔔 Notification response:", response);
      
      const data = response.notification.request.content.data as any;
      
      if (!navigationRef.current) {
        console.log("Navigation ref not ready");
        return;
      }

      handleNotificationNavigation(data);
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log("App opened from notification:", response);
        const data = response.notification.request.content.data as any;
        
        setTimeout(() => {
          if (navigationRef.current) {
            handleNotificationNavigation(data);
          }
        }, 1000);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [apiUtil, authStateResolved, initialRoute]);

  useEffect(() => {
    if (fontsLoaded && !loading && initialRoute && authStateResolved) {
      const timer = setTimeout(() => {
        setShowCustomSplash(false);
        SplashScreen.hideAsync();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, loading, initialRoute, authStateResolved]);

  const getCurrentRouteName = () => {
    if (navigationRef.current && navigationRef.current.getCurrentRoute) {
      const route = navigationRef.current.getCurrentRoute();
      return route?.name;
    }
    return initialRoute;
  };

  if (showCustomSplash || !fontsLoaded || loading || !initialRoute || !authStateResolved) {
    return <SplashScreenComponent />;
  }

  const currentRouteName = getCurrentRouteName();
  const showNavBar =
    currentRouteName !== "AuthScreen" && 
    currentRouteName !== "SignUpScreen" && 
    currentRouteName !== "CreateRide" && 
    currentRouteName !== "AvailableRidesSelectedScreen" &&
    currentRouteName !== "ChatMessages" &&
    currentRouteName !== "RideDetailsScreen"
  
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => setNavStateVersion((v) => v + 1)}
      >
        <View style={{ flex: 1 }}>
          <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen
              name="DefaultAddressScreen"
              component={require("./screens/DefaultAddressScreen").default}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AccountSettingsScreen"
              component={AccountSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AuthScreen"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignInScreen"
              component={SignInScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUpScreen"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SplashScreen"
              component={SplashScreenComponent}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ErrorScreen"
              component={ErrorScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RideCreatedScreen"
              options={{ headerShown: false }}
            >
              {(props) => (
                <RideCreatedScreen
                  {...props}
                  setNavBarVariant={setNavBarVariant}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="RideRequestedScreen"
              component={RideRequestedScreen}
              options={{ headerShown: false, animation: 'none' }}
            />
            <Stack.Screen
              name="BookingScreen"
              component={BookingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RideDetailsScreen"
              component={RideDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="HomeScreen" options={{ headerShown: false }}>
              {(props) => (
                <HomeScreen
                  {...props}
                  setNavBarVariant={setNavBarVariant}
                  setNavBarText={setNavBarText}
                  setNavBarIcon={setNavBarIcon}
                  setNavBarItems={setNavBarItems}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="ProfileScreen"
              component={ProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateRide"
              component={CreateRide}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AvailableRidesScreen"
              options={{ headerShown: false }}
            >
              {(props) => {
                const AvailableRideScreen = require(
                  "./screens/AvailableRideScreens/AvailableRideScreen"
                ).default;
                return (
                  <AvailableRideScreen
                    {...props}
                    setNavBarVariant={setNavBarVariant}
                    setNavBarText={setNavBarText}
                    setNavBarIcon={setNavBarIcon}
                    setNavBarItems={setNavBarItems}
                  />
                );
              }}
            </Stack.Screen>
            <Stack.Screen
              name="AvailableRidesSelectedScreen"
              component={
                require("./screens/AvailableRideScreens/AvailableRideScreenSelected")
                  .default
              }
              options={{ headerShown: false, animation: 'none' }}
            />
            <Stack.Screen
              name="BookingsScreen"
              component={BookingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PersonalInformationScreen"
              component={PersonalInformationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PassengersHistoryScreen"
              component={PassengersHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PassengerInfoScreen"
              component={PassengerInfoScreen}
              options={{ headerShown: false, animation: 'none' }}
            />
            <Stack.Screen
              name="ChatMessages"
              component={ChatConversationScreen}
              options={{ headerShown: false, animation: 'none' }}
            />
            <Stack.Screen
              name="TripsListScreen"
              component={TripsListScreen}
              options={{ headerShown: false, animation: 'none' }}
            />
          </Stack.Navigator>

          {showNavBar && (
            <View style={globalStyles.navBarWrapper}>
              {navBarVariant === 1 ? (
                <MainNavBar
                  variant={1}
                  text={navBarText}
                  iconPath={navBarIcon}
                  onPress={() => {
                    navigationRef.isReady() && navigationRef.navigate("AvailableRidesScreen", { fromLocation: "", toLocation: "" });
                    setNavBarVariant(0);
                    setNavBarText("");
                    setNavBarIcon(require("./assets/wallet.png"));
                    setNavBarItems(bottomNavItems);
                  }}
                />
              ) : navBarVariant === 2 ? (
                <MainNavBar
                  variant={2}
                  text={navBarText}
                  iconPath={navBarIcon}
                  onPress={() => {
                    navigationRef.isReady() && navigationRef.navigate("AvailableRidesSelectedScreen");
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
        </View>
      </NavigationContainer>
    </View>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar backgroundColor="#A8D8A8" barStyle="dark-content" />
        <ErrorProvider navigationRef={navigationRef}>
          <ApiProvider navigationRef={navigationRef}>
            <LocationProvider>
              <AppContent />
            </LocationProvider>
          </ApiProvider>
        </ErrorProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
