const DEFAULT_SHARE_HOST = "https://unipool.in";
const DEFAULT_DOWNLOAD_URL = "https://unipool.download";

/** Canonical public host for ride share URLs. */
export const SHARE_HOST = (
  process.env.EXPO_PUBLIC_SHARE_HOST || DEFAULT_SHARE_HOST
).replace(/\/$/, "");

/** Platform-aware download landing for first-time recipients. */
export const DOWNLOAD_URL = (
  process.env.EXPO_PUBLIC_DOWNLOAD_URL || DEFAULT_DOWNLOAD_URL
).replace(/\/$/, "");

export function rideShareUrl(rideId: string): string {
  return `${SHARE_HOST}/ride/${rideId}`;
}
