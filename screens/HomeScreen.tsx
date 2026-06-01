import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Platform, PixelRatio, PanResponder, Animated, Easing, ScrollView, AppState, useWindowDimensions } from "react-native";
import { TABLET_BREAKPOINT } from "../utils/responsive";
import navigationImg from "../assets/navigation.png";
import locationPinImg from "../assets/location-pin-2.png";
// MapLibre renders tiles from style URLs and vector overlays from GeoJSON
// sources. Marker is still used for custom React Native pin views.
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
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { useUser } from "../contexts/UserContext";
import { useThemeColors } from "../contexts/ThemeContext";
import { appHref } from "../navigation/routes";
import AppColors from "../design_systems/colors";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import ActiveTripCard from "../components/ActiveTripCard";
import SheetShell from "../components/SheetShell";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../components/MainNavBar.constants";
import bottomNavItems from "../data/BottomNavigationItems";
import BrandInfo from "../components/BrandInfo/BrandInfo";
import { haptic } from "../components/haptics";
import RideClusterSheet, { ClusteredRide } from "../components/RideClusterSheet";
import RoutePreviewLayer, {
  type RoutePreviewBounds,
  type RoutePreviewRide,
} from "../components/RoutePreviewLayer";
import RoutePreviewCard from "../components/RoutePreviewCard";
import { getAppState } from "../utils/AppStateService";
import type { AppStateResponse, NearbyRideSummary } from "../utils/AppStateService";
import { isRideUpcomingAt } from "../utils/rideTime";
import { scheduleIdleTask, type ScheduledIdleTask } from "../utils/scheduleIdleTask";

const { width: rawScreenWidth, height: rawScreenHeight } = Dimensions.get("window");

// Phone sizing uses the actual viewport; tablet sizing uses a phone reference
// so form controls do not inflate across the full iPad canvas.
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
const LOCATION_REFRESH_EPSILON = 0.001;
const MAP_CAMERA_ANIMATION_MS = 280;

const areCoordsEqual = (a: LocationCoords | null, b: LocationCoords | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < COORDINATE_EPSILON &&
    Math.abs(a.longitude - b.longitude) < COORDINATE_EPSILON
  );
};

const MIN_LINE_DELTA = 0.000001;

const isValidLocationCoord = (coord: { latitude: number; longitude: number }) =>
  Number.isFinite(coord.latitude) &&
  Number.isFinite(coord.longitude) &&
  coord.latitude >= -90 &&
  coord.latitude <= 90 &&
  coord.longitude >= -180 &&
  coord.longitude <= 180;

const sameLngLat = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) < MIN_LINE_DELTA &&
  Math.abs(a[1] - b[1]) < MIN_LINE_DELTA;

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

