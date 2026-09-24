import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

const appEntry = (await readdir(resolve(appDist, "_expo/static/js/web"))).find((file) =>
  /^entry-[a-f0-9]+\.js$/.test(file)
);

if (appEntry) {
  const entryPath = resolve(appDist, "_expo/static/js/web", appEntry);
  const version = createHash("sha256").update(await readFile(entryPath)).digest("hex").slice(0, 16);
  const originalSrc = `/app/_expo/static/js/web/${appEntry}`;
  const versionedSrc = `${originalSrc}?v=${version}`;

  async function rewriteHtml(dir) {
    const entries = await readdir(dir);
    await Promise.all(
      entries.map(async (entry) => {
        const filePath = resolve(dir, entry);
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          await rewriteHtml(filePath);
          return;
        }
        if (!["index.html", "_index.html", "_index"].includes(entry)) {
          return;
        }
        const html = await readFile(filePath, "utf8");
        if (html.includes(originalSrc) && !html.includes(versionedSrc)) {
          await writeFile(filePath, html.split(originalSrc).join(versionedSrc));
        }
      })
    );
  }

  await rewriteHtml(appDist);
}
