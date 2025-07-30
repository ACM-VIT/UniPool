import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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

// Chat Screens
import { PassengerInfoScreen, ChatConversationScreen, TripsListScreen } from "./screens/ChatScreens";

import MainNavBar from "./components/MainNavBar";
import bottomNavItems from "./data/BottomNavigationItems";
import { ApiProvider } from "./utils/ApiUtil";

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import * as SplashScreen from "expo-splash-screen";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";

import { LocationProvider } from "./contexts/location-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const globalStyles = StyleSheet.create({
  navBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
});

GoogleSignin.configure({
  webClientId:
    "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const navigationRef = useRef<any>(null);

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

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

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

  const getCurrentRouteName = () => {
    if (navigationRef.current && navigationRef.current.getCurrentRoute) {
      const route = navigationRef.current.getCurrentRoute();
      return route?.name;
    }
    return initialRoute;
  };

  if (showCustomSplash || !fontsLoaded || loading || !initialRoute) {
    return <SplashScreenComponent />;
  }

  const currentRouteName = getCurrentRouteName();
  const showNavBar =
    currentRouteName !== "AuthScreen" && 
    currentRouteName !== "SignUpScreen" && 
    currentRouteName !== "CreateRide" && 
    currentRouteName !== "AvailableRidesSelectedScreen" &&
    currentRouteName !== "ChatConversationScreen" &&
    currentRouteName !== "ChatMessages" &&
    currentRouteName !== "PassengerInfoScreen"
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ApiProvider navigationRef={navigationRef}>
        <LocationProvider>
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
                    component={RideCreatedScreen}
                    options={{ headerShown: false }}
                  />
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
                          navigationRef.current?.navigate("AvailableRidesScreen");
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
                          navigationRef.current?.navigate(
                            "AvailableRidesSelectedScreen"
                          );
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
        </LocationProvider>
      </ApiProvider>
    </GestureHandlerRootView>
  );
};

export default App;