// Fallback map center used until real location coordinates arrive.
const FALLBACK_REGION = {
  latitude: 12.9698,   // VIT Vellore
  longitude: 79.1559,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// OpenFreeMap styles used for unauthenticated tile loading.
const MAP_STYLE_URL_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const MAP_STYLE_URL_DARK = "https://tiles.openfreemap.org/styles/dark";

// MapLibre uses [longitude, latitude] + zoom. Approximate zoom from
// react-native-maps-style latitudeDelta values:
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
 * Build a GeoJSON polygon approximating a real-world radius around a point.
 * CircleLayer radii are screen-space pixels, so a polygon is required for
 * metre-based service areas.
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
): GeoJSON.Feature<GeoJSON.LineString> | null => {
  const coordinates: [number, number][] = [];
  for (const point of pts) {
    if (!isValidLocationCoord(point)) continue;
    const lngLat: [number, number] = [point.longitude, point.latitude];
    const previous = coordinates[coordinates.length - 1];
    if (!previous || !sameLngLat(lngLat, previous)) {
      coordinates.push(lngLat);
    }
  }

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
const shortenDestination = (s: string) => {
  const first = (s.split(",")[0] || "").trim();
  return first.length > 16 ? first.slice(0, 15).trimEnd() + "…" : first;
};

type NearbyCluster = {
  key: string;
  latitude: number;
  longitude: number;
  rides: NearbyRideSummary[];
  cheapest: NearbyRideSummary;
  cheapestPrice: number;
};

const areNearbyClustersEqual = (
  previous: NearbyCluster[],
  next: NearbyCluster[],
): boolean => {
  if (previous.length !== next.length) return false;

  for (let i = 0; i < previous.length; i += 1) {
    const a = previous[i];
    const b = next[i];
    if (
      a.key !== b.key ||
      a.latitude !== b.latitude ||
      a.longitude !== b.longitude ||
      a.cheapest.id !== b.cheapest.id ||
      a.cheapestPrice !== b.cheapestPrice ||
      a.rides.length !== b.rides.length
    ) {
      return false;
    }

    for (let j = 0; j < a.rides.length; j += 1) {
      const ar = a.rides[j];
      const br = b.rides[j];
      if (
        ar.id !== br.id ||
        ar.start_time !== br.start_time ||
        ar.end_location !== br.end_location ||
        ar.total_price !== br.total_price ||
        ar.total_seats !== br.total_seats ||
        ar.booked_seats !== br.booked_seats
      ) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Map pin for one pickup coordinate. Single-ride pins show the destination;
 * multi-ride pins show a count and open the cluster sheet.
 */
const ClusterMarker = React.memo<{
  cluster: NearbyCluster;
  onPress: (cluster: NearbyCluster) => void;
}>(({ cluster, onPress }) => {
  const count = cluster.rides.length;
  const isMulti = count > 1;
  const label = isMulti
    ? `${count} rides`
    : shortenDestination(cluster.cheapest.end_location);
  const handlePress = useCallback(() => onPress(cluster), [cluster, onPress]);

  return (
    <MapLibreMarker
      lngLat={[cluster.longitude, cluster.latitude]}
      onPress={handlePress}
      // Anchor the visual pin tip at the pickup coordinate.
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
});

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
  const colors = useThemeColors();
  // Live dimensions keep the tablet panel responsive during rotation.
  const { width: liveWidth } = useWindowDimensions();
  const isTablet = liveWidth >= TABLET_BREAKPOINT;
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil, revalidate } = useApi();
  const { requireAuth, isGuest } = useAuthGate();
  // Used to keep the viewer's own hosted rides out of nearby pins.
  const { user: viewerUser } = useUser();
  const mapRef = useRef<MapRef>(null);
  // Map ref exposes geometry; Camera ref drives imperative moves.
  const cameraRef = useRef<CameraRef>(null);

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const locationRef = useRef<LocationCoords | null>(null);
  // Populated when the user taps a multi-ride cluster pin.
  const [clusterSheet, setClusterSheet] = useState<{
    pickup: string;
    rides: ClusteredRide[];
  } | null>(null);

  // Route preview state shared by the map overlay and floating preview card.
  const [previewRide, setPreviewRide] = useState<
    | (RoutePreviewRide & {
        host_user_name?: string;
        start_location: string;
        start_time?: string;
        total_price?: number;
        // Full ride payload for the existing ride-details navigation path.
        raw: any;
      })
    | null
  >(null);

  // Viewport bounds used by RoutePreviewLayer to place off-screen chevrons.
  const [mapBounds, setMapBounds] = useState<RoutePreviewBounds>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [allFieldsSelected, setAllFieldsSelected] = useState(false);
  // Bumped by the Search Rides close action to clear the selector.
  const [clearRideTrigger, setClearRideTrigger] = useState(0);
  // null = unresolved, true = show trip carousel, false = show nearby tile.
  const [hasUserTrips, setHasUserTrips] = useState<boolean | null>(null);
  // ActiveTripCard takes priority over the upcoming-trips carousel.
  const [hasActiveTripCard, setHasActiveTripCard] = useState(false);
  // Full search selector sheet used when the inline home stack is too dense.
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  } | null>(null);

  type NearbyRide = NearbyRideSummary;
  const [nearbyRides, setNearbyRides] = useState<NearbyRide[]>([]);
  // Pan-driven refresh state for /rides/nearby.
  const lastNearbyCentreRef = useRef<{ lat: number; lng: number } | null>(null);
  const nearbyFetchSeqRef = useRef(0);
  const nearbyFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [appState, setAppState] = useState<AppStateResponse | null>(null);
  const [appStateResolved, setAppStateResolved] = useState(false);
  // Opaque brand cover shown until MapLibre paints its first tile frame.
  const mapCoverOpacity = useRef(new Animated.Value(1)).current;
  const [mapTilesReady, setMapTilesReady] = useState(false);

  // Recompute time-sensitive nearby pins every 30s so departed rides drop out.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!isFocused) return undefined;

    const tick = () => {
      if (AppState.currentState === "active") {
        setNowTick(Date.now());
      }
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isFocused]);

  const previousNearbyClustersRef = useRef<NearbyCluster[]>([]);
  const clusteredNearbyRides = React.useMemo<NearbyCluster[]>(() => {
    const byKey = new Map<string, NearbyCluster>();
    const viewerUserId = viewerUser?.id ?? null;
    const nowMs = nowTick;
    for (const r of nearbyRides) {
      // Hide the viewer's own rides; hosts cannot request their own seats.
      if (viewerUserId && r.host_user_id === viewerUserId) continue;
      // Drop stale rides from cached app-state or nearby responses.
      if (!isRideUpcomingAt(r.start_time, nowMs)) continue;
      // 3 decimals is roughly 110m, enough to group campus-scale pickups.
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
    const nextClusters = Array.from(byKey.values());
    if (areNearbyClustersEqual(previousNearbyClustersRef.current, nextClusters)) {
      return previousNearbyClustersRef.current;
    }
    previousNearbyClustersRef.current = nextClusters;
    return nextClusters;
  }, [nearbyRides, viewerUser?.id, nowTick]);

  const clusterSheetRides = React.useMemo(
    () =>
      clusterSheet
        ? clusterSheet.rides.filter((r) => isRideUpcomingAt(r.start_time, nowTick))
        : [],
    [clusterSheet, nowTick],
  );

  useEffect(() => {
    if (clusterSheet && clusterSheetRides.length === 0) {
      setClusterSheet(null);
    }
  }, [clusterSheet, clusterSheetRides.length]);

  const previewNearbyRide = useCallback(
    (ride: NearbyRideSummary) => {
      if (!isRideUpcomingAt(ride.start_time, Date.now())) return;

      if (
        typeof ride.start_latitude === "number" &&
        typeof ride.start_longitude === "number" &&
        typeof ride.end_latitude === "number" &&
        typeof ride.end_longitude === "number"
      ) {
        const hostUserName = (ride as { host_user_name?: string }).host_user_name;
        haptic("selection");
        setPreviewRide({
          id: ride.id,
          start_latitude: ride.start_latitude,
          start_longitude: ride.start_longitude,
          end_latitude: ride.end_latitude,
          end_longitude: ride.end_longitude,
          end_location: ride.end_location,
          start_location: ride.start_location,
          host_user_name: hostUserName,
          start_time: ride.start_time,
          total_price: ride.total_price,
          raw: ride,
        });
        return;
      }

      router.navigate(appHref("AvailableRidesSelectedScreen", {
        ride,
      } as any));
    },
    [router],
  );

  const handleNearbyClusterPress = useCallback(
    (cluster: NearbyCluster) => {
      const nowMs = Date.now();
      const activeRides = cluster.rides.filter((r) =>
        isRideUpcomingAt(r.start_time, nowMs),
      );
      if (activeRides.length === 0) return;

      if (activeRides.length > 1) {
        const cheapest = activeRides.reduce((best, r) =>
          r.total_price < best.total_price ? r : best,
        );
        setClusterSheet({
          pickup: cheapest.start_location,
          rides: activeRides,
        });
        return;
      }

      previewNearbyRide(activeRides[0]);
    },
    [previewNearbyRide],
  );

  const [fromCoords, setFromCoords] = useState<LocationCoords | null>(null);
  const [toCoords, setToCoords] = useState<LocationCoords | null>(null);
  const selectedCoordsRef = useRef<{ from: LocationCoords | null; to: LocationCoords | null }>({
    from: null,
    to: null,
  });
  const mapCameraTaskRef = useRef<ScheduledIdleTask | null>(null);
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

  // Keep sheet height fixed during drag; translateY avoids layout work per frame.
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetOffset = useRef(0);
  const dragStartOffset = useRef(0);

  // Natural ScrollView content height, including bottom breathing room.
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

      // Fire haptics only when settling into a different snap point.
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
    // Read-only permission check; LocationPermissionScreen owns native prompts.
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      if (!hasPermission) setHasPermission(true);
      if (!location) await getUserLocation();
    } else {
      if (hasPermission) setHasPermission(false);
    }
  };

  const getUserLocation = async () => {
    if (locationRef.current) return;

    const applyCoords = (latitude: number, longitude: number) => {
      const next = { latitude, longitude };
      const previous = locationRef.current;
      if (
        previous &&
        Math.abs(previous.latitude - latitude) < LOCATION_REFRESH_EPSILON &&
        Math.abs(previous.longitude - longitude) < LOCATION_REFRESH_EPSILON
      ) {
        return;
      }
      locationRef.current = next;
      setLocation(next);
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

    // Fast path: cached coordinates paint the map before a fresh GPS fix lands.
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) applyCoords(last.coords.latitude, last.coords.longitude);
    } catch (e) {
      console.warn("Last-known position lookup failed (continuing)", e);
    }

    // Fresh balanced fix refines the cached position without waiting for GPS lock.
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
    // Re-check on foreground so Settings changes are reflected without restart.
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        setNowTick(Date.now());
        requestLocationPermission();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan-driven nearby refresh: debounce camera movement, skip small centre
  // changes, and sequence responses so stale fetches cannot overwrite newer pins.
  useEffect(() => {
    if (!mapBounds) return;
    if (previewRide) return;
    const [west, south, east, north] = mapBounds;
    const centreLat = (north + south) / 2;
    const centreLng = (east + west) / 2;

    // Skip if the map centre is still within roughly 500m of the last fetch.
    const last = lastNearbyCentreRef.current;
    if (last) {
      const dLat = Math.abs(centreLat - last.lat);
      const dLng = Math.abs(centreLng - last.lng);
      if (dLat < 0.005 && dLng < 0.005) return;
    }

    // Derive search radius from visible bounds and clamp to the API limit.
    const latSpan = north - south;
    const lngSpan = east - west;
    const radiusKm = Math.max(latSpan, lngSpan) * 111 * 0.6;
    const radiusM = Math.min(50000, Math.max(1500, Math.round(radiusKm * 1000)));

    if (nearbyFetchTimerRef.current) {
      clearTimeout(nearbyFetchTimerRef.current);
    }
    nearbyFetchTimerRef.current = setTimeout(async () => {
      const seq = ++nearbyFetchSeqRef.current;
      try {
        // Signed-in callers pass their user id so the API can exclude
        // their own hosted rides before the response reaches the map.
        const excludeParam = viewerUser?.id
          ? `&exclude_host_user_id=${encodeURIComponent(viewerUser.id)}`
          : "";
        const resp = await apiUtil.get<{ rides: NearbyRideSummary[] }>(
          `/rides/nearby?lat=${centreLat.toFixed(4)}&lng=${centreLng.toFixed(4)}&radius=${radiusM}&limit=50${excludeParam}`,
        );
        // Discard stale responses when network ordering changes.
        if (seq !== nearbyFetchSeqRef.current) return;
        setNearbyRides(resp?.rides ?? []);
        lastNearbyCentreRef.current = { lat: centreLat, lng: centreLng };
      } catch (e) {
        // Keep the last successful pin set on transient network failures.
      }
    }, 500);
    return () => {
      if (nearbyFetchTimerRef.current) {
        clearTimeout(nearbyFetchTimerRef.current);
        nearbyFetchTimerRef.current = null;
      }
    };
  }, [mapBounds, apiUtil, previewRide, viewerUser?.id]);

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

  // App-state bootstrap hydrates home, trip card, ratings, and nearby rides.
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

  // Opening a route preview collapses the home sheet and fits pickup/dropoff
  // above the preview card. Cleanup restores the prior sheet offset.
  useEffect(() => {
    if (!previewRide) return;

    // Preserve manual drag position across preview open/close.
    const previousOffset = sheetOffset.current;
    Animated.spring(sheetTranslateY, {
      toValue: getCollapsedSheetOffset(),
      useNativeDriver: true,
      bounciness: 3,
    }).start();

    const camera = cameraRef.current;
    if (camera) {
      const bounds = coordsToBounds([
        { latitude: previewRide.start_latitude, longitude: previewRide.start_longitude },
        { latitude: previewRide.end_latitude, longitude: previewRide.end_longitude },
      ]);
      camera.fitBounds(bounds, {
        padding: {
          top: screenHeight * 0.14,
          bottom: screenHeight * 0.4,
          left: screenWidth * 0.14,
          right: screenWidth * 0.14,
        },
        duration: MAP_CAMERA_ANIMATION_MS,
      });
    }

    return () => {
      Animated.spring(sheetTranslateY, {
        toValue: previousOffset,
        useNativeDriver: true,
        bounciness: 3,
      }).start();
    };
  }, [previewRide?.id]);

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

    mapCameraTaskRef.current = scheduleIdleTask(() => {
      mapCameraFrameRef.current = requestAnimationFrame(() => {
        mapCameraFrameRef.current = null;
        runMapCameraUpdate(from, to);
      });
    }, 300);
  }, [runMapCameraUpdate]);

  // Stable callback for RideDetailsSelector to avoid repeated camera work.
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

  // Nav bar variant follows whether the search form has a complete route.
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
          targetTime: rideDetails.date?.toISOString(),
        };
        // Browsing rides is public; booking gates auth later.
        router.navigate(appHref("AvailableRidesScreen", params));
      };
      // Close action clears the selector through clearTrigger.
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
      // handleCoordsChange owns map camera reset when both pins clear.
    }
  }, []);

  const routePolylineCoordinates = React.useMemo(() => {
    if (!fromCoords || !toCoords) return [];
    return generateCurvedRoute(fromCoords.latitude, fromCoords.longitude, toCoords.latitude, toCoords.longitude);
  }, [fromCoords, toCoords]);
  const routeLineData = React.useMemo(
    () => buildLineString(routePolylineCoordinates),
    [routePolylineCoordinates],
  );

  // Mount the map while location is still resolving; Camera starts at fallback.
  const shouldRenderMap = Boolean(isFocused);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.brandInfoContainer}>
        <BrandInfo />
      </View>

      <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
        {shouldRenderMap ? (
          <>
          <MapLibreMap
            ref={mapRef}
            style={styles.map}
            // Swap OpenFreeMap styles with the app theme.
            mapStyle={colors.mode === "dark" ? MAP_STYLE_URL_DARK : MAP_STYLE_URL_LIGHT}
            // Apple's HIG treats a map as a single navigable region for
            // VoiceOver; individual pins/the user puck render to the
            // native canvas and can't carry their own labels. A region
            // label here lets a blind user understand the screen
            // contains a map of nearby rides without having to
            // brute-force-explore the canvas.
            accessibilityLabel="Map of nearby rides"
            accessibilityHint="Shows your current location and pickup points for rides leaving from nearby."
            // Hide stock ornaments; attribution is handled elsewhere in app chrome.
            logo={false}
            attribution={false}
            compass={false}
            scaleBar={false}
            onDidFinishLoadingMap={() => {
              // Fade the brand cover after MapLibre paints the first frame.
              if (!mapTilesReady) setMapTilesReady(true);
              Animated.timing(mapCoverOpacity, {
                toValue: 0,
                delay: 240,
                duration: 360,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }).start();
              // Snapshot initial bounds for route-preview chevron clipping.
              void mapRef.current
                ?.getBounds()
                .then((b) => setMapBounds(b as RoutePreviewBounds))
                .catch(() => {});
            }}
            // Track settled viewport bounds for route-preview clipping.
            onRegionDidChange={(e: any) => {
              const next = e?.nativeEvent?.bounds as RoutePreviewBounds | undefined;
              if (next && Array.isArray(next) && next.length === 4) {
                setMapBounds(next);
              }
            }}
          >
            {/* Initial map framing and imperative camera moves. */}
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: regionToCenter(initialRegion ?? FALLBACK_REGION),
                zoom: deltaToZoom(
                  (initialRegion ?? FALLBACK_REGION).latitudeDelta,
                ),
              }}
            />

            {/* User location puck, mounted only after permission is granted. */}
            {isFocused && hasPermission && (
              <UserLocation animated accuracy heading minDisplacement={1} />
            )}

            {/* Metre-based service-area ring around the user's location. */}
            {location && isValidLocationCoord(location) && (
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
                    // Forest on light tiles; lime on dark tiles.
                    "line-color": colors.mode === "dark"
                      ? AppColors.primaryLightGreen
                      : AppColors.secondaryDarkGreen,
                    "line-width": 2,
                  }}
                />
              </GeoJSONSource>
            )}

            {/* Nearby ride pins hide while the From/To route preview is active. */}
            {!fromCoords && !toCoords && clusteredNearbyRides.map((c) => (
              <ClusterMarker
                key={c.key}
                cluster={c}
                onPress={handleNearbyClusterPress}
              />
            ))}

            {/* Map-owned route line and off-screen destination chevron. */}
            {previewRide && (
              <RoutePreviewLayer
                ride={previewRide}
                bounds={mapBounds}
                onTapDestination={() => {
                  router.navigate(appHref("AvailableRidesSelectedScreen", {
                    ride: previewRide.raw,
                  } as any));
                }}
              />
            )}

            {/* From/To pins rendered as React Native marker children. */}
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

            {fromCoords && toCoords && routeLineData && (
              <GeoJSONSource
                id="route-source"
                data={routeLineData}
              >
                <MapLibreLayer
                  id="route-line"
                  type="line"
                  layout={{
                    "line-join": "round",
                    "line-cap": "round",
                  }}
                  paint={{
                    // Use lime on dark tiles for route contrast.
                    "line-color": colors.mode === "dark"
                      ? AppColors.primaryLightGreen
                      : (AppColors.secondaryDarkGreen || "#2d5016"),
                    "line-width": 3,
                    // Dash pattern values are line-width multiples.
                    "line-dasharray": [3.3, 3.3],
                  }}
                />
              </GeoJSONSource>
            )}
          </MapLibreMap>
          {/* Brand cover fades out after the map's first tile frame. */}
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
          { backgroundColor: colors.background },
          isTablet
            ? // Tablet: fixed floating panel; phones keep draggable sheet behavior.
              styles.bottomSheetTablet
            : {
                height: BOTTOM_SHEET_MAX_HEIGHT,
                transform: [{ translateY: sheetTranslateY }],
              },
        ]}
      >
        {/* Drag handle is phone-only; tablet panel is fixed. */}
        {!isTablet && (
          <View
            collapsable={false}
            hitSlop={{ top: 8, bottom: 18, left: 0, right: 0 }}
            style={styles.dragHandleHitArea}
            {...panResponder.panHandlers}
          >
            <View style={[styles.dragHandle, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />
          </View>
        )}

        <View style={styles.bottomSheetContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollableContent,
                  // Tablet panel does not need phone navbar clearance.
                  isTablet && { paddingBottom: 16 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onContentSizeChange={onScrollContentSizeChange}
          >
            {/* Active trip card renders null when there is no current trip. */}
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

            {/* ActiveTripCard, trip carousel, and nearby tile are mutually exclusive. */}
            {!isGuest && !hasActiveTripCard && (
              <View style={styles.previousTripsWrapper}>
                <PreviousTripsSection
                  ridesFromState={appState?.home?.user_rides ?? []}
                  appStateResolved={appStateResolved}
                  onHasTripsChange={setHasUserTrips}
                />
              </View>
            )}

            {/* Nearby tile appears for guests or signed-in users with no trips. */}
            {(isGuest || hasUserTrips === false) && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.nearbyTile, colors.mode === "dark" && { backgroundColor: colors.surface }]}
                onPress={() => router.navigate(appHref("NearbyRidesScreen"))}
              >
                <Text style={[styles.nearbyTileText, colors.mode === "dark" && { color: colors.textPrimary }]}>Rides around you</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.createRideButton, colors.mode === "dark" && { backgroundColor: colors.surface }]}
                onPress={() => {
                  // Posting a ride requires an authenticated student.
                  if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
                  // Carry any selected route details into CreateRide.
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
                <Text style={[styles.createRideButtonText, { color: colors.textPrimary }]}>
                  {isGuest ? "Post a ride" : "Create Ride"}
                </Text>
              </TouchableOpacity>

              {/* Dense home states collapse search into a sheet trigger. */}
              {hasActiveTripCard ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    haptic("light");
                    setSearchSheetOpen(true);
                  }}
                  style={styles.nearbyTile}
                  accessibilityLabel="Search rides"
                >
                  <Text style={styles.nearbyTileText}>Search rides</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.createRideText}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Where'd you like to go?</Text>
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

      {/* Cluster picker for multi-ride pickup pins. */}
      <RideClusterSheet
        visible={clusterSheet !== null && clusterSheetRides.length > 0}
        pickup={clusterSheet?.pickup || ""}
        rides={clusterSheetRides}
        onClose={() => setClusterSheet(null)}
        onPickRide={(r: any) => {
          // Prefer route preview; fall back to details when geometry is missing.
          setClusterSheet(null);
          if (!isRideUpcomingAt(r?.start_time, Date.now())) return;
          if (
            typeof r?.start_latitude === "number" &&
            typeof r?.start_longitude === "number" &&
            typeof r?.end_latitude === "number" &&
            typeof r?.end_longitude === "number"
          ) {
            haptic("selection");
            setPreviewRide({
              id: r.id ?? `${r.start_latitude}-${r.start_longitude}`,
              start_latitude: r.start_latitude,
              start_longitude: r.start_longitude,
              end_latitude: r.end_latitude,
              end_longitude: r.end_longitude,
              end_location: r.end_location,
              start_location: r.start_location,
              host_user_name: r.host_user_name,
              start_time: r.start_time,
              total_price: r.total_price,
              raw: r,
            });
          } else {
            router.navigate(appHref("AvailableRidesSelectedScreen", {
              ride: r,
            } as any));
          }
        }}
      />

      {/* Floating route preview card shown after selecting a map pin. */}
      <RoutePreviewCard
        ride={previewRide}
        onDismiss={() => setPreviewRide(null)}
        onOpen={() => {
          if (!previewRide) return;
          const r = previewRide.raw;
          setPreviewRide(null);
          router.navigate(appHref("AvailableRidesSelectedScreen", {
            ride: r,
          } as any));
        }}
      />

      {/* Search sheet used when the inline selector is collapsed. */}
      <SheetShell
        visible={searchSheetOpen}
        onDismiss={() => setSearchSheetOpen(false)}
        surfaceColor={AppColors.primaryLightGreen}
      >
        <Text style={styles.searchSheetTitle}>Where'd you like to go?</Text>
        <RideDetailsSelector
          // manualSubmit waits for the footer CTA instead of auto-submitting.
          manualSubmit
          onSubmit={(details) => {
            // Close before search-results navigation takes focus.
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
    // Brand fallback while the map surface is loading.
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
  // Nearby ride marker: label badge, downward tail, and coordinate dot.
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
  // Sub-badge for multi-ride pickup clusters.
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
    // Downward triangle created with transparent side borders.
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
  // Explicit size for image assets rendered inside MapLibre markers.
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
  // Tablet-only floating panel; phones use the draggable bottom sheet.
  bottomSheetTablet: {
    left: 24,
    right: undefined,
    top: 72,
    bottom: undefined,
    // Match the phone reference width used by the tablet sizing branch.
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
  // Full-width touch target for the visible drag-handle pill.
  dragHandleHitArea: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 4,
  },
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
    // Keep sheet content clear of the floating navbar.
    paddingBottom: SHEET_BOTTOM_BREATHING_ROOM,
  },
  previousTripsWrapper: {
    backgroundColor: "transparent",
    borderRadius: normalize(18),
    paddingVertical: responsiveHeight(0.3),
    paddingHorizontal: 0,
  },
  // Matched CTA surface for "Rides around you".
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
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveHeight(0.4),
    backgroundColor: "transparent",
    borderRadius: normalize(16),
    paddingVertical: responsiveHeight(0.2),
  },
  sectionTitle: {
    fontSize: normalize(16),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "left",
    letterSpacing: -0.05,
    opacity: 0.95,
  },
  createRideButton: {
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
