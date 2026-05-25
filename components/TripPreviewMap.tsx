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
const MIN_LINE_DELTA = 0.000001;

const isValidCoord = (coord: Coord) =>
  Number.isFinite(coord.latitude) &&
  Number.isFinite(coord.longitude) &&
  coord.latitude >= -90 &&
  coord.latitude <= 90 &&
  coord.longitude >= -180 &&
  coord.longitude <= 180;

const sameLngLat = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) < MIN_LINE_DELTA &&
  Math.abs(a[1] - b[1]) < MIN_LINE_DELTA;

// Build the GeoJSON line feature MapLibre's LineLayer wants. We can't
// pass an inline `coordinates` array like react-native-maps' Polyline.
const buildLineString = (
  pts: Coord[],
): GeoJSON.Feature<GeoJSON.LineString> | null => {
  const coordinates = pts
    .filter(isValidCoord)
    .map((p): [number, number] => [p.longitude, p.latitude])
    .filter((point, index, points) => index === 0 || !sameLngLat(point, points[index - 1]));

  if (coordinates.length < 2) return null;

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
};

const TripPreviewMap: React.FC<Props> = ({ start, end, routePoints, style }) => {
  // Frame the route via `bounds` instead of a single center+zoom so
  // MapLibre handles aspect-ratio padding for us. The earlier
  // center+zoom impl computed zoom off latitudinal span only, which
  // silently clipped mostly-east-west routes (e.g. Vellore →
  // Bangalore: lat delta ~0.005°, lon delta ~1.57° — the lat-only
  // zoom landed straight on the pickup and shoved the destination
  // pin off the right edge of the container). Even after switching
  // to max(lat, lon), a tall-narrow or short-wide container would
  // park a pin flush against the bottom edge of the map view, which
  // visually butted up against whatever sat below the map (the
  // RideDetails card, the booking sheet) and read as "the pin is
  // on the card."
  //
  // `bounds` with explicit pixel padding fixes both: MapLibre
  // computes the right zoom for the container's actual dimensions
  // and leaves at least PADDING px of map tile between each pin and
  // every edge.
  // LngLatBounds in MapLibre RN v11 is a flat tuple
  // [west, south, east, north] — not the {ne, sw} object shape the
  // older react-native-maps API used. Padding is a sibling field on
  // CameraOptions and applies in screen-space pixels, so the pins
  // get a real cushion against every container edge regardless of
  // map aspect ratio.
  const initialViewState = useMemo(() => {
    const minLat = Math.min(start.latitude, end.latitude);
    const maxLat = Math.max(start.latitude, end.latitude);
    const minLng = Math.min(start.longitude, end.longitude);
    const maxLng = Math.max(start.longitude, end.longitude);
    return {
      bounds: [minLng, minLat, maxLng, maxLat] as [number, number, number, number],
      // Top a touch tighter than bottom — the start dot's halo is
      // smaller than the end pin's tear-drop, which would otherwise
      // look top-heavy in symmetric padding.
      padding: {
        top: 36,
        bottom: 56,
        left: 40,
        right: 40,
      },
    };
  }, [start.latitude, end.latitude, start.longitude, end.longitude]);

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
        {/* initialViewState anchors the framing on first mount and
            then steps out — the preview is static (wrapper pins
            pointerEvents="none"), so we don't need a `bounds`
            controlled-mode prop fighting the same memo on every
            re-render. */}
        <Camera initialViewState={initialViewState} />

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
        {lineData && (
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
        )}
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
