// Metro config.
//
// The app is a single Expo codebase that also targets web. A handful of
// native-only packages have no web build (they would crash the web
// bundle at import time). For the web platform only, we redirect those
// imports to local web shims in web-shims/, so the 30+ screens that
// import them can stay completely unchanged. Native (iOS/Android) builds
// resolve the real packages exactly as before.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const WEB_ALIASES = {
  "@react-native-firebase/auth": path.resolve(__dirname, "web-shims/firebase-auth.ts"),
  "@react-native-firebase/app": path.resolve(__dirname, "web-shims/firebase-app.ts"),
  "@react-native-google-signin/google-signin": path.resolve(__dirname, "web-shims/google-signin.ts"),
  "expo-notifications": path.resolve(__dirname, "web-shims/expo-notifications.ts"),
  "expo-haptics": path.resolve(__dirname, "web-shims/expo-haptics.ts"),
  "expo-apple-authentication": path.resolve(__dirname, "web-shims/expo-apple-authentication.ts"),
  "@maplibre/maplibre-react-native": path.resolve(__dirname, "web-shims/maplibre.web.tsx"),
  // lottie-react-native's web build pulls in @lottiefiles/dotlottie-react;
  // we render the JSON animations with lottie-web instead.
  "lottie-react-native": path.resolve(__dirname, "web-shims/lottie.web.tsx"),
  // Side-effect-only import: native polyfill for localStorage. The
  // browser already has localStorage, so resolve to an empty module.
  "expo-sqlite/localStorage/install": path.resolve(__dirname, "web-shims/noop.ts"),
};

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && Object.prototype.hasOwnProperty.call(WEB_ALIASES, moduleName)) {
    return context.resolveRequest(context, WEB_ALIASES[moduleName], platform);
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
