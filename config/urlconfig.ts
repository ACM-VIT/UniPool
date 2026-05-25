// Backend host. This points at the Cloudflare-proxied dev VM
// (Ubuntu @ 165.22.218.217, nginx -> :3000 Fiber). Override with
// EXPO_PUBLIC_API_BASE_URL when you need to hit a different backend.
const PROD_URL = "https://unidev.acmvit.in";
const LOCAL_URL = "http://localhost:3000";

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

const baseURL = fromEnv || (__DEV__ ? LOCAL_URL : PROD_URL);

export default baseURL;