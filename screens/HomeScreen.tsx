import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions, Platform, PixelRatio, PanResponder, Animated, Easing, ScrollView, InteractionManager, AppState, useWindowDimensions } from "react-native";
import { TABLET_BREAKPOINT } from "../utils/responsive";
import navigationImg from "../assets/navigation.png";
import locationPinImg from "../assets/location-pin-2.png";
// MapLibre replaces react-native-maps. We control tiles via a style
// URL (currently OpenFreeMap's `liberty` — donation-funded, no API
// key, see MAP_STYLE_URL note below) and draw shapes via GeoJSON
// sources + style-spec layers instead of imperative
// `<Marker>`/`<Polyline>`/`<Circle>` children. Marker is preserved
// for custom-view pins (our forest chip cluster pin).
import {
  Map as MapLibreMap,
  Camera,
  Marker as MapLibreMarker,
  GeoJSONSource,
  Layer as MapLibreLayer,
  UserLocation,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import AppColors from "../design_systems/colors";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import ActiveTripCard from "../components/ActiveTripCard";
import SheetShell from "../components/SheetShell";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../components/MainNavBar";
import bottomNavItems from "../data/BottomNavigationItems";
import BrandInfo from "../components/BrandInfo";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/PressableScale";
import RideClusterSheet, { ClusteredRide } from "../components/RideClusterSheet";
import { getAppState } from "../utils/AppStateService";
import type { AppStateResponse, NearbyRideSummary } from "../utils/AppStateService";

const { width: rawScreenWidth, height: rawScreenHeight } = Dimensions.get("window");

// Tablet branch only: phones keep their real window dimensions so
// `normalize` and `responsiveWidth`/`responsiveHeight` scale naturally
// across the iPhone family. On tablets we substitute a fixed iPhone
// 14/15 reference (390×844) so the same helpers compute phone-tuned
// values instead of inflating every font and padding ~2.75x to fill
// a 1032pt canvas. Absolute-positioned containers like the map can
// still read the real iPad dimensions via `rawScreenWidth`/Height.
const isTabletScreen = rawScreenWidth >= 768;
const screenWidth = isTabletScreen ? 390 : rawScreenWidth;
const screenHeight = isTabletScreen ? 844 : rawScreenHeight;

const normalize = (size: number) => {
  const scale = screenWidth / 375;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

const responsiveHeight = (percentage: number) => {
  return (screenHeight * percentage) / 100;
};

const responsiveWidth = (percentage: number) => {
  return (screenWidth * percentage) / 100;
};

const COORDINATE_EPSILON = 0.000001;
const MAP_CAMERA_ANIMATION_MS = 280;

const areCoordsEqual = (a: LocationCoords | null, b: LocationCoords | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < COORDINATE_EPSILON &&
    Math.abs(a.longitude - b.longitude) < COORDINATE_EPSILON
  );
};

// Hard cap for the physical sheet surface. The expanded snap is still
// measured from content; this only gives dense signed-in layouts enough
// room on shorter Android screens without forcing short guest content up.
const SHEET_MAP_RESERVE = Math.max(112, screenHeight * 0.16);
const BOTTOM_SHEET_MAX_HEIGHT = Math.min(screenHeight * 0.88, screenHeight - SHEET_MAP_RESERVE);
const BOTTOM_SHEET_MIN_HEIGHT = Math.max(screenHeight * 0.32, 220);
const SHEET_BOTTOM_BREATHING_ROOM = MAIN_NAV_BAR_TOP_OFFSET + 28;
const heightToSheetOffset = (height: number) => BOTTOM_SHEET_MAX_HEIGHT - height;
const sheetOffsetToHeight = (offset: number) => BOTTOM_SHEET_MAX_HEIGHT - offset;

interface LocationCoords {
  latitude: number;
  longitude: number;
}

const DRAG_THRESHOLD = 10;

// Sensible fallback map center used until the user's real coords land.
// Picked to sit in the middle of our seeded ride catalogue (VIT Vellore /
// Tamil Nadu / Bengaluru corridor) so the map looks like "a real place"
// rather than a generic country-wide view while location is fetching.
// Without this the map gate blocked the MapView entirely on cold start,
// leaving an unbranded lime void where the map should be.
const FALLBACK_REGION = {
  latitude: 12.9698,   // VIT Vellore
  longitude: 79.1559,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// OpenFreeMap — donation-funded, OSM-based, no API key, no usage caps.
// `liberty` is the well-rounded default (streets, POI icons, place
// labels at every zoom). Other styles available on the same host if
// we ever want to switch the look: `positron` (light/minimal — closer
// to the old Google Maps "#f8f8f8" palette), `bright`, `dark`.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// MapLibre uses [longitude, latitude] tuples and a single `zoom`
// level instead of react-native-maps' `{latitude, longitude,
// latitudeDelta, longitudeDelta}`. We translate by approximating
// zoom from `latitudeDelta` (which is "visible degrees latitude" —
// halves with each zoom step). Empirically:
//   delta 0.06 (city)        → zoom ~12.5
//   delta 0.045 (neighborhood)→ zoom ~13
//   delta 0.02 (street)      → zoom ~14
const deltaToZoom = (latitudeDelta: number) =>
  Math.max(1, Math.min(20, Math.log2(360 / Math.max(latitudeDelta, 0.0001))));

const regionToCenter = (region: {
  latitude: number;
  longitude: number;
}): [number, number] => [region.longitude, region.latitude];

/**
 * Build a GeoJSON polygon approximating a circle of `radiusMeters`
 * around `(lat, lng)`. MapLibre's circle *layer* draws a screen-space
 * circle (radius scales with zoom in pixels, not real-world metres),
 * which is wrong for our "5 km service area" visual — so we use a
 * polygon ring instead. 64 vertices is smooth enough at any zoom
 * level we'd ever show.
 */
const buildCirclePolygon = (
  lat: number,
  lng: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const coords: [number, number][] = [];
  // Convert radius (m) to degrees. 1 deg latitude ≈ 111_320 m. Longitude
  // shrinks with latitude (* cos(lat)). Plenty accurate at this scale.
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([
      lng + dLng * Math.cos(theta),
      lat + dLat * Math.sin(theta),
    ]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
};

/**
 * Build a GeoJSON LineString from an array of {latitude, longitude}
 * waypoints. MapLibre's LineLayer is fed via a GeoJSONSource, not
 * an inline `coordinates` prop.
 */
const buildLineString = (
  pts: { latitude: number; longitude: number }[],
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: pts.map((p) => [p.longitude, p.latitude]),
  },
});

/**
 * Compute a bounding box `[west, south, east, north]` from a set of
 * waypoints. Used to drive Camera.fitBounds the same way
 * react-native-maps' fitToCoordinates did.
 */
const coordsToBounds = (
  pts: { latitude: number; longitude: number }[],
): [number, number, number, number] => {
  let minLng = pts[0].longitude;
  let maxLng = pts[0].longitude;
  let minLat = pts[0].latitude;
  let maxLat = pts[0].latitude;
  for (const p of pts) {
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
  }
  return [minLng, minLat, maxLng, maxLat];
};

// Short, comma-stripped, ellipsized destination label for pin badges.
// Pulled out of the marker render so the rotating-pin component below
// can use the same shortening.
const shortenDestination = (s: string) => {
  const first = (s.split(",")[0] || "").trim();
  return first.length > 16 ? first.slice(0, 15).trimEnd() + "…" : first;
};

type NearbyClusterShape = {
  key: string;
  latitude: number;
  longitude: number;
  rides: Array<{ end_location: string; total_price: number }>;
  cheapest: { end_location: string; total_price: number };
};

/**
 * ClusterMarker — Cash App / Uber / Airbnb cluster pattern.
 *
 * Replaces the earlier rotating-destination idea, which broke down
 * the moment you had more than 3-4 rides at one coord — cycling
 * through a dozen labels every 2.5s read as broken, not informative.
 *
 * Now:
 *   - Single ride at a coord → static chip showing the destination
 *     (e.g. "Katpadi Junction"). Tap = open that ride.
 *   - Multi-ride cluster (likely "VIT Vellore", "MG Road" etc. with
 *     N students all departing from the same building) → static
 *     count badge ("12 rides"). Tap = open a bottom sheet listing
 *     every ride leaving from that point so the user can pick.
 *
 * No more animation, no more tracksViewChanges churn, and zero
 * confusion when the campus inevitably has 50 rides leaving from
 * the same gate.
 */
const ClusterMarker: React.FC<{
  cluster: NearbyClusterShape;
  onPress: () => void;
}> = ({ cluster, onPress }) => {
  const count = cluster.rides.length;
  const isMulti = count > 1;
  const label = isMulti
    ? `${count} rides`
    : shortenDestination(cluster.cheapest.end_location);

  return (
    <MapLibreMarker
      lngLat={[cluster.longitude, cluster.latitude]}
      onPress={onPress}
      // Anchor the chip's bottom (the lime dot) at the geo coordinate,
      // same as the old `{x:0.5, y:1}` Marker anchor.
      anchor="bottom"
    >
      <View style={styles.pinWrap}>
        <View style={styles.pinBadge}>
          <Text style={styles.pinBadgeText}>{label}</Text>
        </View>
        <View style={styles.pinTail} />
        <View style={styles.pinDot} />
      </View>
    </MapLibreMarker>
  );
};

interface HomeScreenProps {
  setNavBarVariant: (variant: 0 | 1 | 2) => void;
  setNavBarText: (text: string) => void;
  setNavBarIcon: (icon: any) => void;
  setNavBarItems: (items: any[]) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const router = useRouter();
  // Live window dimensions so iPad rotation reflows the layout
  // without a remount. The module-level `screenWidth`/`screenHeight`
  // constants stay where they are because the phone-only math
  // upstream of this component depends on them being snapshot at
  // module load time; this hook only feeds the iPad branch below.
  const { width: liveWidth } = useWindowDimensions();
  const isTablet = liveWidth >= TABLET_BREAKPOINT;
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil, revalidate } = useApi();
  const { requireAuth, isGuest } = useAuthGate();
  const mapRef = useRef<MapRef>(null);
  // MapLibre splits ref surfaces: the Map ref exposes geometry
  // queries (project/unproject/getCenter); the Camera ref drives
  // imperative camera moves (fitBounds/easeTo/jumpTo). The old
  // react-native-maps MapView did both — we need both refs.
  const cameraRef = useRef<CameraRef>(null);

  const [location, setLocation] = useState<LocationCoords | null>(null);
  // Cluster sheet state — populated when the user taps a multi-ride
  // cluster pin (Cash App / Uber style). `null` when closed.
  const [clusterSheet, setClusterSheet] = useState<{
    pickup: string;
    rides: ClusteredRide[];
  } | null>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [allFieldsSelected, setAllFieldsSelected] = useState(false);
  // Counter that, when bumped, makes RideDetailsSelector wipe its
  // From / To fields. Driven by the Search Rides X button via the
  // `window.mainNavBarOnClose` global (set up next to
  // `mainNavBarOnPress` in the variant-1 effect below).
  const [clearRideTrigger, setClearRideTrigger] = useState(0);
  // Set by `PreviousTripsSection` when its API resolves. Drives the
  // "Your trips ↔ Rides around you" mutual exclusion on the home
  // sheet.
  //
  // Tri-state on purpose:
  //   `null`  → trips API hasn't resolved yet (signed-in users).
  //             Render NEITHER tile so we don't paint "Rides around
  //             you" only to yank it away half a second later when
  //             trips land.
  //   `true`  → user has trips. Show "Your trips", hide nearby tile.
  //   `false` → user has no trips. Show nearby tile.
  // Guests skip this state machine entirely — they always see the
  // nearby tile.
  const [hasUserTrips, setHasUserTrips] = useState<boolean | null>(null);
  // True while ActiveTripCard is rendering a real card. Used to hide
  // the upcoming-trips carousel — when the active card is up, it's
  // the user's headline trip and the carousel below it is just noise.
  const [hasActiveTripCard, setHasActiveTripCard] = useState(false);
  // When the trip card is showing, the home sheet gets dense and the
  // From / To / Date selector pushes everything else below the fold.
  // We collapse the inline selector to a single "Where'd you like to
  // go?" pill in that case; tapping it opens this sheet where the
  // full RideDetailsSelector lives. Submit closes the sheet and
  // fires the same handleRideSubmit path the inline form does.
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  } | null>(null);

  // Nearby ride summaries used to plot pins on the map.
  type NearbyRide = NearbyRideSummary;
  const [nearbyRides, setNearbyRides] = useState<NearbyRide[]>([]);
  const [appState, setAppState] = useState<AppStateResponse | null>(null);
  const [appStateResolved, setAppStateResolved] = useState(false);
  // Map cover fade — opaque lime over the MapView until tiles are
  // ready (`onMapReady`), at which point we fade it out over ~360ms.
  // Without this the user sees a hard black flash for ~1-2s while the
  // native MapView surfaces wait for their first tile render.
  const mapCoverOpacity = useRef(new Animated.Value(1)).current;
  const [mapTilesReady, setMapTilesReady] = useState(false);

  // Cluster rides by start location (rounded to ~10m) so multiple
  // rides leaving the same pickup point collapse to a single pin
  // instead of stacking on top of each other. The pin's onPress
  // routes to the cheapest ride in that cluster — fine as a first
  // pass; later we can show a sheet listing all rides in the cluster.
  const clusteredNearbyRides = React.useMemo(() => {
    const byKey = new Map<
      string,
      {
        key: string;
        latitude: number;
        longitude: number;
        rides: NearbyRide[];
        cheapest: NearbyRide;
        cheapestPrice: number;
      }
    >();
    for (const r of nearbyRides) {
      // 3 decimal places ≈ 110 m precision. Previously we used 4
      // decimals (~11 m), but in practice host-typed start coords for
      // the same campus / depot would drift by 20-50 m and end up as
      // distinct clusters, painting two pin pills directly on top of
      // each other (e.g. all "VIT Vellore" rides splitting into Q-block
      // and the main gate). 110 m groups all of those into one pin
      // while still keeping genuinely-different pickup points separate
      // (a street away ≈ 200 m+ stays its own cluster).
      const key = `${r.start_latitude.toFixed(3)},${r.start_longitude.toFixed(3)}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          latitude: r.start_latitude,
          longitude: r.start_longitude,
          rides: [r],
          cheapest: r,
          cheapestPrice: r.total_price,
        });
      } else {
        existing.rides.push(r);
        if (r.total_price < existing.cheapestPrice) {
          existing.cheapest = r;
          existing.cheapestPrice = r.total_price;
        }
      }
    }
    return Array.from(byKey.values());
  }, [nearbyRides]);

  const [fromCoords, setFromCoords] = useState<LocationCoords | null>(null);
  const [toCoords, setToCoords] = useState<LocationCoords | null>(null);
  const selectedCoordsRef = useRef<{ from: LocationCoords | null; to: LocationCoords | null }>({
    from: null,
    to: null,
  });
  const mapCameraTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const mapCameraFrameRef = useRef<number | null>(null);
  const rideSubmitGeocodeRequestRef = useRef(0);
  const homeStateFocusReloadReadyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    return () => {
      mapCameraTaskRef.current?.cancel?.();
      if (mapCameraFrameRef.current != null) {
        cancelAnimationFrame(mapCameraFrameRef.current);
      }
    };
  }, []);

  // The sheet keeps a fixed max height and moves with translateY.
  // Animating `height` during a drag forced a full layout pass through
  // the ScrollView every frame, which made the sheet stutter badly.
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetOffset = useRef(0);
  const dragStartOffset = useRef(0);

  // Measured natural height of the ScrollView's content container,
  // including the responsive bottom breathing room below the form.
  const [scrollContentHeight, setScrollContentHeight] = useState<number | null>(null);
  const onScrollContentSizeChange = useCallback((_w: number, h: number) => {
    if (!h || Number.isNaN(h)) return;
    setScrollContentHeight((prev) => (prev === h ? prev : h));
  }, []);

  const DRAG_HANDLE_RESERVED = 30;

  const userHasDragged = useRef(false);
  const hasAppliedInitialSize = useRef(false);

  const naturalRestHeight = useRef<number>(BOTTOM_SHEET_MIN_HEIGHT);
  const getExpandedSheetOffset = useCallback(
    () => heightToSheetOffset(naturalRestHeight.current),
    [],
  );
  const getCollapsedSheetOffset = useCallback(
    () => heightToSheetOffset(BOTTOM_SHEET_MIN_HEIGHT),
    [],
  );

  useEffect(() => {
    const listenerId = sheetTranslateY.addListener(({ value }) => {
      sheetOffset.current = value;
    });
    return () => {
      sheetTranslateY.removeListener(listenerId);
    };
  }, [sheetTranslateY]);

  useEffect(() => {
    if (scrollContentHeight == null) return;

    const desired = DRAG_HANDLE_RESERVED + scrollContentHeight;
    const target = Math.min(
      Math.max(desired, BOTTOM_SHEET_MIN_HEIGHT),
      BOTTOM_SHEET_MAX_HEIGHT,
    );
    naturalRestHeight.current = target;

    if (userHasDragged.current) return;

    const targetOffset = heightToSheetOffset(target);
    if (!hasAppliedInitialSize.current) {
      sheetTranslateY.setValue(targetOffset);
      hasAppliedInitialSize.current = true;
    } else {
      Animated.spring(sheetTranslateY, {
        toValue: targetOffset,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
    sheetOffset.current = targetOffset;
  }, [scrollContentHeight, sheetTranslateY]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateCurvedRoute = (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const numPoints = 15;
    const coordinates = [];
    
    const midLat = (startLat + endLat) / 2;
    const midLon = (startLon + endLon) / 2;
    
    const distance = calculateDistance(startLat, startLon, endLat, endLon);
    if (distance < 0.01) {
      return [
        { latitude: startLat, longitude: startLon },
        { latitude: endLat, longitude: endLon },
      ];
    }

    const arcHeight = distance * 0.15;
    
    const deltaLat = endLat - startLat;
    const deltaLon = endLon - startLon;
    const perpLat = -deltaLon * arcHeight / distance;
    const perpLon = deltaLat * arcHeight / distance;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      
      const curveFactor = 4 * t * (1 - t);
      
      const lat = startLat + t * deltaLat + curveFactor * perpLat;
      const lon = startLon + t * deltaLon + curveFactor * perpLon;
      
      coordinates.push({ latitude: lat, longitude: lon });
    }
    
    return coordinates;
  };

// NOTE: the old Google Maps `customMapStyle` JSON lived here. It is
// gone now that we render with MapLibre, which styles tiles via a
// full style.json (vector source + layer paint specs) instead of
// the Google Maps Styling Wizard schema. The custom palette ("#f8f8f8"
// geometries, "#273B33" labels, white roads with grey strokes) will
// move into a hand-rolled style.json once we pick a real tile
// provider — until then we ship MapLibre's free demotiles, which is
// good enough to evaluate the migration but not the final visual.


  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_evt, gestureState) =>
      Math.abs(gestureState.dy) > DRAG_THRESHOLD,
    onPanResponderGrant: () => {
      userHasDragged.current = true;
      dragStartOffset.current = sheetOffset.current;
      sheetTranslateY.stopAnimation((value) => {
        sheetOffset.current = value;
        dragStartOffset.current = value;
      });
    },
    onPanResponderMove: (_evt, gestureState) => {
      const rawOffset = dragStartOffset.current + gestureState.dy;
      const expandedOffset = getExpandedSheetOffset();
      const collapsedOffset = getCollapsedSheetOffset();
      const resistedOffset =
        rawOffset < expandedOffset
          ? Math.max(expandedOffset + (rawOffset - expandedOffset) * 0.3, expandedOffset - 50)
          : rawOffset > collapsedOffset
            ? Math.min(collapsedOffset + (rawOffset - collapsedOffset) * 0.3, collapsedOffset + 50)
            : rawOffset;

      sheetTranslateY.setValue(resistedOffset);
      sheetOffset.current = resistedOffset;
    },
    onPanResponderRelease: (_evt, gestureState) => {
      const expandedOffset = getExpandedSheetOffset();
      const collapsedOffset = getCollapsedSheetOffset();
      const currentOffset = Math.min(
        Math.max(sheetOffset.current, expandedOffset),
        collapsedOffset,
      );
      const currentHeight = sheetOffsetToHeight(currentOffset);
      const dynamicSnapPoints = Array.from(
        new Set([
          BOTTOM_SHEET_MIN_HEIGHT,
          naturalRestHeight.current,
        ]),
      ).sort((a, b) => a - b);

      let targetHeight = dynamicSnapPoints.reduce((prev, curr) =>
        Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev,
      );

      if (Math.abs(gestureState.vy) > 0.8) {
        targetHeight = gestureState.vy < 0 ? naturalRestHeight.current : BOTTOM_SHEET_MIN_HEIGHT;
      }

      // Light haptic when the sheet locks into a new snap point.
      // Only fires if we're actually settling somewhere different
      // from where the gesture started — quietly skips the no-op
      // case where the user dragged a tiny amount and bounced back.
      if (Math.abs(targetHeight - currentHeight) > 4) {
        haptic("light");
      }

      const targetOffset = heightToSheetOffset(targetHeight);
      Animated.spring(sheetTranslateY, {
        toValue: targetOffset,
        velocity: gestureState.vy,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }).start();
      sheetOffset.current = targetOffset;
    },
  }), [getCollapsedSheetOffset, getExpandedSheetOffset, sheetTranslateY]);

  const requestLocationPermission = async () => {
    // READ ONLY — never trigger the native iOS/Android prompt here.
    // The dedicated LocationPermissionScreen (with the radar
    // illustration + reasoning) is the single place allowed to call
    // `requestForegroundPermissionsAsync`. Every other screen reads
    // the current status and silently falls through if it isn't
    // already granted.
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      if (!hasPermission) setHasPermission(true);
      if (!location) await getUserLocation();
    } else {
      if (hasPermission) setHasPermission(false);
    }
  };

  const getUserLocation = async () => {
    if (location) return;

    const applyCoords = (latitude: number, longitude: number) => {
      setLocation({ latitude, longitude });
      const latitudeDelta = 0.02;
      const longitudeDelta = 0.02;
      const latOffset = latitudeDelta * 0.45;
      setInitialRegion({
        latitude: latitude - latOffset,
        longitude,
        latitudeDelta,
        longitudeDelta,
      });
    };

    // FAST PATH: last-known coords return synchronously from the cache
    // (no GPS fix needed). Lets the map snap to a real region within
    // ~50ms of permission granting instead of waiting on a fresh fix.
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) applyCoords(last.coords.latitude, last.coords.longitude);
    } catch (e) {
      console.warn("Last-known position lookup failed (continuing)", e);
    }

    // SLOW PATH: refine with a fresh fix. `Balanced` accuracy is more
    // than good enough for a 10 km radius search and is dramatically
    // faster on cold start than `High` (which waits for GPS lock).
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      applyCoords(coords.latitude, coords.longitude);
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const geocodeAddress = async (address: string): Promise<LocationCoords | null> => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results.length === 0) {
        console.warn(`No geocoding results for "${address}"`);
        return null;
      }
      const { latitude, longitude } = results[0];
      return { latitude, longitude };
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const fitMapToWaypoints = (from: LocationCoords, to: LocationCoords, userLoc: LocationCoords) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const bounds = coordsToBounds([from, to, userLoc]);
    camera.fitBounds(bounds, {
      padding: {
        top: screenHeight * 0.1,
        right: screenWidth * 0.1,
        bottom: screenHeight * 0.4,
        left: screenWidth * 0.1,
      },
      duration: MAP_CAMERA_ANIMATION_MS,
    });
  };

  useEffect(() => {
    requestLocationPermission();
    // Re-check on every return to foreground. Covers the case where
    // the user denied permission in the in-app prompt, then enabled
    // it later from system Settings — without this listener,
    // `hasPermission` and `location` stay at their initial state
    // forever, leaving the map empty and `/app/state` queried without
    // coords (so nearby pins never load).
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") requestLocationPermission();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHomeState = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const state = await getAppState(apiUtil, location);
      if (isCancelled()) return;
      setAppState(state);
      setAppStateResolved(true);
      if (state.home.nearby) {
        setNearbyRides(state.home.nearby.rides ?? []);
      }
    } catch (error) {
      if (!isCancelled()) {
        console.warn("[HomeScreen] app state unavailable", error);
        setAppStateResolved(true);
      }
    }
  }, [apiUtil, location]);

  useFocusEffect(
    useCallback(() => {
      if (!homeStateFocusReloadReadyRef.current) {
        homeStateFocusReloadReadyRef.current = true;
        return undefined;
      }

      let cancelled = false;
      void loadHomeState(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [loadHomeState]),
  );

  // One bootstrap read model replaces the former fan-out across
  // /user/rides, /trip-card/active, /user/pending-ratings, and
  // /rides/nearby. ApiUtil serves this from persistent cache first.
  useEffect(() => {
    let cancelled = false;
    void loadHomeState(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadHomeState]);

  useEffect(() => {
    if (!revalidate) return;
    void loadHomeState();
  }, [loadHomeState, revalidate]);

  // The post-trip rating BrandedAlert that used to fire here is
  // gone. It interrupted Home focus every time and gave no escape
  // valve short of completing the form, which made it feel like a
  // nag. The affordance now lives in context on each past-trip row
  // in the Trips tab (driven by the same /user/pending-ratings
  // payload), so a user can rate when they choose to instead of
  // being prompted out of whatever they were doing on Home.

  const runMapCameraUpdate = useCallback((from: LocationCoords | null, to: LocationCoords | null) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (from && to) {
      const padTop = screenHeight * 0.10;
      const padBottom = screenHeight * (BOTTOM_SHEET_MIN_HEIGHT / screenHeight + 0.04);
      const bounds = coordsToBounds([from, to]);
      camera.fitBounds(bounds, {
        padding: {
          top: padTop,
          bottom: padBottom,
          left: screenWidth * 0.16,
          right: screenWidth * 0.16,
        },
        duration: MAP_CAMERA_ANIMATION_MS,
      });
    } else if (from || to) {
      const pin = (from ?? to)!;
      camera.easeTo({
        center: [pin.longitude, pin.latitude],
        zoom: deltaToZoom(0.045),
        duration: MAP_CAMERA_ANIMATION_MS,
      });
    } else if (initialRegion) {
      camera.easeTo({
        center: regionToCenter(initialRegion),
        zoom: deltaToZoom(initialRegion.latitudeDelta),
        duration: MAP_CAMERA_ANIMATION_MS,
      });
    }
  }, [initialRegion]);

  const queueMapCameraUpdate = useCallback((from: LocationCoords | null, to: LocationCoords | null) => {
    mapCameraTaskRef.current?.cancel?.();
    if (mapCameraFrameRef.current != null) {
      cancelAnimationFrame(mapCameraFrameRef.current);
      mapCameraFrameRef.current = null;
    }

    mapCameraTaskRef.current = InteractionManager.runAfterInteractions(() => {
      mapCameraFrameRef.current = requestAnimationFrame(() => {
        mapCameraFrameRef.current = null;
        runMapCameraUpdate(from, to);
      });
    });
  }, [runMapCameraUpdate]);

  // Stable callback for RideDetailsSelector. The selector calls this
  // from an effect, so changing the function identity on every render
  // can retrigger native map camera work repeatedly.
  const handleCoordsChange = useCallback((
    from: LocationCoords | null,
    to: LocationCoords | null,
  ) => {
    const previous = selectedCoordsRef.current;
    const changed = !areCoordsEqual(previous.from, from) || !areCoordsEqual(previous.to, to);
    if (!changed) return;

    selectedCoordsRef.current = { from, to };
    setFromCoords((prev) => (areCoordsEqual(prev, from) ? prev : from));
    setToCoords((prev) => (areCoordsEqual(prev, to) ? prev : to));
    queueMapCameraUpdate(from, to);
  }, [queueMapCameraUpdate]);

  const handleRideSubmit = useCallback((details: {
    from: string;
    to: string;
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  }) => {
    setRideDetails(details);
    setAllFieldsSelected(true);
    
    if (!details.from || !details.to) return;

    let fromLocation = details.fromCoordinates;
    let toLocation = details.toCoordinates;

    if (fromLocation && toLocation) {
      handleCoordsChange(fromLocation, toLocation);
      return;
    }

    const requestId = ++rideSubmitGeocodeRequestRef.current;
    void Promise.all([
      !fromLocation ? geocodeAddress(details.from) : Promise.resolve(fromLocation),
      !toLocation ? geocodeAddress(details.to) : Promise.resolve(toLocation),
    ]).then(([geocodedFrom, geocodedTo]) => {
      if (requestId !== rideSubmitGeocodeRequestRef.current) return;
      fromLocation = geocodedFrom || undefined;
      toLocation = geocodedTo || undefined;
      if (fromLocation && toLocation) {
        handleCoordsChange(fromLocation, toLocation);
      }
    });
  }, [handleCoordsChange]);

  // Don't change this code, state mgmt is crucial here
  useEffect(() => {
    if (!isFocused) return;
    if (allFieldsSelected && rideDetails) {
      setNavBarVariant(1);
      setNavBarText("Search Rides");
      setNavBarIcon(require("../assets/cool-emoji.png"));
      setNavBarItems(bottomNavItems);
      (window as any).mainNavBarOnPress = () => {
        if (!rideDetails) return;
        const params = {
          fromLocation: rideDetails.from,
          toLocation: rideDetails.to,
          fromCoordinates: rideDetails.fromCoordinates,
          toCoordinates: rideDetails.toCoordinates,
        };
        // Browsing rides is free; booking inside RideDetails will gate the user.
        router.navigate(appHref("AvailableRidesScreen", params));
      };
      // Close X on the Search Rides bar — wipes From / To selection.
      // The RideDetailsSelector's clearTrigger effect handles the
      // actual state reset; `handleLocationSelectionChange(false)`
      // then cascades through to flip the nav bar back to variant 0.
      (window as any).mainNavBarOnClose = () => {
        setClearRideTrigger((n) => n + 1);
      };
    } else {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
      (window as any).mainNavBarOnPress = undefined;
      (window as any).mainNavBarOnClose = undefined;
    }
  }, [
    isFocused,
    allFieldsSelected,
    setNavBarVariant,
    setNavBarText,
    setNavBarIcon,
    setNavBarItems,
    rideDetails,
    router,
  ]);

  const handleLocationSelectionChange = useCallback((hasFromAndTo: boolean) => {
    setBothLocationsSelected(hasFromAndTo);

    if (!hasFromAndTo) {
      setAllFieldsSelected(false);
      setRideDetails(null);
      // Note: fromCoords / toCoords are now driven by handleCoordsChange,
      // which also resets the camera when both pins are cleared.
    }
  }, []);

  const routePolylineCoordinates = React.useMemo(() => {
    if (!fromCoords || !toCoords) return [];
    return generateCurvedRoute(fromCoords.latitude, fromCoords.longitude, toCoords.latitude, toCoords.longitude);
  }, [fromCoords, toCoords]);

  // Render the map as soon as the screen is focused — don't wait for
  // location to arrive. Previously this gate required all three of
  // (hasPermission, location, initialRegion) to be true, which meant
  // a slow GPS fix (cold start, indoors, etc.) left users staring at
  // the lime background for 10-20s and assuming the map was broken.
  // Now: we always mount the MapView and pass a sensible fallback
  // region; once the user's real coords land we animate to them.
  // `showsUserLocation` itself is gated on hasPermission so the
  // blue-dot puck only appears when the user has actually allowed it.
  const shouldRenderMap = Boolean(isFocused);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoContainer}>
        <BrandInfo />
      </View>

      <View style={styles.mapContainer}>
        {shouldRenderMap ? (
          <>
          <MapLibreMap
            ref={mapRef}
            style={styles.map}
            // OpenFreeMap tiles — see MAP_STYLE_URL note at top of file.
            mapStyle={MAP_STYLE_URL}
            // Apple's HIG treats a map as a single navigable region for
            // VoiceOver; individual pins/the user puck render to the
            // native canvas and can't carry their own labels. A region
            // label here lets a blind user understand the screen
            // contains a map of nearby rides without having to
            // brute-force-explore the canvas.
            accessibilityLabel="Map of nearby rides"
            accessibilityHint="Shows your current location and pickup points for rides leaving from nearby."
            // Kill MapLibre's stock ornaments. We have our own map UX
            // so the maplibre logo, attribution chip, compass and
            // scale bar would just be clutter on top of the lime
            // brand canvas. (Attribution is still legally required —
            // we'll surface it through an in-app About / Credits
            // screen before shipping.)
            logo={false}
            attribution={false}
            compass={false}
            scaleBar={false}
            onDidFinishLoadingMap={() => {
              // Fade the lime cover out the moment MapLibre signals
              // the style + first frame are painted. The 240ms hold
              // before fade gives the tiles a beat to colour in so
              // the user never glimpses the loading texture
              // underneath. (Direct equivalent of the old
              // `onMapReady` callback on react-native-maps.)
              if (!mapTilesReady) setMapTilesReady(true);
              Animated.timing(mapCoverOpacity, {
                toValue: 0,
                delay: 240,
                duration: 360,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }).start();
            }}
          >
            {/* Camera — drives both the initial framing (fallback /
                user-coords region) and every imperative move below
                via cameraRef. MapLibre's camera centers on a
                [lng, lat] pair + zoom level, so we translate
                `initialRegion`'s deltas with `deltaToZoom`. */}
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: regionToCenter(initialRegion ?? FALLBACK_REGION),
                zoom: deltaToZoom(
                  (initialRegion ?? FALLBACK_REGION).latitudeDelta,
                ),
              }}
            />

            {/* Blue user-dot puck — only mounted once location
                permission is granted (matches the old
                `showsUserLocation` gating).
                - `accuracy` paints the translucent radius ring
                  (Google Maps' familiar pulse circle). Without it
                  you only get a 15-pixel dot, easy to miss against
                  the lime canvas.
                - `heading` paints the directional fan arrow over the
                  dot so the user can see which way they're facing.
                - `minDisplacement={1}` keeps the puck smooth — updates
                  on every metre of movement instead of MapLibre's
                  default which only fires on larger jumps. */}
            {isFocused && hasPermission && (
              <UserLocation animated accuracy heading minDisplacement={1} />
            )}

            {/* Service-area ring around the user — gives the map a
                sense of coverage ("UniPool finds carpools within
                this radius"). Implemented as a GeoJSON polygon
                rather than a CircleLayer because CircleLayer
                radii are in *pixels*, not metres, which would
                shrink-and-grow with zoom. */}
            {location && (
              <GeoJSONSource
                id="service-area-source"
                data={buildCirclePolygon(
                  location.latitude,
                  location.longitude,
                  5000,
                )}
              >
                <MapLibreLayer
                  id="service-area-fill"
                  type="fill"
                  paint={{
                    "fill-color": "rgba(181,215,80,0.12)",
                  }}
                />
                <MapLibreLayer
                  id="service-area-stroke"
                  type="line"
                  paint={{
                    "line-color": AppColors.secondaryDarkGreen,
                    "line-width": 2,
                  }}
                />
              </GeoJSONSource>
            )}

            {/* Nearby ride pins — Bolt / Uber pattern: a forest chip
                with a tail pointing down to the pickup coord. The
                label now shows the *destination* (→ Katpadi) instead
                of the cheapest fare — "where can I go from here" is
                a more useful question at a glance than "how cheap is
                the cheapest seat." For multi-ride clusters (campus
                gates, train stations, anywhere multiple students
                depart from the same spot), tapping opens the cluster
                sheet so users can pick the specific ride they want
                — far better than the previous rotating-label hack
                that broke down past 3-4 rides. Single-ride pins
                still jump straight into that ride. Hidden once the
                user has picked a From/To (route preview wins). */}
            {!fromCoords && !toCoords && clusteredNearbyRides.map((c) => (
              <ClusterMarker
                key={c.key}
                cluster={c}
                onPress={() => {
                  if (c.rides.length > 1) {
                    // Multi-ride cluster → open the picker sheet.
                    setClusterSheet({
                      pickup: c.cheapest.start_location,
                      rides: c.rides as ClusteredRide[],
                    });
                  } else {
                    // Single ride → straight to its selected screen,
                    // skipping the unnecessary sheet step.
                    router.navigate(appHref("AvailableRidesSelectedScreen", {
                      ride: c.cheapest,
                    } as any));
                  }
                }}
              />
            ))}

            {/* From / To pins — react-native-maps' Marker had a
                native `image` prop that took an asset directly.
                MapLibre Markers wrap arbitrary React Native views,
                so we render the asset via `<Image>` inside the
                marker. Anchored at the bottom of the icon so the
                tip sits on the coordinate. */}
            {fromCoords && (
              <MapLibreMarker
                lngLat={[fromCoords.longitude, fromCoords.latitude]}
                anchor="bottom"
              >
                <Image
                  source={navigationImg}
                  style={styles.routePinImage}
                  resizeMode="contain"
                />
              </MapLibreMarker>
            )}

            {toCoords && (
              <MapLibreMarker
                lngLat={[toCoords.longitude, toCoords.latitude]}
                anchor="bottom"
              >
                <Image
                  source={locationPinImg}
                  style={styles.routePinImage}
                  resizeMode="contain"
                />
              </MapLibreMarker>
            )}

            {fromCoords && toCoords && (
              <GeoJSONSource
                id="route-source"
                data={buildLineString(routePolylineCoordinates)}
              >
                <MapLibreLayer
                  id="route-line"
                  type="line"
                  layout={{
                    "line-join": "round",
                    "line-cap": "round",
                  }}
                  paint={{
                    "line-color": AppColors.secondaryDarkGreen || "#2d5016",
                    "line-width": 3,
                    // MapLibre style-spec dash pattern is in
                    // line-width multiples (not pixels), so 3 width
                    // × [3.3, 3.3] ≈ the old [10, 10] pixel dash.
                    "line-dasharray": [3.3, 3.3],
                  }}
                />
              </GeoJSONSource>
            )}
          </MapLibreMap>
          {/* Lime fade-in cover. Sits on top of the MapView until the
              native surface signals `onMapReady`, then animates out.
              Replaces the previous "black flash" with a soft handoff
              from brand canvas to map tiles. pointerEvents=none so it
              never blocks pin taps even mid-fade. */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: AppColors.primaryLightGreen,
                opacity: mapCoverOpacity,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={styles.brandText}>
              <Text style={styles.brandTextDark}>Uni</Text>
              <Text style={styles.brandTextDark}>P</Text>
              <Text style={styles.brandTextWhite}>oo</Text>
              <Text style={styles.brandTextDark}>l</Text>
            </Text>
          </Animated.View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.brandText}>
              <Text style={styles.brandTextDark}>Uni</Text>
              <Text style={styles.brandTextDark}>P</Text>
              <Text style={styles.brandTextWhite}>oo</Text>
              <Text style={styles.brandTextDark}>l</Text>
            </Text>
          </View>
        )}
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          isTablet
            ? // iPad: floating left-side panel. Apple Maps idiom — the
              // map breathes full-bleed and the controls park in a
              // ~420pt-wide sidebar that's pinned to the left edge
              // with the navbar still floating at screen bottom-
              // centre. Drag-to-expand and translateY animation are
              // skipped because the panel is always at its natural
              // size on a tablet; there's no off-screen "collapsed"
              // state to spring out of.
              styles.bottomSheetTablet
            : {
                height: BOTTOM_SHEET_MAX_HEIGHT,
                transform: [{ translateY: sheetTranslateY }],
              },
        ]}
      >
        {/* Drag handle is phone-only. On tablet the panel is always
            at its natural size, so the handle would just be a
            misleading affordance. */}
        {!isTablet && (
          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 18, left: 0, right: 0 }}
            style={styles.dragHandleHitArea}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragHandle} />
          </View>
        )}

        <View style={styles.bottomSheetContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollableContent,
              // On iPad the panel is a content-sized floating card
              // (no clearance needed for the floating navbar, which
              // sits below the panel rather than overlapping it). Trim
              // the breathing-room padding so the panel shrinks to its
              // actual content instead of carrying ~100pt of empty
              // lime under the From/To card.
              isTablet && { paddingBottom: 16 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onContentSizeChange={onScrollContentSizeChange}
          >
            {/* Active trip card — the highest-signal surface on the
                home screen for signed-in users. Renders the next
                upcoming trip OR the most recent un-dismissed one;
                the component itself returns null when the server has
                nothing relevant (204), so there's no empty UI to
                manage from here. */}
            {!isGuest && (
              <ActiveTripCard
                cardFromState={appState?.home?.active_trip_card ?? null}
                appStateResolved={appStateResolved}
                onPressOpen={(rideId) =>
                  router.navigate(appHref("RideDetailsScreen", { rideId } as any))
                }
                onPresenceChange={setHasActiveTripCard}
              />
            )}

            {/* Mutually exclusive: when the signed-in user has trips,
                show "Your trips" and hide "Rides around you" — and
                vice versa. Guests never see the trips carousel; they
                always see the nearby tile. This avoids the home sheet
                looking like a catalog of redundant CTAs.
                Additionally hide the carousel whenever the ActiveTripCard
                is present — that card IS the user's current trip
                headline, so the upcoming-trips carousel below it just
                doubles up. */}
            {!isGuest && !hasActiveTripCard && (
              <View style={styles.previousTripsWrapper}>
                <PreviousTripsSection
                  ridesFromState={appState?.home?.user_rides ?? []}
                  appStateResolved={appStateResolved}
                  onHasTripsChange={setHasUserTrips}
                />
              </View>
            )}

            {/* Guests always see this. Signed-in users only see it
                once we've confirmed they have no trips — null means
                "still loading", so we render nothing rather than
                paint-then-yank when trips arrive a frame later. */}
            {(isGuest || hasUserTrips === false) && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.nearbyTile}
                onPress={() => router.navigate(appHref("NearbyRidesScreen"))}
              >
                <Text style={styles.nearbyTileText}>Rides around you</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              {/* Create Ride above; the "Where'd you like to go?" label
                  below now reads as the heading for the search
                  selector it sits right against, instead of doubling
                  as a section label for the white CTA. */}
              <TouchableOpacity
                style={styles.createRideButton}
                onPress={() => {
                  // Posting a ride requires an authenticated student.
                  if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
                  // If the user has already filled From / To / Date in the
                  // search section below, carry that into Create Ride. The
                  // common case for someone tapping Create Ride after
                  // typing a route is "no one's offering my trip, I'll
                  // post it myself" — making them re-type the same
                  // endpoints would be silly.
                  if (rideDetails && (rideDetails.from || rideDetails.to)) {
                    router.navigate(
                      appHref("CreateRide", {
                        fromLocation: rideDetails.from || undefined,
                        toLocation: rideDetails.to || undefined,
                        fromCoordinates: rideDetails.fromCoordinates,
                        toCoordinates: rideDetails.toCoordinates,
                        date: rideDetails.date?.toISOString(),
                      })
                    );
                    return;
                  }
                  router.navigate(appHref("CreateRide"));
                }}
              >
                <Text style={styles.createRideButtonText}>
                  {isGuest ? "Post a ride" : "Create Ride"}
                </Text>
              </TouchableOpacity>

              {/* Two layouts for the search panel:
                  - When the ActiveTripCard is up, the home sheet is
                    already dense (pay card + create-ride CTA). Drop
                    the inline From / To / Date and replace it with
                    a single tap-to-expand pill that opens the
                    SheetShell modal further down. Keeps the home
                    surface scannable without taking away the
                    search affordance.
                  - Otherwise render the inline section + selector
                    exactly as before (no behaviour change for the
                    common case). */}
              {hasActiveTripCard ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    haptic("light");
                    setSearchSheetOpen(true);
                  }}
                  style={styles.collapsedSearchPill}
                  accessibilityLabel="Open search"
                >
                  <Text style={styles.collapsedSearchPillKicker}>
                    Plan a ride
                  </Text>
                  <View style={styles.collapsedSearchPillRow}>
                    <Text style={styles.collapsedSearchPillTitle}>
                      Where'd you like to go?
                    </Text>
                    <Text style={styles.collapsedSearchPillChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.createRideText}>
                    <Text style={styles.sectionTitle}>Where'd you like to go?</Text>
                  </View>

                  <RideDetailsSelector
                    onSubmit={handleRideSubmit}
                    onLocationSelectionChange={handleLocationSelectionChange}
                    onCoordsChange={handleCoordsChange}
                    userLocation={location ?? undefined}
                    clearTrigger={clearRideTrigger}
                  />
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Animated.View>

      {/* Cluster picker sheet — opens when the user taps a "N rides"
          pin. Sits above the map + bottom sheet via the Modal's own
          z-index. Picking a row routes to that specific ride. */}
      <RideClusterSheet
        visible={clusterSheet !== null}
        pickup={clusterSheet?.pickup || ""}
        rides={clusterSheet?.rides || []}
        onClose={() => setClusterSheet(null)}
        onPickRide={(r) => {
          setClusterSheet(null);
          router.navigate(appHref("AvailableRidesSelectedScreen", {
            ride: r,
          } as any));
        }}
      />

      {/* Search sheet — only used when the home surface has
          collapsed the inline RideDetailsSelector behind the
          "Where'd you like to go?" pill. The selector inside opens
          its own from / to / date sub-sheets above this one (RN
          Modal stacking handles the z-order). Submit closes the
          sheet so the search results screen takes focus. */}
      <SheetShell
        visible={searchSheetOpen}
        onDismiss={() => setSearchSheetOpen(false)}
        surfaceColor={AppColors.primaryLightGreen}
      >
        <Text style={styles.searchSheetTitle}>Where'd you like to go?</Text>
        <RideDetailsSelector
          onSubmit={(details) => {
            // Close FIRST so the search-results navigation doesn't
            // happen with the sheet still up — looks like a
            // stutter on the search screen mount otherwise.
            setSearchSheetOpen(false);
            handleRideSubmit(details);
          }}
          onLocationSelectionChange={handleLocationSelectionChange}
          onCoordsChange={handleCoordsChange}
          userLocation={location ?? undefined}
          clearTrigger={clearRideTrigger}
        />
      </SheetShell>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Lime fallback shows through while the map is loading instead of a
    // bright white flash. Map mounts on top once it's ready.
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: "100%",
  },
  // ---------------------------------------------------------------
  // Map marker for nearby rides. Same shape as Bolt's price chip and
  // Uber's "X min" pill — a small forest badge with the trip price
  // in lime, a downward triangle tail, and a lime contact dot at the
  // ground. Anchored at the bottom of the View so the dot sits on
  // the actual coordinate.
  //   ┌────────┐
  //   │ ₹220   │  <- pinBadge (forest fill, lime text)
  //   └─▼──────┘  <- pinTail (forest triangle)
  //       ●        <- pinDot (lime contact dot at lat/lng)
  // ---------------------------------------------------------------
  pinWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: AppColors.primaryLightGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 4,
    gap: 6,
  },
  pinBadgeText: {
    color: AppColors.primaryLightGreen,
    fontSize: 12,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.1,
  },
  // Lime sub-badge inside the pin — shows how many rides leave from
  // this pickup point when more than one is clustered.
  pinBadgeCount: {
    minWidth: 18,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBadgeCountText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 10.5,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  pinTail: {
    // Triangle pointing down. Created via the classic
    // four-border trick (transparent left/right, coloured top).
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: AppColors.secondaryDarkGreen,
    marginTop: -1,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primaryLightGreen,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    marginTop: -2,
  },
  // Size for the From / To pin asset rendered inside MapLibre markers.
  // react-native-maps' `image={...}` prop sized the asset for us; under
  // MapLibre the marker is a plain RN view so we need an explicit size.
  // Matches the visual weight of the old native asset (~28×28 hit area).
  routePinImage: {
    width: 28,
    height: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.primaryLightGreen,
    paddingBottom: responsiveHeight(70),
  },
  loadingText: {
    fontSize: normalize(16),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: normalize(28),
    borderTopRightRadius: normalize(28),
    zIndex: 10,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  // iPad-only: turn the bottom sheet into a left-side floating panel.
  // - No `bottom` constraint, so the panel's height grows with its
  //   content instead of stretching the full screen and leaving a sea
  //   of empty lime under the controls. `maxHeight` keeps it under
  //   control if the user signs in and the trip carousel fills up.
  // - 480pt wide so the From/To card, "Post a ride" pill, and trip
  //   chips have room to breathe (the 420pt version felt cramped).
  // - All four corners rounded; the panel reads as a discrete floating
  //   card over the map instead of a sheet pinned to a screen edge.
  // - Deep shadow because the panel floats over a vivid map and needs
  //   a clear surface separation.
  bottomSheetTablet: {
    left: 24,
    right: undefined,
    top: 72,
    bottom: undefined,
    // Match the iPhone 14/15 width we use as the design reference
    // above. Going wider (480) makes the From/To card and Post-a-ride
    // pill stretch into wide pills full of dead air; matching the
    // phone width keeps every internal layout reading at the
    // proportions it was tuned for.
    width: 390,
    maxHeight: 900,
    borderRadius: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 14,
  },
  // Wrapper around the visible drag-handle pill — a generous full-
  // width touch target above the ScrollView so the sheet's
  // PanResponder reliably catches the gesture. ≥48pt tall to meet
  // Android's minimum touch-target spec, with `elevation` so it
  // sits clearly on top of anything else inside the sheet.
  dragHandleHitArea: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 4,
  },
  // Visible pill — was nearly invisible (rgba 0.28 forest on lime).
  // Bigger, more contrasted: 56×6, forest at 0.45 opacity.
  dragHandle: {
    width: 56,
    height: 6,
    backgroundColor: "rgba(38,59,51,0.55)",
    borderRadius: 3,
  },
  bottomSheetContent: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollableContent: {
    paddingHorizontal: responsiveWidth(2.5),
    // Keeps content clear of the floating navbar. The expanded snap
    // measures this too, so the final row rests above the nav instead
    // of touching it on shorter Android screens.
    paddingBottom: SHEET_BOTTOM_BREATHING_ROOM,
  },
  previousTripsWrapper: {
    // Transparent wrapper — the inner card (PreviousTripsSection's
    // empty container or trip cards) provides the forest surface. Two
    // overlapping cards would look like a typography error.
    backgroundColor: "transparent",
    borderRadius: normalize(18),
    paddingVertical: responsiveHeight(0.3),
    paddingHorizontal: 0,
  },
  // "Rides around you" — mirrors `createRideButton` exactly so the
  // two CTAs read as a matched pair on the home sheet (forest fill,
  // lime label, identical padding / radius / shadow).
  //
  // Hard-coded vertical padding (no `normalize`) because `normalize`
  // subtracts 2pt on Android, which made the pills feel cramped on
  // smaller devices (Samsung F14 etc.). iOS keeps the same value so
  // the two platforms render with matching heights.
  nearbyTile: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 18,
    paddingHorizontal: responsiveWidth(2.5),
    borderRadius: normalize(14),
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginTop: responsiveHeight(0.4),
    marginBottom: responsiveHeight(1.4),
    alignSelf: "center",
    // Bumped from elevation: 2 → 5 because Material's shadow renderer
    // is more conservative than iOS's, leaving forest cards looking
    // flat-stuck-to-the-canvas on Android. The iOS shadow props are
    // also stronger now so both platforms render with comparable
    // depth.
    elevation: 5,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  nearbyTileText: {
    color: AppColors.primaryLightGreen,
    fontSize: normalize(15.5),
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.3,
  },
  section: {
    // No `paddingHorizontal` here — the parent (`scrollableContent`)
    // already insets every child by 2.5% on each side. The previous
    // 2% padding inside this section made the Create Ride button +
    // RideDetailsSelector ~4% narrower than the "Your trips" card
    // and the "Rides around you" tile, breaking the visual rhythm.
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveHeight(0.4),
    backgroundColor: "transparent",
    borderRadius: normalize(16),
    paddingVertical: responsiveHeight(0.2),
  },
  sectionTitle: {
    // Sub-header for the home sheet. Still sentence-case so a
    // question doesn't read awkwardly as uppercase, but pulled out
    // of the previous 0.7-opacity SemiBold whisper — too faint on
    // the lime canvas; users couldn't see it. Bold @ 0.95 reads
    // as a confident label without competing with the CTA below.
    // Kept in sync with PreviousTripsSection.sectionTitle so "Your
    // trips" and "Where'd you like to go?" sit at the same volume.
    fontSize: normalize(16),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "left",
    letterSpacing: -0.05,
    opacity: 0.95,
  },
  createRideButton: {
    // White card with forest text — lighter middle that breaks the
    // forest stack (Rides around you above, From/To card below)
    // without going off-palette. Subtle hairline border anchors it
    // to the brand colour so the white doesn't read as detached.
    //
    // Hard-coded paddingVertical (same reason as `nearbyTile`) so the
    // CTA reads as a real touch target on smaller Android screens.
    // Higher elevation on Android because Material's shadow renderer
    // is more conservative than iOS's.
    backgroundColor: AppColors.basicWhite,
    paddingVertical: 18,
    paddingHorizontal: responsiveWidth(2.5),
    borderRadius: normalize(14),
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginTop: responsiveHeight(1),
    marginBottom: responsiveHeight(2),
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
    elevation: 5,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  createRideButtonText: {
    // Forest label on a white card — high contrast, brand-aligned.
    color: AppColors.secondaryDarkGreen,
    fontSize: normalize(15.5),
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.3,
  },
  createRideText: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    fontFamily: "NunitoSans_400Regular",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(2.5),
    paddingVertical: responsiveHeight(1),
  },
  // Collapsed pill rendered in place of the full RideDetailsSelector
  // when the active trip card is up. Tapping it opens the search
  // sheet (SheetShell at the bottom of the screen) where the full
  // selector lives.
  collapsedSearchPill: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: normalize(16),
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: responsiveHeight(1),
    elevation: 4,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  collapsedSearchPillKicker: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 10.5,
    letterSpacing: 1.0,
    color: AppColors.primaryLightGreen,
    opacity: 0.6,
    textTransform: "uppercase",
  },
  collapsedSearchPillRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsedSearchPillTitle: {
    flex: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: normalize(16),
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.2,
  },
  collapsedSearchPillChevron: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 26,
    color: AppColors.primaryLightGreen,
    opacity: 0.75,
    marginLeft: 10,
    lineHeight: 26,
  },
  // SheetShell content: tight title above the selector so the modal
  // has a clear handle, then RideDetailsSelector fills its natural
  // height beneath. Matches the inline section's sectionTitle
  // typography so the collapse/expand swap doesn't feel like a
  // different surface.
  searchSheetTitle: {
    fontSize: normalize(20),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.4,
    marginBottom: 14,
    marginTop: 4,
  },
  brandText: {
    fontSize: normalize(32),
    fontFamily: "Trap-Bold",
    textAlign: "center",
  },
  brandTextDark: {
    color: AppColors.secondaryDarkGreen,
  },
  brandTextWhite: {
    color: AppColors.basicWhite,
  },
});

export default HomeScreen;
