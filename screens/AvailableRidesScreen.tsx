import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import {
  MapPin,
  Navigation2,
  Clock,
  CreditCard,
  Users,
  ChevronLeft,
  Home,
  Briefcase,
  CreditCard as WalletIcon,
  User,
} from "lucide-react-native";
import {
  dummy_upcoming_rides,
  RideData,
} from "../dummy-data/DummyUpcomingRides";
import RideCard from "../components/RideCard";
import AppColors from "../design_systems/colors";
import MainNavBar from "../components/MainNavBar";
import bottomNavItems from "../data/BottomNavigationItems";

// Main component
const AvailableRidesScreen: React.FC = () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={20} color={AppColors.secondaryDarkGreen} />
          <Text style={styles.headerText}>Vellore Institute of Technology</Text>
        </View>
        <Text style={styles.brandText}>UniPool</Text>
      </View>

      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft size={22} color={AppColors.basicBlack} />
        </TouchableOpacity>
        <Text style={styles.ridesCountText}>
          {dummy_upcoming_rides.length} rides available
        </Text>
        <TouchableOpacity style={styles.createRideButton}>
          <Text style={styles.createRideText}>Create Ride</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
        {dummy_upcoming_rides.map((ride) => (
          <RideCard
            key={ride.id}
            id={ride.id}
            origin={ride.start_location}
            destination={ride.end_location}
            time={ride.start_time}
            price={ride.total_price}
            isSelected={selectedRideId === ride.id}
            seatsAvailable={
              ride.booked_seats.toString() + "/" + ride.total_seats.toString()
            }
            onSelect={handleRideSelection}
          />
        ))}
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.navBarView}>
        <MainNavBar
          variant={navBarVariant}
          bottomNavItems={bottomNavItems}
          iconPath={require("../assets/wallet.png")}
          text="View Details"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    width: "100%",
    height: "100%",
    paddingVertical: "2%",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: "5%",
    marginTop: StatusBar.currentHeight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: "2%",
    color: "#333",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.basicBlack,
  },
  subHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: "5%",
    paddingVertical: "3%",
  },
  backButton: {
    padding: "1%",
    color: AppColors.basicBlack,
  },
  ridesCountText: {
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.basicBlack,
  },
  createRideButton: {
    backgroundColor: AppColors.basicBlack,
    paddingHorizontal: "4%",
    paddingVertical: "2%",
    borderRadius: 10,
  },
  createRideText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  ridesList: {
    flex: 1,
    paddingHorizontal: "2.5%",
    paddingTop: "2%",
    marginBottom: "15%",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: "1%",
  },
  locationText: {
    marginLeft: "3%",
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  routeLine: {
    flexDirection: "column",
    marginLeft: "2.5%",
    height: 16,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
  },
  selectedRouteDot: {
    backgroundColor: "#d9f99d",
  },
  routePath: {
    width: 1,
    height: "100%",
    backgroundColor: "#333",
    marginLeft: 1.5,
  },
  selectedRoutePath: {
    backgroundColor: "#d9f99d",
  },
  seatInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "2%",
  },
  seatInfoText: {
    marginLeft: "2%",
    fontSize: 14,
    color: "#333",
  },
  selectedText: {
    color: "#fff",
  },
  detailsContainer: {
    position: "absolute",
    flexDirection: "column",
    top: "10%",
    right: "5%",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: "20%",
  },
  detailText: {
    marginLeft: "10%",
    fontSize: 14,
    color: "#333",
  },
  vehicleImageContainer: {
    position: "absolute",
    bottom: "8%",
    right: "5%",
    width: "25%",
    height: "60%",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  bottomNavigation: {
    width: "100%",
    height: "8%",
    backgroundColor: "#1e4620",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: "1%",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "20%",
    height: "100%",
  },
  navBarView: {
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AvailableRidesScreen;
