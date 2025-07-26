
// React and React Native imports
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";

// Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigation/RootStackParamList";

// Screens
import AuthScreen from "./screens/AuthScreen";
import SignUpScreen from "./screens/SignUpScreen";
import RideCreatedScreen from "./screens/RideCreatedScreen";
import RideRequestedScreen from "./screens/RideRequestedScreen";
import BookingScreen from "./screens/BookingScreen";
import SignInScreen from "./screens/SignInScreen";
import ErrorScreen from "./screens/ErrorScreen";
import SplashScreenComponent from "./screens/SplashScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CreateRide from "./screens/CreateRide";

// Components
import MainNavBar from "./components/MainNavBar";
import bottomNavItems from "./data/BottomNavigationItems";

// API Context
import { ApiProvider } from "./utils/ApiUtil";

// Google Signin
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Fonts
import { useFonts } from "expo-font";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";

// SplashScreen
import * as SplashScreen from "expo-splash-screen";

// Firebase Auth
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Styles for global nav bar wrapper
const globalStyles = StyleSheet.create({
  navBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32, // move up from the bottom, adjust as needed
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
});


GoogleSignin.configure({
  webClientId: "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const navigationRef = useRef<any>(null);

  const [fontsLoaded] = useFonts({
    "NunitoSans_400Regular": NunitoSans_400Regular,
    "NunitoSans_600SemiBold": NunitoSans_600SemiBold,
    "NunitoSans_700Bold": NunitoSans_700Bold,
    "NunitoSans_800ExtraBold": NunitoSans_800ExtraBold,
    "NunitoSans": NunitoSans_600SemiBold,
  });

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      console.log("Nunito Sans fonts loaded successfully!");
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setInitialRoute(user ? "HomeScreen" : "AuthScreen");
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded && !loading && initialRoute) {
      const timer = setTimeout(() => {
        setShowCustomSplash(false);
        SplashScreen.hideAsync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, loading, initialRoute]);

  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);

  if (showCustomSplash || !fontsLoaded || loading || !initialRoute) {
    return <SplashScreenComponent />;
  }

  const handleStateChange = () => {
    const route = navigationRef.current?.getCurrentRoute?.();
    setCurrentRoute(route?.name);
  };

  const routeToNav = {
    HomeScreen: "home",
    BookingScreen: "trips",
    ProfileScreen: "profile",
  };
  const navKey = (currentRoute && Object.prototype.hasOwnProperty.call(routeToNav, currentRoute)) ? currentRoute : "";
  const navItems = bottomNavItems.map(item => ({
    ...item,
    isActive: !!navKey && (routeToNav as any)[navKey] === item.route,
  }));

  return (
    <ApiProvider navigationRef={navigationRef}>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
          <View style={{ flex: 1 }}>
            <Stack.Navigator initialRouteName={initialRoute}>
              <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SignInScreen" component={SignInScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SignUpScreen" component={SignUpScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SplashScreen" component={SplashScreenComponent} options={{ headerShown: false }} />
              <Stack.Screen name="ErrorScreen" component={ErrorScreen} options={{ headerShown: false }} />
              <Stack.Screen name="RideCreatedScreen" component={RideCreatedScreen} options={{ headerShown: false }} />
              <Stack.Screen name="RideRequestedScreen" component={RideRequestedScreen} options={{ headerShown: false }} />
              <Stack.Screen name="BookingScreen" component={BookingScreen} options={{ headerShown: false }} />
              <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
              <Stack.Screen name="CreateRide" component={CreateRide} options={{ headerShown: false }} />
              <Stack.Screen name="AvailableRidesScreen" component={require('./screens/AvailableRideScreens/AvailableRideScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="AvailableRidesSelectedScreen" component={require('./screens/AvailableRideScreens/AvailableRideScreenSelected').default} options={{ headerShown: false }} />
            </Stack.Navigator>
            <View style={globalStyles.navBarWrapper}>
              <MainNavBar variant={0} bottomNavItems={navItems} iconPath={require("./assets/wallet.png")} />
            </View>
          </View>
        </NavigationContainer>
      </View>
    </ApiProvider>
  );
};

export default App;
