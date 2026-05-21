import "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppShell from "../components/AppShell";
import { AuthGateProvider } from "../contexts/AuthGate";
import { ErrorProvider } from "../contexts/ErrorContext";
import { LocationProvider } from "../contexts/location-context";
import { ApiProvider } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";

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
    <SafeAreaProvider style={styles.root}>
      <GestureHandlerRootView style={styles.root}>
        {/* StatusBar matches the lime canvas the home sheet sits on —
            previously hardcoded to `#A8D8A8`, a mint that drifted from
            the brand and read as a different app behind the system
            chrome on Android. `barStyle="dark-content"` keeps icons
            readable on the lime fill. */}
        <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
        <ErrorProvider>
          <ApiProvider>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
});
