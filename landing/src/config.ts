// Runtime configuration, driven by Vite env vars (VITE_*) with safe
// production defaults so the site works even without a .env file.
//
// None of these are secrets — they're public hosts the browser talks
// to directly — so committing the defaults is fine and keeps the build
// reproducible.

// Public API host. Same backend the mobile app talks to. Despite the
// "unidev" name this is the Cloudflare-proxied production VM
// (165.22.218.217), matching config/urlconfig.ts in the app.
export const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "https://unidev.acmvit.in";

// Canonical host for the main app + where ride share links resolve.
// Ride cards on the satellite domains link to `${SHARE_HOST}/r/:id`,
// which serves the boarding-pass SharePage.
export const SHARE_HOST =
  import.meta.env.VITE_SHARE_HOST?.replace(/\/$/, "") || "https://unipool.in";

// Store + download links.
export const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL || "https://apps.apple.com/app/id6756426249";
export const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.carpoolitapp&hl=en_IN";

// The functional web app — where people find and post rides in the
// browser (the expo react-native-web build). Mounted under /app on this
// same Pages project, so it shares the origin with the marketing site
// (one Google OAuth origin per domain, no subdomain sprawl). Relative so
// it resolves on whatever domain the page is served from; overridable
// via env if it ever moves.
export const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || "/app";

// Canonical download landing (platform-aware redirect lives there).
export const DOWNLOAD_URL = `${SHARE_HOST}/download`;

// Ride share link for a given ride id.
export function rideLink(id: string): string {
  return `${SHARE_HOST}/r/${id}`;
}

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ reports a Mac UA; treat touch-Macs as iOS so they get
  // the App Store, not the desktop web app.
  if (/Mac/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1) {
    return "ios";
  }
  return "desktop";
}

// Store URL for the visitor's platform (Play Store for desktop as a
// neutral default, since desktop CTAs usually route to the web app).
export function storeUrlForPlatform(): string {
  return detectPlatform() === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
}

// Custom scheme the native app registers (app.json `scheme`). Ride links
// (/r/:id) are universal links the OS routes to the app on their own; this
// scheme is for the generic "open the app" CTAs, which would otherwise
// dead-end at the store even when the app is installed.
export const APP_SCHEME = import.meta.env.VITE_APP_SCHEME || "unipool://";

// Open the installed native app; fall back to the store if it isn't there.
// Desktop can't run the native app, so it opens the web app instead. If
// the app opens, the tab is backgrounded (visibility/pagehide) and we
// cancel the store fallback so the user isn't bounced afterwards.
export function openInApp(appPath = ""): void {
  if (typeof window === "undefined") return;
  if (detectPlatform() === "desktop") {
    window.location.href = WEBAPP_URL;
    return;
  }
  const store = storeUrlForPlatform();
  const deepLink = APP_SCHEME + appPath.replace(/^\/+/, "");
  let settled = false;
  const finish = () => {
    settled = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", finish);
  };
  const onVis = () => {
    if (document.visibilityState === "hidden") finish();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", finish);
  const timer = setTimeout(() => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", finish);
    if (!settled) window.location.href = store;
  }, 1400);
  window.location.href = deepLink;
}

// Props for an <a> that opens the app (JS) but keeps a sensible no-JS
// fallback in `href` (store on mobile, web app on desktop). The param is
// typed loosely so it accepts a React synthetic event without importing
// React into this module.
export function appLinkProps(appPath = ""): {
  href: string;
  onClick: (e: { preventDefault: () => void }) => void;
} {
  const href = detectPlatform() === "desktop" ? WEBAPP_URL : storeUrlForPlatform();
  return {
    href,
    onClick: (e) => {
      e.preventDefault();
      openInApp(appPath);
    },
  };
}
