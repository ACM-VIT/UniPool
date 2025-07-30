import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation, useIsFocused, useRoute } from "@react-navigation/native";

import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";

import {
} from "../../dummy-data/DummyUpcomingRides";
import { useApi } from "../../utils/ApiUtil";
import bottomNavItems from "../../data/BottomNavigationItems";
import styles from "./AvailableRideScreens.styles";

interface AvailableRideScreenProps {
  setNavBarVariant: (variant: 0 | 1 | 2) => void;
  setNavBarText: (text: string) => void;
  setNavBarIcon: (icon: any) => void;
  setNavBarItems: (items: any[]) => void;
}

const AvailableRideScreen: React.FC<AvailableRideScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { apiUtil } = useApi();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

let fromLocation = "";
let toLocation = "";
if (route.params && typeof route.params === "object") {
  if ("fromLocation" in route.params && typeof (route.params as any).fromLocation === "string") {
    fromLocation = (route.params as any).fromLocation;
  }
  if ("toLocation" in route.params && typeof (route.params as any).toLocation === "string") {
    toLocation = (route.params as any).toLocation;
  }
  if ((route.params as any).params) {
    const nested = (route.params as any).params;
    if (typeof nested.fromLocation === "string") {
      fromLocation = nested.fromLocation;
    }
    if (typeof nested.toLocation === "string") {
      toLocation = nested.toLocation;
    }
  }
}
if (!fromLocation || !toLocation) {
  try {
    const navState = (navigation as any).getState?.();
    if (navState && navState.routes) {
      const currentRoute = navState.routes[navState.index ?? 0];
      if (currentRoute && currentRoute.params) {
        if (typeof currentRoute.params.fromLocation === "string") {
          fromLocation = currentRoute.params.fromLocation;
        }
        if (typeof currentRoute.params.toLocation === "string") {
          toLocation = currentRoute.params.toLocation;
        }
      }
    }
  } catch (e) {
  }
}
console.log("AvailableRideScreen params:", { fromLocation, toLocation });

  useEffect(() => {
    if (!isFocused) return;
    setSelectedRideId(null); 
    setNavBarVariant(0);
    setNavBarText("");
    setNavBarIcon(require("../../assets/wallet.png"));
    setNavBarItems(bottomNavItems);
    if (fromLocation && toLocation) {
      setLoading(true);
      console.log("Fetching rides for:", { fromLocation, toLocation });
      apiUtil
        .get<any[]>(`/ride/search?start_location=${encodeURIComponent(fromLocation)}&end_location=${encodeURIComponent(toLocation)}`)
        .then((data) => {
          console.log("API response:", data);
          setRides(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("API error:", err);
          setRides([]);
        })
        .finally(() => setLoading(false));
    } else {
      console.log("No locations provided, not fetching rides.");
      setRides([]);
    }
    return () => {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    };
  }, [isFocused, fromLocation, toLocation]);

  useEffect(() => {
    if (!isFocused) return;
    if (selectedRideId) {
      setNavBarVariant(2);
      setNavBarText("View Details");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    } else {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    }
  }, [
    isFocused,
    selectedRideId,
    setNavBarVariant,
    setNavBarText,
    setNavBarIcon,
    setNavBarItems,
  ]);

  const handleRideSelection = (rideId: string) => {
    const selectedRide = rides.find(ride => ride.id === rideId);
    if (selectedRide) {
      // Navigate to detailed screen with ride data
      (navigation as any).navigate("AvailableRidesSelectedScreen", { 
        ride: selectedRide 
      });
    } else {
      setSelectedRideId((prev) => (prev === rideId ? null : rideId));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>

      <View style={styles.ridesHeaderRow}>
        <View style={styles.ridesHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.ridesCountText}>
            {loading ? "Loading..." : `${rides.length} rides available`}
          </Text>
        </View>
        <View style={styles.ridesHeaderRight}>
          <TouchableOpacity
            style={styles.createRideButton}
            onPress={() => (navigation as any).navigate("CreateRide")}
          >
            <Text style={styles.createRideButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {rides.length === 0 && !loading ? (
            <Text style={{ textAlign: "center", marginTop: 40 }}>No rides found for selected locations.</Text>
          ) : (
            rides.map((ride: any) => (
              <RideCard
                key={ride.id}
                id={ride.id}
                origin={ride.start_location}
                destination={ride.end_location}
                time={new Date(ride.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                price={ride.total_price}
                isSelected={selectedRideId === ride.id}
                seatsAvailable={`${ride.total_seats - ride.booked_seats}/${ride.total_seats}`}
                onSelect={handleRideSelection}
                pricePerPerson={false}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AvailableRideScreen;
