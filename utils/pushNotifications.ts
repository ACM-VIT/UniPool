import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

/**
 * Prompts for push-notification permission (if not already granted) and
 * registers the device token with the backend. Called at moments where
 * notifications are *actually useful* — e.g. requesting a ride, posting
 * one — so the user understands why the app is asking.
 *
 * Crucially this is NOT called at app startup; the dedicated AppShell
 * bootstrap path only registers a token if permission was granted in a
 * prior session, never prompting fresh.
 *
 * Side effects:
 *   - shows the native iOS / Android permission dialog (if undetermined)
 *   - sets up the Android notification channel
 *   - POSTs the device token to `/users/me/token`
 *
 * Safe to call repeatedly: if already granted + registered the backend
 * just receives a no-op update. Errors are logged but never thrown — a
 * failing notification setup must never block the calling user flow
 * (e.g. don't let a backend hiccup stop a ride request from going
 * through).
 *
 * @param apiUtil  authenticated ApiUtil instance from useApi()
 * @returns        the device push token, or null if anything bailed
 */
export async function ensurePushNotificationsRegistered(
  apiUtil: { post: (path: string, body: unknown) => Promise<unknown> },
): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }

    if (final !== "granted") {
      // User declined — that's fine; the calling flow proceeds without
      // push delivery. They'll still see in-app updates.
      return null;
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    try {
      await apiUtil.post("/users/me/token", { token });
    } catch (e) {
      console.warn("Push token POST failed (continuing anyway)", e);
    }
    return token;
  } catch (e) {
    console.warn("ensurePushNotificationsRegistered failed", e);
    return null;
  }
}
