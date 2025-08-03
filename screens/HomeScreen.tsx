import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Platform,
  PixelRatio,
  PanResponder,
  Animated,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import bottomNavItems from "../data/BottomNavigationItems";
import { RootStackParamList } from "../navigation/RootStackParamList";
import BrandInfo from "../components/BrandInfo";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeScreen"
>;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const pixelRatio = PixelRatio.get();
const fontScale = PixelRatio.getFontScale();

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

const BOTTOM_SHEET_MAX_HEIGHT = screenHeight * 0.75;
const BOTTOM_SHEET_MIN_HEIGHT = screenHeight * 0.35;
const SNAP_POINTS = [BOTTOM_SHEET_MIN_HEIGHT, BOTTOM_SHEET_MAX_HEIGHT];
const DRAG_THRESHOLD = 10;

interface HomeScreenProps {
  setNavBarVariant: (variant: 0 | 1 | 2) => void;
  setNavBarText: (text: string) => void;
  setNavBarIcon: (icon: any) => void;
  setNavBarItems: (items: any[]) => void;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
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

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  } | null>(null);

  const [fromCoords, setFromCoords] = useState<LocationCoords | null>(null);
  const [toCoords, setToCoords] = useState<LocationCoords | null>(null);

  const bottomSheetY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;
  const lastGestureY = useRef(BOTTOM_SHEET_MAX_HEIGHT);

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


  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > DRAG_THRESHOLD;
    },
    onPanResponderGrant: () => {
      // @ts-ignore: access private property for current value
      lastGestureY.current = bottomSheetY['__getValue']();
    },
    onPanResponderMove: (evt, gestureState) => {
      const newHeight = lastGestureY.current - gestureState.dy;
      
      if (newHeight < BOTTOM_SHEET_MIN_HEIGHT) {
        const overscroll = BOTTOM_SHEET_MIN_HEIGHT - newHeight;
        const resistedHeight = BOTTOM_SHEET_MIN_HEIGHT - overscroll * 0.3;
        bottomSheetY.setValue(Math.max(resistedHeight, BOTTOM_SHEET_MIN_HEIGHT - 50));
      } else if (newHeight > BOTTOM_SHEET_MAX_HEIGHT) {
        const overscroll = newHeight - BOTTOM_SHEET_MAX_HEIGHT;
        const resistedHeight = BOTTOM_SHEET_MAX_HEIGHT + overscroll * 0.3;
        bottomSheetY.setValue(Math.min(resistedHeight, BOTTOM_SHEET_MAX_HEIGHT + 50));
      } else {
        bottomSheetY.setValue(newHeight);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const velocity = -gestureState.vy;
      // @ts-ignore: access private property for current value
      const currentHeight = bottomSheetY['__getValue']();
      
      let targetHeight = SNAP_POINTS.reduce((prev, curr) => {
        return Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev;
      });
      
      if (Math.abs(velocity) > 500) {
        if (velocity > 0) {
          targetHeight = BOTTOM_SHEET_MAX_HEIGHT;
        } else {
          targetHeight = BOTTOM_SHEET_MIN_HEIGHT;
        }
      }
      
      Animated.spring(bottomSheetY, {
        toValue: targetHeight,
        velocity: velocity,
        tension: 300,
        friction: 30,
        useNativeDriver: false,
      }).start();
    },
  });

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

      const region = {
        latitude: latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
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
    const coordinates = [from, to, userLoc];

    const minLat = Math.min(...coordinates.map(coord => coord.latitude));
    const maxLat = Math.max(...coordinates.map(coord => coord.latitude));
    const minLng = Math.min(...coordinates.map(coord => coord.longitude));
    const maxLng = Math.max(...coordinates.map(coord => coord.longitude));

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.5;
    const deltaLng = (maxLng - minLng) * 1.5;

    setMapRegion({
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(deltaLat, 0.02),
      longitudeDelta: Math.max(deltaLng, 0.02),
    });
  };

  useEffect(() => {
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRideSubmit = async (details: { 
    from: string; 
    to: string; 
    date: Date;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  }) => {
    setRideDetails(details);
    if (!details.from || !details.to) return;

    const [fromLocation, toLocation] = await Promise.all([
      geocodeAddress(details.from),
      geocodeAddress(details.to),
    ]);

    if (fromLocation && toLocation && location) {
      setFromCoords(fromLocation);
      setToCoords(toLocation);
      fitMapToWaypoints(fromLocation, toLocation, location);
    } else {
      // Alert.alert(
      //   "Could not find location",
      //   "Please check your 'From' and 'To' addresses and try again."
      // );
    }
  };

  // Don't change this code, state mgmt is crucial here
  useEffect(() => {
    if (!isFocused) return;
    if (bothLocationsSelected) {
      setNavBarVariant(1);
      setNavBarText("Search Rides");
      setNavBarIcon(require("../assets/cool-emoji.png"));
      setNavBarItems(bottomNavItems);
      (window as any).mainNavBarOnPress = () => {
        if (rideDetails) {
          navigation.navigate("AvailableRidesScreen", {
            fromLocation: rideDetails.from,
            toLocation: rideDetails.to,
            fromCoordinates: rideDetails.fromCoordinates,
            toCoordinates: rideDetails.toCoordinates,
          });
        }
      };
    } else {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
      (window as any).mainNavBarOnPress = undefined;
    }
  }, [
    isFocused,
    bothLocationsSelected,
    setNavBarVariant,
    setNavBarText,
    setNavBarIcon,
    setNavBarItems,
    rideDetails,
    navigation,
  ]);

  const handleLocationSelectionChange = (hasFromAndTo: boolean) => {
    setBothLocationsSelected(hasFromAndTo);

    if (!hasFromAndTo) {
      setFromCoords(null);
      setToCoords(null);
      if (initialRegion) {
        setMapRegion(initialRegion);
      }
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

      <Animated.View 
        style={[
          styles.mapContainer,
          {
            bottom: bottomSheetY,
          }
        ]}
      >
        {isMapLoaded ? (
          <MapView
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
            <Marker 
              coordinate={location}
              title="Your Location"
              pinColor={AppColors.secondaryDarkGreen || "#2d5016"}
            />

            {fromCoords && (
              <Marker
                coordinate={fromCoords}
                title="From"
                description={rideDetails?.from}
                pinColor="#4CAF50"
              />
            )}

            {toCoords && (
              <Marker
                coordinate={toCoords}
                title="To"
                description={rideDetails?.to}
                pinColor="#FF5722"
              />
            )}

            {fromCoords && toCoords && (
              <Polyline
                coordinates={getPolylineCoordinates()}
                strokeColor={AppColors.secondaryDarkGreen || "#2d5016"}
                strokeWidth={3}
                lineDashPattern={[0]}
                lineJoin="round"
                lineCap="round"
              />
            )}
          </MapView>
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
      </Animated.View>

      <Animated.View 
        style={[
          styles.bottomSheet,
          {
            height: bottomSheetY,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandle} />
        
        <View style={styles.bottomSheetContent}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollableContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <PreviousTripsSection />
            
            <View style={styles.section}>
              <View style={styles.createRideText}>
                <Text style={styles.sectionTitle}>Where'd you like to go?</Text>
              </View>
              
              <TouchableOpacity
                style={styles.createRideButton}
                onPress={() => {
                  navigation.navigate("CreateRide");
                }}
              >
                <Text style={styles.createRideButtonText}>Create Ride</Text>
              </TouchableOpacity>
              
              <RideDetailsSelector
                onSubmit={handleRideSubmit}
                onLocationSelectionChange={handleLocationSelectionChange}
                userLocation={location ?? undefined}
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
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: "100%",
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
    color: "#666",
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: normalize(32),
    borderTopRightRadius: normalize(32),
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: AppColors.basicBlack,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
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
    paddingBottom: Math.max(responsiveHeight(12), 50),
    minHeight: BOTTOM_SHEET_MAX_HEIGHT - 60,
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveHeight(3),
  },
  sectionTitle: {
    fontSize: normalize(20),
    color: "#000",
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    maxWidth: "90%",
  },
  createRideButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: normalize(16),
    paddingHorizontal: responsiveWidth(2.5),
    borderRadius: normalize(12),
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginTop: responsiveHeight(1),
    marginBottom: responsiveHeight(2),
    alignSelf: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  createRideButtonText: {
    color: "#FFFFFF",
    fontSize: normalize(18),
    fontFamily: "NunitoSans_400Regular",
    fontWeight: "500",
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