// Web shim for expo-notifications.
//
// expo-notifications targets iOS and Android only. On web every method
// resolves to a safe default so the shared app code runs without
// platform branches. Real web push (FCM web + a service worker + a VAPID
// key) is deliberately not implemented here; it is a separate, additive
// piece of work. Listeners return a no-op subscription so cleanup calls
// (sub.remove()) stay valid.
type Subscription = { remove: () => void };
const noopSubscription: Subscription = { remove() {} };

export const AndroidImportance = { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 } as const;
export const AndroidNotificationPriority = {
  MIN: "min",
  LOW: "low",
  DEFAULT: "default",
  HIGH: "high",
  MAX: "max",
} as const;

export function setNotificationHandler(_handler?: unknown): void {}

export async function setNotificationChannelAsync(_id: string, _channel: unknown) {
  return null;
}

export async function getPermissionsAsync() {
  return { status: "undetermined", granted: false, canAskAgain: true, expires: "never" } as const;
}

export async function requestPermissionsAsync() {
  return { status: "denied", granted: false, canAskAgain: false, expires: "never" } as const;
}

export async function getDevicePushTokenAsync(): Promise<{ data: string; type: string }> {
  throw new Error("Device push tokens are not available on web");
}

export async function getExpoPushTokenAsync(): Promise<{ data: string; type: string }> {
  throw new Error("Expo push tokens are not available on web");
}

export function addNotificationReceivedListener(_listener?: unknown): Subscription {
  return noopSubscription;
}

export function addNotificationResponseReceivedListener(_listener?: unknown): Subscription {
  return noopSubscription;
}

export async function getLastNotificationResponseAsync() {
  return null;
}

export async function setBadgeCountAsync(_count: number) {
  return true;
}

export default {
  AndroidImportance,
  AndroidNotificationPriority,
  setNotificationHandler,
  setNotificationChannelAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  getDevicePushTokenAsync,
  getExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  setBadgeCountAsync,
};
