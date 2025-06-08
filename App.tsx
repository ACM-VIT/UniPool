import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AuthScreen from "./screens/AuthScreen";
import SignUpScreen from "./screens/SignUpScreen";
import RideCreatedScreen from "./screens/RideCreatedScreen";
import RideRequestedScreen from "./screens/RideRequestedScreen";
import BookingScreen from "./screens/BookingScreen";

import { RootStackParamList } from "./navigation/RootStackParamList";
import SignInScreen from "./screens/SignInScreen";


GoogleSignin.configure({
  webClientId:"290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com",
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setInitialRoute(user ? "BookingScreen" : "AuthScreen");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignInScreen" component={SignInScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RideCreatedScreen" component={RideCreatedScreen} />
        <Stack.Screen name="RideRequestedScreen" component={RideRequestedScreen} />
        <Stack.Screen name="BookingScreen" component={BookingScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
