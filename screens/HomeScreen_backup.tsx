import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
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

const { width, height } = Dimensions.get("window");

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Remove the FCM service account key - we'll use Firebase auth token instead

async function sendTokenToBackend(token: string, apiUtil: any): Promise<boolean> {
  try {
    // Use your existing API utility which import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
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

const { width, height } = Dimensions.get("window");

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function sendTokenToBackend(token: string, apiUtil: any): Promise<boolean> {
  try {
    // Use your existing API utility which handles Firebase auth automatically
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

// Function to send FCM notification via your backend (recommended approach)
async function sendFCMNotification(
  apiUtil: any,
  targetToken: string, 
  title: string, 
  body: string, 
  data?: Record<string, string>
): Promise<boolean> {
  try {
    // Send notification request to your backend
    // Your backend will handle the FCM API call with proper service account auth
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

  // Check if device is physical (not simulator/emulator)
  if (Device.isDevice) {
    try {
      // On Android 13+: create channel so the permission prompt appears
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // Request permissions
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

      // Get the native device push token (FCM for Android, APNs for iOS)
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

const HomeScreen: React.FC<HomeScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { apiUtil } = useApi(); // Get the API utility with Firebase auth

  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ from: string; to: string; date: Date } | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      getUserLocation();
      setHasPermission(true);
    } else {
      setHasPermission(false);
      console.log("Location permission denied");
    }
  };

  const getUserLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  // Setup push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setPushToken(token);
        await sendTokenToBackend(token, apiUtil);
      }
    });

    // Listen for incoming notifications while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
      // Handle notification when app is in foreground
    });

    // Listen for notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      if (data.rideId) {
        // Navigate to ride details or relevant screen
        // navigation.navigate("RideDetails", { rideId: data.rideId });
      }
    });

    // Cleanup listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [apiUtil]);

  // Handle token refresh (tokens can change)
  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await registerForPushNotificationsAsync();
      if (newToken && newToken !== pushToken) {
        setPushToken(newToken);
        await sendTokenToBackend(newToken, apiUtil);
      }
    }, 24 * 60 * 60 * 1000); // Check daily

    return () => clearInterval(interval);
  }, [pushToken, apiUtil]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const handleRideSubmit = (details: { from: string; to: string; date: Date }) => {
    setRideDetails(details);
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <BrandInfo />
      </View>
      <View style={styles.scrollView}>
        <View style={styles.mapContainer}>
          {hasPermission && initialRegion && location ? (
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              region={initialRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              toolbarEnabled={false}
              onMapReady={() => console.log("Map ready")}
            >
              <Marker coordinate={location} />
            </MapView>
          ) : (
            <Text style={styles.loadingText}></Text>
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
              userLocation={location}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}; Firebase auth automatically
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

// Function to send FCM notification via your backend (recommended approach)
async function sendFCMNotification(
  apiUtil: any,
  targetToken: string, 
  title: string, 
  body: string, 
  data?: Record<string, string>
): Promise<boolean> {
  try {
    // Send notification request to your backend
    // Your backend will handle the FCM API call with proper service account auth
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

  // Check if device is physical (not simulator/emulator)
  if (Device.isDevice) {
    try {
      // On Android 13+: create channel so the permission prompt appears
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // Request permissions
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

      // Get the native device push token (FCM for Android, APNs for iOS)
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

const HomeScreen: React.FC<HomeScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { apiUtil } = useApi(); // Get the API utility with Firebase auth

  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ from: string; to: string; date: Date } | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      getUserLocation();
      setHasPermission(true);
    } else {
      setHasPermission(false);
      console.log("Location permission denied");
    }
  };

  const getUserLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  // Setup push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setPushToken(token);
        await sendTokenToBackend(token, apiUtil);
      }
    });

    // Listen for incoming notifications while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
      // Handle notification when app is in foreground
    });

    // Listen for notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      if (data.rideId) {
        // Navigate to ride details or relevant screen
        // navigation.navigate("RideDetails", { rideId: data.rideId });
      }
    });

    // Cleanup listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [apiUtil]);

  // Handle token refresh (tokens can change)
  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await registerForPushNotificationsAsync();
      if (newToken && newToken !== pushToken) {
        setPushToken(newToken);
        await sendTokenToBackend(newToken, apiUtil);
      }
    }, 24 * 60 * 60 * 1000); // Check daily

    return () => clearInterval(interval);
  }, [pushToken, apiUtil]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

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

  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);
  const [rideDetails, setRideDetails] = useState<{ from: string; to: string; date: Date } | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      getUserLocation();
      setHasPermission(true);
    } else {
      setHasPermission(false);
      console.log("Location permission denied");
    }
  };

  const getUserLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  // Setup push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setPushToken(token);
        await sendTokenToBackend(token);
      }
    });

    // Listen for incoming notifications while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
      // Handle notification when app is in foreground
    });

    // Listen for notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      if (data.rideId) {
        // Navigate to ride details or relevant screen
        // navigation.navigate("RideDetails", { rideId: data.rideId });
      }
    });

    // Cleanup listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Handle token refresh (tokens can change)
  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await registerForPushNotificationsAsync();
      if (newToken && newToken !== pushToken) {
        setPushToken(newToken);
        await sendTokenToBackend(newToken);
      }
    }, 24 * 60 * 60 * 1000); // Check daily

    return () => clearInterval(interval);
  }, [pushToken]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const handleRideSubmit = (details: { from: string; to: string; date: Date }) => {
    setRideDetails(details);
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <BrandInfo />
      </View>
      <View style={styles.scrollView}>
        <View style={styles.mapContainer}>
          {hasPermission && initialRegion && location ? (
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              region={initialRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              toolbarEnabled={false}
              onMapReady={() => console.log("Map ready")}
            >
              <Marker coordinate={location} />
            </MapView>
          ) : (
            <Text style={styles.loadingText}></Text>
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
              userLocation={location}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.basicWhite,
  },
  scrollView: {
    width: "100%",
    height: "100%",
  },
  mapContainer: {
    width: "100%",
    height: height * 0.26,
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: height * 0.23,
  },
  mainContent: {
    flex: 1,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    backgroundColor: AppColors.primaryLightGreen,
    padding: "2.5%",
    paddingBottom: height * 0.09,
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.03,
  },
  InDemandSection: {
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "2.5%",
  },
  YourTripsSection: {
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "2.5%",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    fontFamily: "NunitoSans_600SemiBold",
  },
  destinationsContainer: {
    paddingVertical: "2.5%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  destinationButton: {
    backgroundColor: AppColors.basicBlack,
    paddingVertical: "2%",
    paddingHorizontal: "4%",
    borderRadius: 8,
  },
  destinationButtonText: {
    color: AppColors.basicWhite,
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
  },
  createRideButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    paddingHorizontal: "2.5%",
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "center",
    elevation: 2,
  },
  createRideButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "NunitoSans_400Regular",
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
    top: 95,
  },
  createRideText: {
    width: "100%",
    flexDirection: "row",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
  },
});

export default HomeScreen;