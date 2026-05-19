import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions, Platform, PixelRatio, PanResponder, Animated, Easing, ScrollView } from "react-native";
import navigationImg from "../assets/navigation.png";
import locationPinImg from "../assets/location-pin-2.png";
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "../navigation/router-compat";
import { NativeStackNavigationProp } from "../navigation/router-compat";

import { useApi } from "../utils/ApiUtil";
import baseURL from "../config/urlconfig";
import { useAuthGate } from "../contexts/AuthGate";
import AppColors from "../design_systems/colors";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import ActiveTripCard from "../components/ActiveTripCard";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../components/MainNavBar";
import bottomNavItems from "../data/BottomNavigationItems";
import { RootStackParamList } from "../navigation/RootStackParamList";
import BrandInfo from "../components/BrandInfo";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/PressableScale";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeScreen"
>;

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

// --- Map prompt -------------------------------------------------------
// Pill overlay sitting under the BrandInfo header. The selector below
// picks the right contextual message from the current state; the
// component animates opacity instead of pop-rendering, so the chip
// doesn't flicker as the user types into From/To or the nearby-count
// resolves.
type MapPromptProps = {
  fromCoords: LocationCoords | null;
  toCoords: LocationCoords | null;
  nearbyCount: number | null;
};

const pickPromptMessage = ({ fromCoords, toCoords, nearbyCount }: MapPromptProps): string | null => {
  if (fromCoords && toCoords) return "Route preview · tap a ride below";
  if (fromCoords) return "Pick a destination";
  if (toCoords) return "Pick a pickup point";
  if (nearbyCount && nearbyCount > 0) {
    return nearbyCount === 1
      ? "1 carpool within 5 km of you"
      : `${nearbyCount} carpools within 5 km of you`;
  }
  return null;
};

const MapPrompt: React.FC<MapPromptProps> = (props) => {
  const message = pickPromptMessage(props);
  // Keep the previous message painted while we fade out, so the text
  // doesn't blank-out mid-animation. Cleared once the chip is hidden.
  const [renderedMessage, setRenderedMessage] = useState<string | null>(message);
  const opacity = useRef(new Animated.Value(message ? 1 : 0)).current;

  useEffect(() => {
    if (message) setRenderedMessage(message);
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !message) setRenderedMessage(null);
    });
  }, [message, opacity]);

  if (!renderedMessage) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.mapPrompt, { opacity }]}>
      <View style={styles.mapPromptInner}>
        <View style={styles.mapPromptDot} />
        <Text style={styles.mapPromptText}>{renderedMessage}</Text>
      </View>
    </Animated.View>
  );
};
const DRAG_THRESHOLD = 10;

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
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { apiUtil } = useApi();
  const { requireAuth, isGuest } = useAuthGate();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [allFieldsSelected, setAllFieldsSelected] = useState(false);
  // Counter that, when bumped, makes RideDetailsSelector wipe its
  // From / To fields. Driven by the Search Rides X button via the
  // `window.mainNavBarOnClose` global (set up next to
  // `mainNavBarOnPress` in the variant-1 effect below).
  const [clearRideTrigger, setClearRideTrigger] = useState(0);
  // Set by `PreviousTripsSection` when its API resolves with at least
  // one trip. Drives the "Your trips ↔ Rides around you" mutual
  // exclusion on the home sheet.
  const [hasUserTrips, setHasUserTrips] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  } | null>(null);

  // Nearby-activity stat for the map pill. `null` = unknown (haven't
  // fetched yet); a number means we have a confirmed answer. The pill
  // only renders when count > 0 so an empty area doesn't read as broken.
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  // Nearby ride summaries used to plot pins on the map.
  type NearbyRide = {
    id: string;
    start_location: string;
    end_location: string;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    start_time: string;
    total_seats: number;
    booked_seats: number;
    total_price: number;
  };
  const [nearbyRides, setNearbyRides] = useState<NearbyRide[]>([]);

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
      // 4 decimal places ≈ 11 m precision — enough to group taxis
      // leaving from the same building.
      const key = `${r.start_latitude.toFixed(4)},${r.start_longitude.toFixed(4)}`;
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

