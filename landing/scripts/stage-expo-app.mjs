import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const expoDist = resolve(root, "../dist-web");
const appDist = resolve(root, "dist/app");
const appRoutes = [
  "account-settings",
  "bookings",
  "chat",
  "personal-information",
  "post",
  "profile",
  "search",
  "sign-in",
  "trips",
  "welcome",
  "AccountSettingsScreen",
  "AuthScreen",
  "AvailableRidesScreen",
  "AvailableRidesSelectedScreen",
  "BookingScreen",
  "BookingsScreen",
  "ChatMessages",
  "CreateRide",
  "DefaultAddressScreen",
  "ErrorScreen",
  "HomeScreen",
  "LocationPermissionScreen",
  "NearbyRidesScreen",
  "NotificationsScreen",
  "OnboardingScreen",
  "PassengerInfoScreen",
  "PassengersHistoryScreen",
  "PersonalInformationScreen",
  "PostTripRatingScreen",
  "PrivacyPolicyScreen",
  "ProfileScreen",
  "RideCreatedScreen",
  "RideDetailsScreen",
  "RideRequestedScreen",
  "SignInScreen",
  "SignUpScreen",
  "SplashScreen",
  "TermsOfServiceScreen",
  "TripHistoryScreen",
  "TripsListScreen",
  "verify",
];

await rm(appDist, { recursive: true, force: true });
await mkdir(resolve(root, "dist"), { recursive: true });
await cp(expoDist, appDist, { recursive: true });

// Cloudflare Pages can normalize /index.html rewrite targets before applying
// the next rule. Keep a non-index alias for the app SPA fallback.
await cp(resolve(appDist, "index.html"), resolve(appDist, "_index.html"));
await cp(resolve(appDist, "index.html"), resolve(appDist, "_index"));

await Promise.all(
  appRoutes.map(async (route) => {
    const routeDir = resolve(appDist, route);
    await mkdir(routeDir, { recursive: true });
    await cp(resolve(appDist, "index.html"), resolve(routeDir, "index.html"));
  }),
);
