import "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { StatusBar, StyleSheet, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppShell from "../components/AppShell";
import { AuthGateProvider } from "../contexts/AuthGate";
import { ErrorProvider } from "../contexts/ErrorContext";
import { LocationProvider } from "../contexts/location-context";
import { UserProvider } from "../contexts/UserContext";
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

// Global Dynamic Type cap. Apple's Accessibility reviewer (and the
// App Store rating it influences) wants apps to honour the user's
// Larger Text setting — but the brand layout was designed for a
// single text scale, so unbounded growth blows out pin chips, sheet
// titles, and the cluster badge above the map. 1.3× lets the largest
// "Larger Text" sliders nudge typography up without breaking the
// painted UI. Done globally instead of prop-by-prop because there are
// hundreds of <Text> sites and we want this to be the default
// posture, not something every screen has to remember.
//
// `Text.defaultProps` is still supported on React Native 0.85 (the
// React Core deprecation only applies to user components). We assign
// the prop on the root layout import so it's present before any
// screen renders.
const textWithDefaults = Text as typeof Text & { defaultProps?: Record<string, unknown> };
textWithDefaults.defaultProps = textWithDefaults.defaultProps || {};
textWithDefaults.defaultProps.maxFontSizeMultiplier = 1.3;
const inputWithDefaults = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };
inputWithDefaults.defaultProps = inputWithDefaults.defaultProps || {};
inputWithDefaults.defaultProps.maxFontSizeMultiplier = 1.3;

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
              {/* `UserProvider` hydrates `/user/details` ONCE per
                  auth-state change and exposes the result via
                  `useUser()`. Sits inside AuthGate so it can react
                  to sign-in / sign-out, and inside Api so it has the
                  apiUtil to make the call. Migrated callers read
                  from context (sync); the ones that genuinely need
                  fresh data after a write call `refresh()`. */}
              <UserProvider>
                <LocationProvider>
                  <AppShell />
                </LocationProvider>
              </UserProvider>
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
