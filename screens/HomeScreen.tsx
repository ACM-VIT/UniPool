import React, { useState, useEffect, useRef } from "react";
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
  PanResponder,
  Animated,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { navigationRef } from "../navigation/navigationRef";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import bottomNavItems from "../data/BottomNavigationItems";
import { RootStackParamList } from "../navigation/RootStackParamList";
import BrandInfo from "../components/BrandInfo";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

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

async function sendTokenToBackend(token: string, apiUtil: any): Promise<boolean> {
  try {
    await apiUtil.post("/users/me/token", {
      token,
      platform: Platform.OS,
      deviceId: Device.osInternalBuildId,
    });

    console.log("Token successfully sent to backend");
    return true;
  } catch (error) {
    console.error("Failed to send token to backend:", error);
    return false;
  }
}

async function sendFCMNotification(
  apiUtil: any,
  targetToken: string, 
  title: string, 
  body: string, 
  data?: Record<string, string>
): Promise<boolean> {
  try {
    await apiUtil.post("/notifications/send", {
      targetToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      platform: Platform.OS,
    });

    console.log("FCM notification sent successfully via backend");
    return true;
  } catch (error) {
    console.error("Failed to send FCM notification:", error);
    return false;
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Device.isDevice) {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Required",
          "Push notifications are needed to receive ride updates and alerts."
        );
        return null;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
      console.log("Native Push Token (FCM/APNs):", token);
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

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
  const [rideDetails, setRideDetails] = useState<{ from: string; to: string; date: Date } | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const [fromCoords, setFromCoords] = useState<LocationCoords | null>(null);
  const [toCoords, setToCoords] = useState<LocationCoords | null>(null);

  const bottomSheetY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;
  const lastGestureY = useRef(BOTTOM_SHEET_MAX_HEIGHT);

  // const customMapStyle = [
  //   {
  //     featureType: "all",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: "#f5f5f5"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "road",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: "#ffffff"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "road",
  //     elementType: "geometry.stroke",
  //     stylers: [
  //       {
  //         color: "#e8e8e8"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "water",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: "#1e00ffff"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "landscape",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: "#f9f9f9"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "poi",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: "#eeeeee"
  //       }
  //     ]
  //   },
  //   {
  //     featureType: "poi.park",
  //     elementType: "geometry",
  //     stylers: [
  //       {
  //         color: AppColors.primaryLightGreen || "#a8d8a8"
  //       }
  //     ]
  //   }
  // ];

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
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setPushToken(token);
        await sendTokenToBackend(token, apiUtil);
      }
    });

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      try {
        console.log("Notification received:", notification);
      } catch (err) {
        console.error("Error in notification received listener:", err);
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        console.log("Notification response:", response);
        if (!response || !response.notification || !response.notification.request || !response.notification.request.content) return;
        const data = response.notification.request.content.data || {};
        if (data.rideId && navigationRef.current) {
          navigationRef.current.navigate("RideDetailsScreen", { ride: { id: data.rideId } });
        }
      } catch (err) {
        console.error("Error in notification response listener:", err);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [apiUtil]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await registerForPushNotificationsAsync();
      if (newToken && newToken !== pushToken) {
        setPushToken(newToken);
        await sendTokenToBackend(newToken, apiUtil);
      }
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pushToken, apiUtil]);

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

  const isMapLoaded = location && mapRegion && hasPermission;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoContainer}>
        <BrandInfo />
      </View>

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
            // customMapStyle={customMapStyle}
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
                strokeWidth={4}
                lineDashPattern={[1, 1]}
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
      </View>

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