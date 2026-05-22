import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Path as SvgPath } from "react-native-svg";
import {
  Map as MapLibreMap,
  Camera,
  Marker as MapLibreMarker,
  GeoJSONSource,
  Layer as MapLibreLayer,
} from "@maplibre/maplibre-react-native";
import AppColors from "../design_systems/colors";

// `TripPreviewMap` — modular, non-interactive map that shows the
// route between two coordinates (A→B). Lifted out of HomeScreen's
// MapLibre composition + the duplicated react-native-maps blocks
// that used to live inside RideDetailsScreen and
// AvailableRideScreenSelected. Both of those screens rendered the
// same three things: a small black "start" dot with a halo, a black
// navigation arrow at the destination, and a dashed red line
// connecting them — with the camera framed to a midpoint with ~30%
// padding. This component owns that recipe so the two callers (and
// any future trip-card surface) get the same visual + same MapLibre
// tile stack as the rest of the app.

type Coord = { latitude: number; longitude: number };

type Props = {
  start: Coord;
  end: Coord;
  /**
   * Optional intermediate waypoints for the route polyline. If
   * omitted, the line is a straight A→B segment. The caller can
   * compute a smoother path (e.g. via `generateRouteCoordinates`)
   * and pass it here.
   */
  routePoints?: Coord[];
  /** Style override for the map's wrapping View. */
  style?: StyleProp<ViewStyle>;
};

// Same tile stack as HomeScreen — OpenFreeMap's donation-funded
// liberty style. Single source of truth for the brand's map look:
// when we switch tile providers, we change it in one place.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// `latitudeDelta` (visible degrees) → MapLibre zoom level. Halves
// per zoom step. Empirically aligned with the HomeScreen translator.
const deltaToZoom = (latitudeDelta: number) =>
  Math.max(1, Math.min(20, Math.log2(360 / Math.max(latitudeDelta, 0.0001))));

// Build the GeoJSON line feature MapLibre's LineLayer wants. We can't
// pass an inline `coordinates` array like react-native-maps' Polyline.
const buildLineString = (
  pts: Coord[],
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: pts.map((p) => [p.longitude, p.latitude]),
  },
});

const TripPreviewMap: React.FC<Props> = ({ start, end, routePoints, style }) => {
  // Frame the map at the midpoint of A and B, with a ~30% horizontal
  // padding via the × 1.6 multiplier. The 0.04 floor stops a 1 km
  // hop from rendering as a pinhole. Mirrors the math the old
  // react-native-maps `initialRegion` was doing on both screens.
  const center: [number, number] = useMemo(
    () => [
      (start.longitude + end.longitude) / 2,
      (start.latitude + end.latitude) / 2,
    ],
    [start.longitude, end.longitude, start.latitude, end.latitude],
  );
  const zoom = useMemo(() => {
    const latSpan = Math.max(Math.abs(end.latitude - start.latitude) * 1.6, 0.04);
    return deltaToZoom(latSpan);
  }, [start.latitude, end.latitude]);

  const lineData = useMemo(
    () => buildLineString(routePoints && routePoints.length > 1 ? routePoints : [start, end]),
    [routePoints, start, end],
  );

  return (
    // `pointerEvents="none"` on the wrapper makes the entire map
    // preview non-interactive: the tiles render and animate, but
    // taps, pans, pinches, and rotations pass through to whatever
    // scroll container sits beneath. MapLibre RN doesn't expose
    // gesture-toggle props the way `react-native-maps` did, so this
    // is the cleanest way to lock the preview into "thumbnail" mode
    // without forking MapLibre's API.
    <View style={[styles.mapWrap, style]} pointerEvents="none">
      <MapLibreMap
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        // MapLibre ornaments off — same posture as HomeScreen. The
        // surrounding card carries its own context (start / end
        // labels, time, fare), so the map doesn't need a compass,
        // scale bar, or attribution chip fighting the brand canvas.
        logo={false}
        attribution={false}
        compass={false}
        scaleBar={false}
        accessibilityLabel="Trip route preview"
        accessibilityHint="Static map showing the pickup and drop-off points for this trip."
      >
        <Camera initialViewState={{ center, zoom }} />

        {/* Start — small black dot in a white halo. Reads cleanly
            against any tile colour the map style happens to produce. */}
        <MapLibreMarker
          lngLat={[start.longitude, start.latitude]}
          anchor="center"
        >
          <View style={styles.startDot}>
            <View style={styles.startDotInner} />
          </View>
        </MapLibreMarker>

        {/* End — classic drop-pin teardrop. The earlier glyph was a
            diagonal navigation arrow whose tip sat at the top-RIGHT
            of its bounding box, which doesn't line up with any of
            MapLibre's pre-defined anchor positions ("center" / "top"
            / "bottom" / corners). With `anchor="bottom"` the arrow's
            BASE was landing on the destination, leaving the tip
            floating above the dashed-red line and a visible gap
            where the route ended.
            The pin's tip is now drawn at the exact bottom-center of
            a 20×26 viewBox (x = 10, y = 26), so `anchor="bottom"`
            lands the tip ON the destination coord and the line
            ending meets the pin cleanly. */}
        <MapLibreMarker
          lngLat={[end.longitude, end.latitude]}
          anchor="bottom"
        >
          <View style={styles.endPinWrap}>
            <Svg width={20} height={26} viewBox="0 0 20 26" fill="none">
              <SvgPath
                d="M10 26 C 10 26, 1 17, 1 9 C 1 4, 5 1, 10 1 C 15 1, 19 4, 19 9 C 19 17, 10 26, 10 26 Z"
                fill={AppColors.basicBlack}
                stroke={AppColors.basicWhite}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
              {/* Small white dot inside the bulge — the standard
                  "drop pin" idiom (Google Maps, Apple Maps). Lifts
                  the silhouette and gives the pin its own visual
                  centre. */}
              <SvgPath
                d="M10 6.5 a 2.6 2.6 0 1 0 0.001 0 Z"
                fill={AppColors.basicWhite}
              />
            </Svg>
          </View>
        </MapLibreMarker>

        {/* Route line — dashed red. `line-dasharray` in MapLibre is
            measured in line-width multiples, not pixels, so 3.6 px
            line × [2.2, 1.7] ≈ the old [8, 6] pixel pattern. */}
        <GeoJSONSource id="trip-preview-route" data={lineData}>
          <MapLibreLayer
            id="trip-preview-line"
            type="line"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": "#E5453B",
              "line-width": 3.6,
              "line-dasharray": [2.2, 1.7],
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
    minHeight: 200,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  startDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.basicWhite,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  startDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.basicBlack,
  },
  endPinWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default TripPreviewMap;
