import "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppShell from "../components/AppShell";
import { AuthGateProvider } from "../contexts/AuthGate";
import { ErrorProvider } from "../contexts/ErrorContext";
import { LocationProvider } from "../contexts/location-context";
import { navigationRef } from "../navigation/navigationRef";
import { ApiProvider } from "../utils/ApiUtil";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar backgroundColor="#A8D8A8" barStyle="dark-content" />
        <ErrorProvider navigationRef={navigationRef}>
          <ApiProvider navigationRef={navigationRef}>
            <AuthGateProvider>
              <LocationProvider>
                <AppShell />
              </LocationProvider>
            </AuthGateProvider>
          </ApiProvider>
        </ErrorProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
