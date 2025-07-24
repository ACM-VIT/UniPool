import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  MapPin,
  ChevronLeft,
} from "lucide-react-native";
import {
  dummy_upcoming_rides,
  RideData,
} from "../../dummy-data/DummyUpcomingRides";
import RideCard from "../../components/RideCard";
import AppColors from "../../design_systems/colors";
import MainNavBar from "../../components/MainNavBar";
import bottomNavItems from "../../data/BottomNavigationItems";
import styles from "./AvailableRideScreens.styles";

// Main component
const AvailableRideScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);

  const handleRideSelection = (rideId: string): void => {
    console.log(`Selected ride ID: ${rideId}`);
    if (selectedRideId === rideId) {
      setSelectedRideId(null); // Deselect if already selected
      setNavBarVariant(0); // Reset the navigation bar variant
      console.log("Ride deselected");
    } else {
      setSelectedRideId(rideId); // Select the ride
      setNavBarVariant(1); // Change the navigation bar variant
    }
  };

  const handleViewDetails = () => {
    if (selectedRideId) {
      navigation.navigate('AvailableRidesSelectedScreen' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={20} color={AppColors.secondaryDarkGreen} />
          <Text style={styles.headerText}>Vellore Institute of Technology</Text>
        </View>
        <Text style={styles.brandText}>UniPool</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity>
          <ChevronLeft size={22} color={AppColors.basicBlack} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Available Rides</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

      {/* Navigation Bar */}
      <View style={styles.navBarView}>
        <MainNavBar
          variant={navBarVariant}
          bottomNavItems={bottomNavItems}
          iconPath={require("../../assets/wallet.png")}
          text="View Details"
          onPress={handleViewDetails}
        />
      </View>
    </SafeAreaView>
  );
};

export default AvailableRideScreen;
