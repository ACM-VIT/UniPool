import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions, Platform, PixelRatio, PanResponder, Animated, Easing, ScrollView, InteractionManager } from "react-native";
import navigationImg from "../assets/navigation.png";
import locationPinImg from "../assets/location-pin-2.png";
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from "react-native-maps";
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
import { MAIN_NAV_BAR_TOP_OFFSET } from "../components/MainNavBar";
import bottomNavItems from "../data/BottomNavigationItems";
import BrandInfo from "../components/BrandInfo";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/PressableScale";
import RideClusterSheet, { ClusteredRide } from "../components/RideClusterSheet";
import { getAppState } from "../utils/AppStateService";
import type { AppStateResponse, NearbyRideSummary } from "../utils/AppStateService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.pinWrap}>
        <View style={styles.pinBadge}>
          <Text style={styles.pinBadgeText}>{label}</Text>
        </View>
        <View style={styles.pinTail} />
        <View style={styles.pinDot} />
      </View>
    </Marker>
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
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil, revalidate } = useApi();
  const { requireAuth, isGuest } = useAuthGate();
  const mapRef = useRef<MapView>(null);

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

const customMapStyle = React.useMemo(() => [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [
      {
        color: "#f8f8f8"
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#ffffff"
      },
      {
        weight: 2
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "simplified"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#e0e0e0"
      },
      {
        weight: 0.5
      }
    ]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        weight: 2
      }
    ]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#e0e0e0"
      },
      {
        weight: 1
      }
    ]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#b3d9ff"
      }
    ]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [
      {
        color: "#f8f8f8"
      }
    ]
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [
      {
        color: "#e8f5e8"
      }
    ]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#f0f0f0"
      }
    ]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        lightness: 20
      }
    ]
  },
  {
    featureType: "poi.business",
    elementType: "geometry",
    stylers: [
      {
        color: "#f5f5f5"
      }
    ]
  },
  {
    featureType: "poi.attraction",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        lightness: 40
      }
    ]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      }
    ]
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#d0d0d0"
      },
      {
        weight: 0.3
      }
    ]
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#273B33"
      },
      {
        weight: 1
      }
    ]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  }
], []);


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
    if (!mapRef.current) return;

    const coordinates = [from, to, userLoc];
    
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: screenHeight * 0.1,
        right: screenWidth * 0.1,
        bottom: screenHeight * 0.4,
        left: screenWidth * 0.1,
      },
      animated: true,
    });
  };

  useEffect(() => {
    requestLocationPermission();
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

  // Post-trip rating prompt — fires when the user returns to Home
  // and has at least one trip that's 12h+ past its scheduled start
  // and not yet rated. Surfaces a BrandedAlert with a single CTA
  // that opens the rating screen for the oldest pending trip. Skips
  // for guests and re-runs at most once per focus, not on every
  // render. A user who hits Later just sees the same prompt next
  // time they open the app (no persistent dismissal — these are
  // 5-second forms and we shouldn't have to nag).
  const ratingPromptShownRef = useRef(false);
  useEffect(() => {
    if (!isFocused || isGuest || ratingPromptShownRef.current) return;
    const pendingRatings = appState?.home.pending_ratings ?? [];
    if (!pendingRatings.length) return;

    ratingPromptShownRef.current = true;
    const trip = pendingRatings[0];
    BrandedAlert.show({
      title: "How was your ride?",
      body: `Rate ${trip.pending_count === 1 ? "the host" : `${trip.pending_count} riders`} on ${trip.start_location} → ${trip.end_location}. Takes 5 seconds.`,
      buttons: [
        { label: "Later", style: "cancel" },
        {
          label: "Rate now",
          style: "primary",
          onPress: () =>
            router.navigate(
              appHref("PostTripRatingScreen", { rideId: trip.ride_id }),
            ),
        },
      ],
    });
  }, [appState?.home.pending_ratings, isFocused, isGuest, router]);

  const runMapCameraUpdate = useCallback((from: LocationCoords | null, to: LocationCoords | null) => {
    const map = mapRef.current;
    if (!map) return;

    if (from && to) {
      const padTop = screenHeight * 0.10;
      const padBottom = screenHeight * (BOTTOM_SHEET_MIN_HEIGHT / screenHeight + 0.04);
      map.fitToCoordinates([from, to], {
        edgePadding: {
          top: padTop,
          bottom: padBottom,
          left: screenWidth * 0.16,
          right: screenWidth * 0.16,
        },
        animated: true,
      });
    } else if (from || to) {
      const pin = (from ?? to)!;
      map.animateToRegion(
        {
          latitude: pin.latitude,
          longitude: pin.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        },
        MAP_CAMERA_ANIMATION_MS,
      );
    } else if (initialRegion) {
      map.animateToRegion(initialRegion, MAP_CAMERA_ANIMATION_MS);
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
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            // Fall back to the seed catalogue centroid so the map has a
            // real region to draw while we wait on a GPS fix. Once we
            // have the user's actual coords we animate to them via the
            // initialRegion-watcher effect lower down.
            initialRegion={initialRegion ?? FALLBACK_REGION}
            // Only show the blue user-dot puck once permission is
            // granted — otherwise the SDK silently no-ops here.
            showsUserLocation={isFocused && hasPermission}
            // The native "my location" FAB renders as an awful
            // bare-aluminum square in the top-right on Android.
            // We have our own UX for centering on the user.
            showsMyLocationButton={false}
            toolbarEnabled={false}
            customMapStyle={customMapStyle}
            onMapReady={() => console.log("Map ready")}
          >
            {/* Service-area ring around the user — gives the map a sense of
                coverage ("UniPool finds carpools within this radius").
                Same idiom as Tesla Robotaxi's coverage polygon. */}
            {location && (
              <Circle
                center={location}
                radius={5000}
                strokeColor={AppColors.secondaryDarkGreen}
                strokeWidth={2}
                fillColor="rgba(181,215,80,0.12)"
              />
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

              {fromCoords && (
                <Marker
                  coordinate={fromCoords}
                  title="From"
                  description={rideDetails?.from}
                  image={navigationImg}
                />
              )}

              {toCoords && (
                <Marker
                  coordinate={toCoords}
                  title="To"
                  description={rideDetails?.to}
                  image={locationPinImg}
                />
              )}

            {fromCoords && toCoords && (
              <Polyline
                coordinates={routePolylineCoordinates}
                strokeColor={AppColors.secondaryDarkGreen || "#2d5016"}
                strokeWidth={3}
                lineDashPattern={[10, 10]}
                lineJoin="round"
                lineCap="round"
              />
            )}
          </MapView>
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
          {
            height: BOTTOM_SHEET_MAX_HEIGHT,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          collapsable={false}
          hitSlop={{ top: 8, bottom: 18, left: 0, right: 0 }}
          style={styles.dragHandleHitArea}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.bottomSheetContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollableContent}
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
                cardFromState={appState?.home.active_trip_card ?? null}
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
                  ridesFromState={appState?.home.user_rides ?? []}
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
              <View style={styles.createRideText}>
                <Text style={styles.sectionTitle}>Where'd you like to go?</Text>
              </View>

              <TouchableOpacity
                style={styles.createRideButton}
                onPress={() => {
                  // Posting a ride requires an authenticated student.
                  if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
                  router.navigate(appHref("CreateRide"));
                }}
              >
                <Text style={styles.createRideButtonText}>
                  {isGuest ? "Post a ride" : "Create Ride"}
                </Text>
              </TouchableOpacity>

              <RideDetailsSelector
                onSubmit={handleRideSubmit}
                onLocationSelectionChange={handleLocationSelectionChange}
                onCoordsChange={handleCoordsChange}
                userLocation={location ?? undefined}
                clearTrigger={clearRideTrigger}
              />
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
    elevation: 2,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
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
    fontSize: normalize(14),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "left",
    letterSpacing: -0.05,
    opacity: 0.95,
  },
  createRideButton: {
    // Forest fill on the lime canvas — inverse pattern. Cash App uses
    // the same trick (black pill on lime background) and it always
    // reads premium. Don't lime-on-lime; the button vanishes.
    //
    // Hard-coded paddingVertical (same reason as `nearbyTile`) so the
    // CTA reads as a real touch target on smaller Android screens.
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 18,
    paddingHorizontal: responsiveWidth(2.5),
    borderRadius: normalize(14),
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginTop: responsiveHeight(1),
    marginBottom: responsiveHeight(2),
    alignSelf: "center",
    elevation: 2,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  createRideButtonText: {
    // Forest button already does the heavy lifting visually — the
    // text doesn't need ExtraBold on top. 700Bold @ 15.5 reads
    // confident without shouting.
    color: AppColors.primaryLightGreen,
    fontSize: normalize(15.5),
    fontFamily: "NunitoSans_700Bold",
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
