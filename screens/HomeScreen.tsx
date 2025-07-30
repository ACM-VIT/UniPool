import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  PixelRatio,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
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

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ from: string; to: string; date: Date } | null>(null);
  const [fromCoords, setFromCoords] = useState<LocationCoords | null>(null);
  const [toCoords, setToCoords] = useState<LocationCoords | null>(null);

  const customMapStyle = [
    {
      featureType: "all",
      elementType: "geometry",
      stylers: [
        {
          color: "#f5f5f5"
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
          color: "#e8e8e8"
        }
      ]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [
        {
          color: AppColors.primaryLightGreen || "#a8d8a8"
        }
      ]
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [
        {
          color: "#f9f9f9"
        }
      ]
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [
        {
          color: "#eeeeee"
        }
      ]
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [
        {
          color: AppColors.primaryLightGreen || "#a8d8a8"
        }
      ]
    }
  ];

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
        latitude,
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

  const handleRideSubmit = async (details: { from: string; to: string; date: Date }) => {
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
      Alert.alert(
        "Could not find location",
        "Please check your 'From' and 'To' addresses and try again."
      );
    }
  };

  //donot change this code, state mgmt is crucial here
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
    return [fromCoords, toCoords];
  };

  // Determine background color: basicWhite on initial load, then primaryLightGreen when map loads
  const isMapLoaded = location && mapRegion && hasPermission;
  const containerBg = isMapLoaded ? AppColors.basicWhite : AppColors.primaryLightGreen;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]}> 
      <View style={styles.brandInfoContainer}>
        <BrandInfo />
      </View>

      <View style={styles.scrollView}>
        <View style={styles.mapContainer}>
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
                title="From"
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
                  strokeWidth={4}
                  lineDashPattern={[1, 1]}
                />
              )}
            </MapView>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        </View>

        <View style={styles.mainContent}>
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
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    minHeight: screenHeight,
  },
  mapContainer: {
    width: "100%",
    height: Math.min(responsiveHeight(26), 280),
    minHeight: Math.max(responsiveHeight(20), 180),
    zIndex: 1,
    borderBottomLeftRadius: normalize(32),
    borderBottomRightRadius: normalize(32),
    overflow: "hidden",
    backgroundColor: AppColors.primaryLightGreen,
  },
  map: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: normalize(16),
    color: "#666",
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  mainContent: {
    flex: 1,
    borderTopRightRadius: normalize(32),
    borderTopLeftRadius: normalize(32),
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: responsiveWidth(2.5),
    paddingTop: 10,
    paddingBottom: Math.max(responsiveHeight(12), 50),
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveHeight(3),
    backgroundColor: AppColors.primaryLightGreen,
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
});

export default HomeScreen;