const customMapStyle = [
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
];


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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      if (!hasPermission) setHasPermission(true);
      if (!location) await getUserLocation();
    } else {
      if (hasPermission) setHasPermission(false);
      console.log("Location permission denied");
    }
  };

  const getUserLocation = async () => {
    if (location) return;
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      const userLocation = { latitude, longitude };
      setLocation(userLocation);

      const latitudeDelta = 0.02;
      const longitudeDelta = 0.02;

      const latOffset = latitudeDelta * 0.45;

      const region = {
        latitude: latitude - latOffset,
        longitude,
        latitudeDelta,
        longitudeDelta,
      };
      setInitialRegion(region);
      setMapRegion(region);
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

  // Refresh nearby-ride data whenever the user's location is known.
  // Public endpoints — both safe to call before sign-in. The full
  // ride list drives the map pins; the count drives the prompt pill
  // (and is also derivable from the list, but we keep the dedicated
  // count endpoint cheap for the "no rides nearby" case where we
  // don't want to download empty payloads).
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    const fetchNearby = async () => {
      try {
        const url = `${baseURL}/rides/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=5000&limit=30`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(String(resp.status));
        const json = await resp.json();
        const list: NearbyRide[] = Array.isArray(json?.rides) ? json.rides : [];
        if (!cancelled) {
          setNearbyRides(list);
          setNearbyCount(list.length);
        }
      } catch {
        if (!cancelled) {
          setNearbyRides([]);
          setNearbyCount(0);
        }
      }
    };
    fetchNearby();
    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude]);

  const handleRideSubmit = async (details: { 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  }) => {
    setRideDetails(details);
    setAllFieldsSelected(true);
    
    if (!details.from || !details.to) return;

    // Use coordinates provided by RideDetailsSelector if available, otherwise geocode
    let fromLocation = details.fromCoordinates;
    let toLocation = details.toCoordinates;
    
    // Only geocode if coordinates weren't provided
    if (!fromLocation || !toLocation) {
      const [geocodedFrom, geocodedTo] = await Promise.all([
        !fromLocation ? geocodeAddress(details.from) : Promise.resolve(fromLocation),
        !toLocation ? geocodeAddress(details.to) : Promise.resolve(toLocation),
      ]);
      fromLocation = geocodedFrom || undefined;
      toLocation = geocodedTo || undefined;
    }

    if (fromLocation && toLocation && location) {
      setFromCoords(fromLocation);
      setToCoords(toLocation);
      fitMapToWaypoints(fromLocation, toLocation, location);
    } else {
      // BrandedAlert.alert(
      //   "Could not find location",
      //   "Please check your 'From' and 'To' addresses and try again."
      // );
    }
  };

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
        navigation.navigate("AvailableRidesScreen", params);
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
    navigation,
  ]);

  // Drives the live map preview as the user picks locations. Fires
  // whenever either field's coords change — including when only one is
  // set. Camera animates to fit whatever's known.
  const handleCoordsChange = (
    from: LocationCoords | null,
    to: LocationCoords | null,
  ) => {
    setFromCoords(from);
    setToCoords(to);

    if (!mapRef.current) return;

    if (from && to) {
      // Both pins — fit a tight bbox around just the route.
      // We deliberately exclude the user's location because a From/To
      // far from the user (e.g. inter-city trip) would force the camera
      // to fit a whole country to keep the home pin in frame.
      const padTop = screenHeight * 0.10;
      const padBottom = screenHeight * (BOTTOM_SHEET_MIN_HEIGHT / screenHeight + 0.04);
      mapRef.current.fitToCoordinates([from, to], {
        edgePadding: {
          top: padTop,
          bottom: padBottom,
          left: screenWidth * 0.16,
          right: screenWidth * 0.16,
        },
        animated: true,
      });
    } else if (from || to) {
      // Single pin — animate to that point with a moderate zoom so the
      // user sees where they just dropped it.
      const pin = (from ?? to)!;
      mapRef.current.animateToRegion(
        {
          latitude: pin.latitude,
          longitude: pin.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        },
        420,
      );
    } else if (initialRegion) {
      // Both cleared — fall back to the user's vicinity.
      mapRef.current.animateToRegion(initialRegion, 420);
    }
  };

  const handleLocationSelectionChange = (hasFromAndTo: boolean) => {
    setBothLocationsSelected(hasFromAndTo);

    if (!hasFromAndTo) {
      setAllFieldsSelected(false);
      setRideDetails(null);
      // Note: fromCoords / toCoords are now driven by handleCoordsChange,
      // which also resets the camera when both pins are cleared.
    }
  };

  const getPolylineCoordinates = () => {
    if (!fromCoords || !toCoords) return [];
    return generateCurvedRoute(fromCoords.latitude, fromCoords.longitude, toCoords.latitude, toCoords.longitude);
  };

  const isMapLoaded = location && mapRegion && hasPermission;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoContainer}>
        <BrandInfo />
      </View>

      <View style={styles.mapContainer}>
        {isMapLoaded ? (
          <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialRegion}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
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

            {/* Nearby ride pins — Bolt / Uber pattern: a forest price
                chip with a tail pointing down to the pickup coord.
                Multiple rides starting from the same point collapse
                into ONE pin showing "From ₹X · N rides"; tapping it
                opens the cheapest. Anchored at the tail tip so the
                lime dot sits on the actual coord. Hidden once the
                user has picked a From/To (route preview wins). */}
            {!fromCoords && !toCoords && clusteredNearbyRides.map((c) => (
              <Marker
                key={c.key}
                coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                onPress={() =>
                  navigation.navigate("AvailableRidesSelectedScreen" as any, {
                    ride: c.cheapest,
                  } as any)
                }
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.pinWrap}>
                  <View style={styles.pinBadge}>
                    <Text style={styles.pinBadgeText}>
                      {c.rides.length > 1
                        ? `From ₹${c.cheapestPrice}`
                        : `₹${c.cheapestPrice}`}
                    </Text>
                    {c.rides.length > 1 ? (
                      <View style={styles.pinBadgeCount}>
                        <Text style={styles.pinBadgeCountText}>{c.rides.length}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.pinTail} />
                  <View style={styles.pinDot} />
                </View>
              </Marker>
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
                coordinates={getPolylineCoordinates()}
                strokeColor={AppColors.secondaryDarkGreen || "#2d5016"}
                strokeWidth={3}
                lineDashPattern={[10, 10]}
                lineJoin="round"
                lineCap="round"
              />
            )}
          </MapView>

          {/* Contextual prompt overlay — driven by a single message
              selector. Wrapped in an Animated.View so it fades in/out
              instead of popping when the route / count state shifts. */}
          <MapPrompt
            fromCoords={fromCoords}
            toCoords={toCoords}
            nearbyCount={nearbyCount}
          />
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
                onPressOpen={(rideId) =>
                  navigation.navigate("RideDetailsScreen", { rideId } as any)
                }
              />
            )}

            {/* Mutually exclusive: when the signed-in user has trips,
                show "Your trips" and hide "Rides around you" — and
                vice versa. Guests never see the trips carousel; they
                always see the nearby tile. This avoids the home sheet
                looking like a catalog of redundant CTAs. */}
            {!isGuest && (
              <View style={styles.previousTripsWrapper}>
                <PreviousTripsSection onHasTripsChange={setHasUserTrips} />
              </View>
            )}

            {!hasUserTrips && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.nearbyTile}
                onPress={() => navigation.navigate("NearbyRidesScreen" as any)}
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
                  navigation.navigate("CreateRide");
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
  mapPrompt: {
    // Floating chip sits below the BrandInfo header so it doesn't compete
    // with the logo, but well above the bottom sheet's resting position.
    position: "absolute",
    top: responsiveHeight(11),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 6,
  },
  mapPromptInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  mapPromptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 8,
  },
  mapPromptText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.2,
    color: AppColors.primaryLightGreen,
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
    // Quiet sub-header — sentence-case so a question (which this is)
    // doesn't read awkwardly as uppercase. 14/SemiBold @ 0.7 opacity
    // sits as a calm label that won't compete with the Create Ride
    // button or the trip card.
    fontSize: normalize(14),
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "left",
    letterSpacing: -0.05,
    opacity: 0.7,
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
