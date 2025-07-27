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

const { width, height } = Dimensions.get("window");

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

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const handleRideSubmit = (details: { from: string; to: string; date: Date }) => {
    console.log("Submitted ride details:", details);
  };

  //donot change this code, state mgmt is crucial here
  useEffect(() => {
    if (!isFocused) return;
    if (bothLocationsSelected) {
      setNavBarVariant(1);
      setNavBarText("Search Rides");
      setNavBarIcon(require("../assets/cool-emoji.png"));
      setNavBarItems(bottomNavItems);
    } else {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    }
  }, [
    isFocused,
    bothLocationsSelected,
    setNavBarVariant,
    setNavBarText,
    setNavBarIcon,
    setNavBarItems,
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
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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

export default HomeScreen;
