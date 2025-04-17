import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "./screens/AuthScreen";
import SignUpScreen from "./screens/SignUpScreen";

import { RootStackParamList } from "./navigation/RootStackParamList";
import RideCreatedScreen from "./screens/RideCreatedScreen";
import RideRequestedScreen from "./screens/RideRequestedScreen";
import BookingScreen from "./screens/BookingScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="BookingScreen">
        <Stack.Screen
          name="BookingScreen"
          component={BookingScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
