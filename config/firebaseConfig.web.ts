// Firebase web SDK config for the UniPool web build.
//
// This is the registered Firebase "Web app" config (project acm-carpoolit)
// from the Firebase console. On native, react-native-firebase reads
// google-services.json / GoogleService-Info.plist automatically; the web
// SDK has no such file, so we pass the config object explicitly here.
//
// Values come from EXPO_PUBLIC_* env vars (see .env.example) so the
// apiKey is not committed to git. The web apiKey + appId are Web-app
// credentials (distinct from the Android/iOS keys) — required for the
// signInWithPopup / signInWithRedirect OAuth flow to work in the browser.

function requiredEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set the Firebase web config values.`
    );
  }
  return trimmed;
}

export const firebaseConfig = {
  // Expo web only inlines EXPO_PUBLIC_* values when they are referenced
  // with dot notation. Do not switch these back to dynamic process.env[name].
  apiKey: requiredEnv("EXPO_PUBLIC_FIREBASE_API_KEY", process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  projectId: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  ),
  storageBucket: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: requiredEnv("EXPO_PUBLIC_FIREBASE_APP_ID", process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};
