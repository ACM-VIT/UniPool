import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location"; // Import Expo Location

import AppColors from "../design_systems/colors";
import MainNavBar from "../components/MainNavBar";
import RideDetailsSelector from "../components/RideDetailsSelector";
import PreviousTripsSection from "../components/PreviousTripsSection";
import bottomNavItems from "../data/BottomNavigationItems";
import { CommonLocationCoordinates } from "../components/RideDetailsSelector";

const { width, height } = Dimensions.get("window");

const HomeScreen: React.FC = () => {
  const [location, setLocation] = useState<any>(null); // State for storing location
  const [initialRegion, setInitialRegion] = useState<any>(null); // State for initial region
  const [hasPermission, setHasPermission] = useState(false); // State for permission status

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

  return (
    <SafeAreaView style={styles.container}>
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
            <Text>Loading location...</Text>
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
              <TouchableOpacity style={styles.destinationButton}>
                <Text style={styles.destinationButtonText}>Create Ride</Text>
              </TouchableOpacity>
            </View>
            <RideDetailsSelector onSubmit={handleRideSubmit} />
          </View>

          {/* Navigation Bar */}
          <View style={styles.navBarView}>
            <MainNavBar
              variant={0}
              bottomNavItems={bottomNavItems}
              iconPath={require("../assets/wallet.png")}
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
    height: height * 0.25,
    zIndex: 1,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: height * 0.25,
  },
  mainContent: {
    height: height * 0.8,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    backgroundColor: AppColors.primaryLightGreen,
    padding: "2.5%",
    justifyContent: "space-evenly",
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: "2.5%",
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
    fontSize: 18,
    fontWeight: "600",
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
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  createRideText: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2.5%",
  },
});

// Custom Map Style
// const customMapStyle = [
// ];

export default HomeScreen;
