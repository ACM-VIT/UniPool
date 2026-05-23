import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
// MapLibre splits its modules; we only need the children that render
// INSIDE a <MapLibreMap>: a GeoJSON source + a line layer for the
// route, and a Marker for the off-screen chevron.
import {
  GeoJSONSource,
  Layer as MapLibreLayer,
  Marker as MapLibreMarker,
} from "@maplibre/maplibre-react-native";
import AppColors from "../design_systems/colors";

/**
 * Coords for a single ride preview. Kept open-typed because callers
 * mostly hand us their existing ride / cluster shapes — we only need
 * the four geo fields and a stable id for the animation key.
 */
export type RoutePreviewRide = {
  id: string | number;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  end_location: string;
};

/** Bounds as [west, south, east, north], the shape MapLibre returns
 *  from `getBounds()` once you flatten its LngLatBounds. Passed in by
 *  the parent so this layer doesn't have to call into the map ref. */
export type RoutePreviewBounds = readonly [number, number, number, number] | null;

type Props = {
  ride: RoutePreviewRide | null;
  /** Live viewport bounds. Re-supplied by the parent on every
   *  onRegionDidChange. Null while the map hasn't reported one yet. */
  bounds: RoutePreviewBounds;
  /** Fires when the user taps the off-screen destination chevron —
   *  the canonical "open this ride" action when the destination
   *  isn't on the visible map. */
  onTapDestination?: () => void;
};

// --- geometry -------------------------------------------------------

