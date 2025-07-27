import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";

import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";

import {
  dummy_upcoming_rides,
  RideData,
} from "../../dummy-data/DummyUpcomingRides";
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
  const isFocused = useIsFocused();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  //donot mess around with this code, state mgmt is crucial here
  useEffect(() => {
    if (!isFocused) return;
    setSelectedRideId(null); 
    setNavBarVariant(0);
    setNavBarText("");
    setNavBarIcon(require("../../assets/wallet.png"));
    setNavBarItems(bottomNavItems);
    return () => {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    };
  }, [isFocused]);

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
    setSelectedRideId((prev) => (prev === rideId ? null : rideId));
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
            {dummy_upcoming_rides.length} rides available
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
          {dummy_upcoming_rides.map((ride: RideData) => (
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
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AvailableRideScreen;
