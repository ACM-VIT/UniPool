import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import auth, { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";

// Screens
import AuthScreen from "./screens/AuthScreen";
import SignUpScreen from "./screens/SignUpScreen";
import RideCreatedScreen from "./screens/RideCreatedScreen";
import RideRequestedScreen from "./screens/RideRequestedScreen";
import BookingScreen from "./screens/BookingScreen";
import SignInScreen from "./screens/SignInScreen";
import HomeScreen from "./screens/HomeScreen";

// Types
import { RootStackParamList } from "./navigation/RootStackParamList";

// API Context
import { ApiProvider } from "./utils/ApiUtil";

GoogleSignin.configure({
  webClientId: "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    "NunitoSans_400Regular": NunitoSans_400Regular,
    "NunitoSans_600SemiBold": NunitoSans_600SemiBold,
    "NunitoSans_700Bold": NunitoSans_700Bold,
    "NunitoSans_800ExtraBold": NunitoSans_800ExtraBold,
    "NunitoSans": NunitoSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      console.log("Nunito Sans fonts loaded successfully!");
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setInitialRoute(user ? "BookingScreen" : "AuthScreen");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (!fontsLoaded || loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ApiProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignInScreen" component={SignInScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RideCreatedScreen" component={RideCreatedScreen} />
          <Stack.Screen name="RideRequestedScreen" component={RideRequestedScreen} />
          <Stack.Screen name="BookingScreen" component={BookingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ApiProvider>
  );
};

export default App;