// Linear interpolation between two lng/lat pairs. Good enough for the
// "actively dotting toward the destination" preview because UniPool's
// rides are short-haul and the great-circle correction would be
// invisible at typical zooms. (For continent-spanning routes we'd
// want a real geodesic; for VIT→Bangalore at z=11 the straight line
// reads identically.)
const lerp = (
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

// Haversine distance in km between two lng/lat pairs. The chevron
// label says "→ Bangalore · 280km" — this is the 280.
const haversineKm = (
  a: [number, number],
  b: [number, number],
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const formatDistance = (km: number): string => {
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${(km / 1000).toFixed(1)}× 1000km`;
};

/**
 * Clip the segment `start → end` against the viewport rectangle.
 * Returns the point where the segment exits the rectangle plus the
 * angle (in radians) of the segment at that point. If the end point
 * is already inside, returns null (no clipping needed).
 *
 * The viewport rectangle is shrunk by `insetFrac` on each side so the
 * chevron sits ~inset away from the literal edge — gives the marker
 * room to draw its label without being clipped by the status bar /
 * nav bar overlays.
 */
const clipSegmentToBounds = (
  start: [number, number],
  end: [number, number],
  bounds: readonly [number, number, number, number],
  insetFrac = 0.08,
): { lng: number; lat: number; angle: number } | null => {
  const [west, south, east, north] = bounds;
  const lngSpan = east - west;
  const latSpan = north - south;
  const w = west + lngSpan * insetFrac;
  const e = east - lngSpan * insetFrac;
  const s = south + latSpan * insetFrac;
  const n = north - latSpan * insetFrac;

  // If endpoint is inside the inset rect, no clip needed.
  if (end[0] >= w && end[0] <= e && end[1] >= s && end[1] <= n) {
    return null;
  }

  // Liang-Barsky-ish parametric clip. We want the largest `t` in
  // [0, 1] such that start + t*(end-start) is still inside the rect.
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  let tMax = 1;

  const clip = (p: number, q: number) => {
    if (p === 0) {
      // Parallel to this edge. Inside only if q >= 0.
      if (q < 0) tMax = -1;
      return;
    }
    const r = q / p;
    if (p > 0) {
      // Leaving this edge.
      if (r < tMax) tMax = r;
    } else {
      // Entering. Only matters if the entry is BEFORE start, which
      // would mean start itself is outside the rect on this side —
      // a case we don't expect (start is the pickup near the user)
      // but handle gracefully by aborting.
      if (r > 0) tMax = -1;
    }
  };

  clip(-dx, start[0] - w); // left
  clip(dx, e - start[0]); // right
  clip(-dy, start[1] - s); // bottom
  clip(dy, n - start[1]); // top

  if (tMax <= 0 || tMax > 1) return null;

  const cx = start[0] + dx * tMax;
  const cy = start[1] + dy * tMax;
  // Angle of the segment AT the clip point, in screen-friendly terms.
  // atan2(dLat, dLng) — note that on screen, +lat goes UP but our
  // chevron rotation expects +y down. We negate dy when computing the
  // CSS-style angle so the chevron points toward the off-screen
  // destination correctly.
  const angle = Math.atan2(-dy, dx);
  return { lng: cx, lat: cy, angle };
};

// --- chevron glyph --------------------------------------------------

/**
 * Forest chevron pointing along `angle` (radians). Rendered inside a
 * lime-bordered forest pill that hosts the city name + distance to the
 * destination — same chip language as the regular ride pins so the
 * map reads as one design system.
 */
const DestinationChevron: React.FC<{
  angle: number;
  label: string;
  distance: string;
  visible: boolean;
}> = ({ angle, label, distance, visible }) => {
  // Fade + tiny scale-in once the dotted line has reached the edge.
  // Independent Animated.Value (not driven by progress) so the
  // chevron snaps in after a short delay rather than fading along
  // with the line.
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      reveal.setValue(0);
      return;
    }
    Animated.timing(reveal, {
      toValue: 1,
      duration: 240,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal, visible]);

  // Subtle continuous breath so the off-screen marker stays alive in
  // the user's peripheral vision. Starts only after the reveal.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const handle = setTimeout(() => loop.start(), 440);
    return () => {
      clearTimeout(handle);
      loop.stop();
    };
  }, [pulse, visible]);

  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const opacity = reveal;
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  // The chevron SVG is drawn pointing RIGHT (positive x). We rotate
  // the icon wrapper to align with the segment angle. RN rotates
  // clockwise for positive degrees, but our `angle` is a standard
  // math angle (CCW positive). Negate to convert.
  const rotateDeg = (-angle * 180) / Math.PI;

  return (
    <Animated.View
      style={[styles.chevronWrap, { opacity, transform: [{ scale }] }]}
      pointerEvents="auto"
    >
      <View style={styles.chevronPill}>
        <Animated.View
          style={[
            styles.chevronPillHalo,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
        <View style={[styles.chevronIcon, { transform: [{ rotate: `${rotateDeg}deg` }] }]}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M5 12 H 17 M 13 7 L 18 12 L 13 17"
              stroke={AppColors.primaryLightGreen}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
        <View style={styles.chevronLabelCol}>
          <Text style={styles.chevronLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.chevronDistance}>{distance}</Text>
        </View>
      </View>
      <View style={styles.chevronTail} />
    </Animated.View>
  );
};

// --- main layer -----------------------------------------------------

/**
 * Renders the animated dotted route + the off-screen destination
 * chevron inside a <MapLibreMap>. Lives as a child of the Map (not as
 * a screen-space overlay) so the line scales naturally with zoom and
 * the chevron stays anchored to a real lng/lat at the viewport edge.
 *
 * Animation: a single requestAnimationFrame loop ramps a `progress`
 * value 0→1 over 1100ms with ease-out cubic. On every tick we recompute
 * the line's endpoint (linear interpolation toward the destination)
 * and feed the new GeoJSON to MapLibre. At z=11 over India this lands
 * around 60fps; the GeoJSONSource diff is small enough that updating
 * the `data` prop every frame doesn't tax the bridge.
 */
const RoutePreviewLayer: React.FC<Props> = ({ ride, bounds, onTapDestination }) => {
  const [progress, setProgress] = useState(0);

  // (Re)start the animation whenever the previewed ride changes.
  useEffect(() => {
    if (!ride) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const DURATION = 1100;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / DURATION);
      // Cubic ease-out — feels like the line decelerates as it
      // reaches the destination, the same easing Apple Maps uses
      // when its directions polyline draws in.
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ride?.id]);

  // Endpoint of the currently-visible segment of the dotted line.
  // When the destination is on-screen this is just the destination at
  // progress=1; when off-screen it's the clipped point on the
  // viewport edge.
  const segment = useMemo(() => {
    if (!ride) return null;
    const start: [number, number] = [ride.start_longitude, ride.start_latitude];
    const dest: [number, number] = [ride.end_longitude, ride.end_latitude];
    const clip = bounds ? clipSegmentToBounds(start, dest, bounds) : null;
    const endpoint = clip ? ([clip.lng, clip.lat] as [number, number]) : dest;
    return { start, dest, endpoint, clip };
  }, [ride, bounds]);

  // The dotted GeoJSON line — start to (interpolated) endpoint.
  const lineData = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!segment) return null;
    const tip = lerp(segment.start, segment.endpoint, progress);
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [segment.start, tip],
          },
        },
      ],
    };
  }, [segment, progress]);

  if (!ride || !segment || !lineData) return null;

  // City label: short form of the end_location, comma-stripped.
  const cityLabel = (() => {
    const first = (ride.end_location.split(",")[0] || "").trim();
    return first.length > 14 ? first.slice(0, 13).trimEnd() + "…" : first;
  })();

  const distLabel = formatDistance(haversineKm(segment.start, segment.dest));

  // Chevron shows up once the line has reached its tip (progress ~1)
  // — slightly before to feel responsive, so the eye sees the dots
  // arriving at the same beat the chevron pops in.
  const chevronVisible = progress >= 0.94 && segment.clip !== null;

  return (
    <>
      <GeoJSONSource id="route-preview-source" data={lineData}>
        {/* Soft halo underneath the dots so they read on lime / cream
            land tiles AND on the river / water tiles MapLibre demotiles
            paint blue. Same trick Apple Maps uses on its directions
            line. */}
        <MapLibreLayer
          id="route-preview-halo"
          type="line"
          // `line-cap` and `line-join` are layout-class properties in
          // the MapLibre style spec; the typed paint props block them.
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": AppColors.primaryLightGreen,
            "line-width": 8,
            "line-opacity": 0.55,
            "line-blur": 4,
          }}
        />
        <MapLibreLayer
          id="route-preview-line"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": AppColors.secondaryDarkGreen,
            // Round dots with breathing room. The dasharray is in
            // line-widths, so [0.4, 1.8] reads as "tiny dot then a
            // gap nearly twice the line width". With line-cap round
            // the 0.4-unit dash renders as a near-circular dot.
            "line-dasharray": [0.4, 1.8],
            "line-width": 4,
            "line-opacity": 0.95,
          }}
        />
      </GeoJSONSource>

      {/* Off-screen chevron — only rendered once we know the
          destination falls outside the viewport. Lives at a real
          lng/lat (the clip point on the viewport edge) so MapLibre
          handles the screen positioning + keeps it pinned during
          panning. */}
      {segment.clip && (
        <MapLibreMarker
          lngLat={[segment.clip.lng, segment.clip.lat]}
          anchor="center"
          onPress={onTapDestination}
        >
          <DestinationChevron
            angle={segment.clip.angle}
            label={cityLabel}
            distance={distLabel}
            visible={chevronVisible}
          />
        </MapLibreMarker>
      )}
    </>
  );
};

// --- styles ---------------------------------------------------------

const styles = StyleSheet.create({
  chevronWrap: {
    alignItems: "center",
  },
  chevronPill: {
    // Forest pill matching the ride pin language. The lime border
    // gives a subtle two-tone outline on busy tiles.
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1.5,
    borderColor: AppColors.primaryLightGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  chevronPillHalo: {
    // Lime breathing ring behind the pill — only visible while the
    // breath animation is at peak; gives a calm "look here" cue
    // without resorting to a hard wiggle.
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  chevronIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronLabelCol: {
    alignItems: "flex-start",
  },
  chevronLabel: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12.5,
    letterSpacing: -0.1,
    lineHeight: 14,
  },
  chevronDistance: {
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.1,
    lineHeight: 12,
    marginTop: 1,
  },
  // Down-pointing tail mirrors the ride pin tail so the chevron lands
  // visually on the edge intersection point rather than floating
  // above it.
  chevronTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: AppColors.secondaryDarkGreen,
  },
});

export default RoutePreviewLayer;
