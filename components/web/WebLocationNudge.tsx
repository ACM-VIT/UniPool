// Minimal, sticky location toast for the web home.
//
// The native app uses a full LocationPermissionScreen; on the web that reads
// as a blocking wall. Instead we show a small bottom-left toast that asks for
// location only on a click (browsers grant geolocation far more reliably from
// a gesture than an unprompted on-load call) and stays entirely optional —
// rides still load from a campus fallback center.
//
// It must stay glued to the bottom of the VIEWPORT while the page scrolls. RNW
// wraps the app in transformed ancestors, and a CSS `transform` makes
// `position: fixed` resolve against that ancestor instead of the viewport — so
// the toast would otherwise get "stuck" mid-page. We portal it straight into
// document.body to escape those transforms and pin it to the viewport. It
// stays put until the user allows or dismisses it (× → don't ask again).
import React, { useEffect, useState } from "react";
import { Text, Pressable, View, StyleSheet, useWindowDimensions } from "react-native";
// react-dom ships no bundled types in this project (no @types/react-dom);
// createPortal is the only thing we use and its signature is stable.
// @ts-ignore
import { createPortal } from "react-dom";
import Svg, { Path, Circle } from "react-native-svg";
import { WEB, RADIUS, FONT, floatShadow } from "./theme";

const KEY = "unipool-web-loc-nudge";

type Props = { onAllow: (center: [number, number]) => void };

const WebLocationNudge: React.FC<Props> = ({ onAllow }) => {
  const { width } = useWindowDimensions();
  const narrow = width < 720;
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    try {
      if (localStorage.getItem(KEY) === "dismissed") return;
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        if (navigator.permissions) {
          const p = await navigator.permissions.query({ name: "geolocation" as any });
          if (p.state === "granted") return; // already have it — no nudge
        }
      } catch {}
      if (!cancelled) setTimeout(() => { if (!cancelled) setShow(true); }, 1400);
    })();
    return () => { cancelled = true; };
  }, []);

  // Gentle fade-in (a browser-driven CSS transition, robust regardless of rAF).
  useEffect(() => {
    if (!show) { setMounted(false); return; }
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [show]);

  const dismiss = () => {
    try { localStorage.setItem(KEY, "dismissed"); } catch {}
    setShow(false);
  };

  const allow = () => {
    if (!navigator.geolocation) return dismiss();
    navigator.geolocation.getCurrentPosition(
      (pos) => { onAllow([pos.coords.longitude, pos.coords.latitude]); dismiss(); },
      () => dismiss(),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!show || typeof document === "undefined") return null;

  const toast = (
    <View
      style={[
        styles.wrap,
        narrow && styles.wrapNarrow,
        { opacity: mounted ? 1 : 0, transitionProperty: "opacity", transitionDuration: "220ms" } as any,
      ]}
    >
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" fill="none" stroke={WEB.lime} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx="12" cy="10" r="2.4" fill={WEB.lime} />
      </Svg>
      <Text style={[styles.label, narrow && styles.labelNarrow]} numberOfLines={1}>See rides near you</Text>
      <Pressable onPress={allow} style={({ hovered }: any) => [styles.allow, hovered && styles.allowHover]}>
        <Text style={styles.allowText}>Allow</Text>
      </Pressable>
      <Pressable onPress={dismiss} style={styles.close} accessibilityLabel="Dismiss">
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
          <Path d="M6 6 L18 18 M18 6 L6 18" stroke={WEB.onForestMuted} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </View>
  );

  // Portal to body so `position: fixed` pins to the viewport, not a transformed
  // ancestor — keeps it stuck to the bottom of the screen as the page scrolls.
  return createPortal(toast, document.body);
};

export default WebLocationNudge;

const styles = StyleSheet.create({
  wrap: {
    position: "fixed" as any,
    left: 24,
    bottom: 24,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WEB.forest,
    borderRadius: RADIUS.pill,
    paddingLeft: 16,
    paddingRight: 7,
    paddingVertical: 7,
    ...floatShadow,
  },
  // Full-width along the bottom on phones; the label flexes so the actions
  // sit at the right edge.
  wrapNarrow: { left: 12, right: 12, bottom: 12 },
  label: { fontFamily: FONT.bold, fontSize: 14, color: WEB.cream, marginRight: 4 },
  labelNarrow: { flex: 1 },
  allow: { backgroundColor: WEB.lime, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 7 },
  allowHover: { backgroundColor: "#C2E15C" },
  allowText: { fontFamily: FONT.black, fontSize: 13, color: WEB.forest },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
