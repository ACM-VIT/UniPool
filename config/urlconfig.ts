import Constants from "expo-constants";
import { Platform } from "react-native";

// Backend host. PROD_URL points at the Cloudflare-proxied dev VM
// (Ubuntu @ 165.22.218.217, nginx → :3000 Fiber). Release builds
// always go through this; debug builds fall back to localhost
// detection so a local Go server is still usable.
const PROD_URL = "https://unidev.acmvit.in";

const resolveLocalHost = () => {
  if (Platform.OS === "android") return "10.0.2.2";
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as any)?.debuggerHost ||
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost") return host;
  }
  return "localhost";
};

const LOCAL_URL = `http://${resolveLocalHost()}:3000`;

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

const baseURL = fromEnv || (__DEV__ ? LOCAL_URL : PROD_URL);

export default baseURL;