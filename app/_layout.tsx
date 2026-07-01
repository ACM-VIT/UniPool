import "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { Platform, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Head from "expo-router/head";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppShell from "../components/AppShell";
import { AuthGateProvider } from "../contexts/AuthGate";
import { ErrorProvider } from "../contexts/ErrorContext";
import { LocationProvider } from "../contexts/location-context";
import { UserProvider } from "../contexts/UserContext";
import { ThemeProvider, useThemeColors } from "../contexts/ThemeContext";
import { ApiProvider } from "../utils/ApiUtil";
import { isNotificationForActiveChat } from "../utils/activeChatRegistry";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Suppress the banner / sound when the incoming push targets the
    // chat the user is already looking at — the message already
    // animated into their open conversation, a system banner on top
    // is duplicative noise. The backend filters these out via
    // WebSocket presence too; this is the belt-and-suspenders for
    // the race where the FCM lands faster than the socket join (or
    // a stale notification was queued before the user opened the
    // chat). The push is still recorded in the OS list so the user
    // can scroll back through their notification history.
    const data = (notification.request.content.data ?? {}) as Record<string, unknown>;
    if (isNotificationForActiveChat(data)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
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

// Inner shell sits BELOW ThemeProvider so it can read the active
// palette and tint the root canvas + StatusBar accordingly. Keeps the
// theme-aware chrome in one place — every screen below paints into
// the canvas this layer establishes.
const ThemedRoot: React.FC = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* StatusBar mirrors the active theme. Light mode: lime canvas
          + dark icons. Dark mode: deep forest canvas + light icons.
          Re-renders on theme toggle without a remount. */}
      <StatusBar
        backgroundColor={colors.statusBarBackground}
        barStyle={colors.statusBarStyle}
      />
      <AppShell />
    </View>
  );
};

// Web document head (title, theme colour, share meta). Injected at runtime via
// expo-router/head — the supported path for output:"single", where the static
// `app/+html.tsx` shell is NOT applied. Gated to web so native screen titles
// are untouched. The favicon is handled by `web.favicon` in app.json.
const WebHead: React.FC = () => {
  if (Platform.OS !== "web") return null;
  return (
    <Head>
      <title>UniPool</title>
      <meta
        name="description"
        content="UniPool is a campus carpool app built by students, for students. Find a verified ride, share the trip, split the cost."
      />
      <meta name="theme-color" content="#B5D750" />
      <meta name="color-scheme" content="light" />
      <meta name="apple-mobile-web-app-title" content="UniPool" />
      <meta property="og:title" content="UniPool" />
      <meta
        property="og:description"
        content="Verified student-only rides. Find a seat, split the cost, get home safe."
      />
      <meta property="og:type" content="website" />
    </Head>
  );
};

export default function RootLayout() {
  return (
    <>
      <WebHead />
      <SafeAreaProvider style={styles.root}>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider>
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
                    <ThemedRoot />
                  </LocationProvider>
                </UserProvider>
              </AuthGateProvider>
            </ApiProvider>
          </ErrorProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
