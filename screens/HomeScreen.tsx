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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
  import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AppColors from "../design_systems/colors";
import MainNavBar from "../components/MainNavBar";
import RideDetailsSelector from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import bottomNavItems from "../data/BottomNavigationItems";
import { CommonLocationCoordinates } from "../components/RideDetailsSelector";
import { RootStackParamList } from "../navigation/RootStackParamList";
import BrandInfo from "../components/BrandInfo";


type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;

const { width, height } = Dimensions.get("window");

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [bothLocationsSelected, setBothLocationsSelected] = useState(false);

  // Request location permissions
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

  // Get user location
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

  useEffect(() => {
    requestLocationPermission(); // Request location permissions on component mount
  }, []);

  const handleRideSubmit = (details: {
    from: string;
    to: string;
    date: Date;
  }) => {
    console.log("Submitted ride details:", details);
  };

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
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <BrandInfo />
    </View>
      <View style={styles.scrollView}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          {hasPermission && initialRegion && location ? (
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={true}
            >
              {/* Place marker on user's current location */}
              <Marker coordinate={location} />
            </MapView>
          ) : (
            <Text style={styles.loadingText}>Loading location...</Text>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Popular Destinations */}
          <View style={styles.InDemandSection}>
            <Text style={styles.sectionTitle}>In-Demand Destinations</Text>
            <View style={styles.destinationsContainer}>
              {["Chennai", "Hyderabad", "Vellore", "Bengaluru"].map((city) => (
                <TouchableOpacity key={city} style={styles.destinationButton}>
                  <Text style={styles.destinationButtonText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Previous Trips Section */}
          <PreviousTripsSection />

          {/* New Ride Section */}
          <View style={styles.section}>
            <View style={styles.createRideText}>
              <Text style={styles.sectionTitle}>Where'd you like to go?</Text>
              <TouchableOpacity 
                style={styles.destinationButton}
                onPress={() => navigation.navigate('CreateRide')}
              >
                <Text style={styles.destinationButtonText}>Create Ride</Text>
              </TouchableOpacity>
            </View>
            <RideDetailsSelector 
              onSubmit={handleRideSubmit} 
              onLocationSelectionChange={handleLocationSelectionChange}
              userLocation={location}
            />
          </View>

          {/* Navigation Bar */}
          <View style={styles.navBarView}>
            {bothLocationsSelected ? (
              <MainNavBar
                variant={1}
                text="Search Rides"
                iconPath={require("../assets/cool-emoji.png")}
                onPress={() => navigation.navigate('AvailableRidesScreen' as never)}
              />
            ) : (
              <MainNavBar
                variant={0}
                bottomNavItems={bottomNavItems}
                iconPath={require("../assets/wallet.png")}
              />
            )}
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
    height: height * 0.25,
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: height * 0.25,
  },
  mainContent: {
    flex: 1,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    backgroundColor: AppColors.primaryLightGreen,
    padding: "2.5%",
    paddingBottom: height * 0.12,
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
    backgroundColor: "#000000",
    paddingVertical: "2%",
    paddingHorizontal: "4%",
    borderRadius: 8,
    alignItems: "center",
  },
  createRideButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2.5%",
  },
  loadingText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
});

// Custom Map Style
// const customMapStyle = [
// ];

export default HomeScreen;
