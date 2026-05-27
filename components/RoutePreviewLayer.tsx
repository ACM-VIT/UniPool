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
import { useThemeColors } from "../contexts/ThemeContext";

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
  // Optional summary fields. The tooltip stacked above the pickup
  // pin renders these inline so the user can size up a ride
  // without opening anything. Earlier this info lived in a big
  // bottom card that covered ~40% of the map; the tooltip is the
  // map-native replacement.
  start_time?: string;
  total_price?: number;
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
const MIN_LINE_DELTA = 0.000001;

const sameLngLat = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) < MIN_LINE_DELTA &&
  Math.abs(a[1] - b[1]) < MIN_LINE_DELTA;

const isValidLngLat = (coord: [number, number]) =>
  Number.isFinite(coord[0]) &&
  Number.isFinite(coord[1]) &&
  coord[0] >= -180 &&
  coord[0] <= 180 &&
  coord[1] >= -90 &&
  coord[1] <= 90;

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

// Trip distances we surface only need to read at a glance — under
// 10km we keep one decimal ("4.3 km"), 10-1000km rounds to a whole
// number ("280 km"), beyond 1000km we collapse to a "1.4k km"
// shorthand to keep the chevron label compact. Real UniPool rides
// don't cross the 1000km bar but the format stays sane if someone
// posts a Vellore → Delhi run.
const formatDistance = (km: number): string => {
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${(km / 1000).toFixed(1)}k km`;
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
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.32] });

  // Inner chevron icon rotates to match the bearing toward the
  // destination. RN rotates clockwise for positive degrees but our
  // `angle` is a standard math angle (CCW positive), so negate.
  // Crucially we DON'T rotate the whole pill — that would make the
  // text upside down for west-facing destinations. Only the
  // directional glyph rotates; the typography stays level.
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
    </Animated.View>
  );
};

/**
 * Source breath — a continuous lime halo expanding out from the
 * pickup coordinate while a preview is active. Tells the eye "this
 * is where you are leaving from" without competing with the
 * destination's single-shot arrival pulse. Rendered as a stacked
 * pair of rings firing slightly out of phase so the breath reads
 * as alive rather than mechanical.
 */
const SourceBreath: React.FC = () => {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    const la = loop(a, 0);
    const lb = loop(b, 800);
    la.start();
    lb.start();
    return () => {
      la.stop();
      lb.stop();
    };
  }, [a, b]);

  const aScale = a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] });
  const aOpacity = a.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0.15, 0] });
  const bScale = b.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] });
  const bOpacity = b.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0.15, 0] });

  return (
    <View style={styles.sourceWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.sourceRing,
          { opacity: aOpacity, transform: [{ scale: aScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.sourceRing,
          { opacity: bOpacity, transform: [{ scale: bScale }] },
        ]}
      />
      <View style={styles.sourceCore} />
    </View>
  );
};

/**
 * Destination terminus — small lime-ringed forest dot rendered when
 * the destination IS on the visible map (no clip). Fades + scales in
 * with a tiny arrival-pulse the moment the dotted line reaches it,
 * so the eye sees the dots literally landing somewhere instead of
 * the line just ending in space.
 */
const DestinationDot: React.FC<{ visible: boolean }> = ({ visible }) => {
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      reveal.setValue(0);
      pulse.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [reveal, pulse, visible]);

  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const opacity = reveal;
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Animated.View
      style={[styles.destWrap, { opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.destRing,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <View style={styles.destOuter}>
        <View style={styles.destInner} />
      </View>
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
  const colors = useThemeColors();
  const [progress, setProgress] = useState(0);
  // After the draw-in completes, a slow line-width pulse runs
  // forever so the dots feel alive rather than freezing in place.
  // Driven by a sine wave over time — much cheaper than animating
  // the dasharray (which would force a per-frame paint object diff
  // on MapLibre's bridge).
  const [pulsePhase, setPulsePhase] = useState(0);

  // (Re)start the animation whenever the previewed ride changes.
  useEffect(() => {
    if (!ride) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const DURATION = 1100;
    const startTs = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startTs;
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

  // Slow living-breath on the line width once the dots have landed.
  // 2.4s period, ~6% amplitude — visible if you watch, invisible if
  // you don't. ~12fps is enough since the change is small and the
  // human eye can't catch sub-pixel width oscillation any faster.
  useEffect(() => {
    if (!ride || progress < 0.97) return;
    const tStart = Date.now();
    const id = setInterval(() => {
      const phase = ((Date.now() - tStart) / 2400) * Math.PI * 2;
      setPulsePhase(Math.sin(phase));
    }, 80);
    return () => clearInterval(id);
  }, [ride?.id, progress >= 0.97]);

  // Endpoint of the currently-visible segment of the dotted line.
  // When the destination is on-screen this is just the destination at
  // progress=1; when off-screen it's the clipped point on the
  // viewport edge.
  const segment = useMemo(() => {
    if (!ride) return null;
    const start: [number, number] = [ride.start_longitude, ride.start_latitude];
    const dest: [number, number] = [ride.end_longitude, ride.end_latitude];
    if (!isValidLngLat(start) || !isValidLngLat(dest)) return null;
    const clip = bounds ? clipSegmentToBounds(start, dest, bounds) : null;
    const endpoint = clip ? ([clip.lng, clip.lat] as [number, number]) : dest;
    return { start, dest, endpoint, clip };
  }, [ride, bounds]);

  // The dotted GeoJSON line — start to (interpolated) endpoint.
  const lineData = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!segment) return null;
    const tip = lerp(segment.start, segment.endpoint, progress);
    if (
      !isValidLngLat(segment.start) ||
      !isValidLngLat(tip) ||
      sameLngLat(segment.start, tip)
    ) {
      return null;
    }
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

  if (!ride || !segment) return null;

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
      {lineData && (
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
              // Forest dots on the light map; off-white dots on the
              // dark map. Forest disappears into the dark tile set,
              // so swap to cream-on-charcoal so the dotted route
              // reads cleanly against either canvas. The lime halo
              // above stays in both modes — it's the brand accent.
              "line-color": colors.mode === "dark"
                ? AppColors.basicWhite
                : AppColors.secondaryDarkGreen,
              // Round dots with breathing room. The dasharray is in
              // line-widths, so [0.4, 1.8] reads as "tiny dot then a
              // gap nearly twice the line width". With line-cap round
              // the 0.4-unit dash renders as a near-circular dot.
              "line-dasharray": [0.4, 1.8],
              // Subtle living-breath on the line width — ~6%
              // oscillation around the resting value once the dots
              // have landed, zero during the draw-in (additive offset
              // is 0 while pulsePhase is at its 0-init value). Keeps
              // the line from feeling frozen without crossing into
              // "needy" territory.
              "line-width": 4 + pulsePhase * 0.24,
              "line-opacity": 0.95,
            }}
          />
        </GeoJSONSource>
      )}

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

      {/* On-screen destination terminus — same arrival cue but on
          the visible part of the map. Without this the dotted line
          would just end mid-tile and the eye loses the destination.
          Marker is non-interactive (pointerEvents=none on its
          contents) because the floating card already provides the
          "open this ride" affordance. */}
      {!segment.clip && (
        <MapLibreMarker
          lngLat={segment.dest}
          anchor="center"
        >
          <DestinationDot visible={progress >= 0.94} />
        </MapLibreMarker>
      )}

      {/* Source breath — continuous halo at the pickup coord. The
          summary card lives in a sibling sheet outside the
          MapLibre tree (see HomeScreen → RoutePreviewCard), so
          this marker only carries the pin-level visual cue. */}
      <MapLibreMarker
        lngLat={segment.start}
        anchor="center"
      >
        <SourceBreath />
      </MapLibreMarker>
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
  // ---------------------------------------------------------------
  // Destination terminus (on-screen case)
  // ---------------------------------------------------------------
  destWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // Outward-expanding lime ring — the "arrival pulse" that fires
  // once when the line lands. Single-shot, not a continuous loop;
  // continuous pulses on a static destination would compete with
  // the source-pickup breath and become visual noise.
  destRing: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  destOuter: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: AppColors.primaryLightGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  destInner: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },

  // ---------------------------------------------------------------
  // Source breath
  // ---------------------------------------------------------------
  sourceWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  // A tiny forest dot at the centre of the breath keeps the breath
  // visually anchored to a definite point even at small sizes,
  // matching the way Find My / Maps pulse over a known location.
  sourceCore: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderWidth: 1.5,
    borderColor: AppColors.primaryLightGreen,
  },
});

export default RoutePreviewLayer;
