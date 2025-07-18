import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import RideCard from "../../components/RideCard";
import ChevronBack from "../../components/ChevronBack";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { MapPin } from "lucide-react-native";
import { useApi } from "../../utils/ApiUtil";
import type { RideData } from "../../dummy-data/Bookings";
import MainNavBar from "../../components/MainNavBar";
import bottomNavItems from "../../data/BottomNavigationItems";

const window = Dimensions.get("window");

const BookingScreen: React.FC = () => {

  const [activeUpcomingPage, setActiveUpcomingPage] = useState(0);
  const [activeInProgressPage, setActiveInProgressPage] = useState(0);
  const [upcomingRides, setUpcomingRides] = useState<RideData[]>([]);
  const [inProgressRides, setInProgressRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
  const { apiUtil } = useApi();

  const bookingScreenNavItems = bottomNavItems.map((item, index) => ({
    ...item,
    isActive: index === 1,
  }));

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}${minutes}hrs`;
    } catch (error) {
      return timeString;
    }
  };

  const handleUpcomingScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveUpcomingPage(pageIndex);
  };

  const handleInProgressScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveInProgressPage(pageIndex);
  };

  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookings = await apiUtil.get<any>("/user/rides");
        const upcoming: RideData[] = [];
        const inProgress: RideData[] = [];
        if (Array.isArray(bookings)) {
          bookings.forEach((ride: RideData) => {
            if (ride.is_ongoing) {
              inProgress.push(ride);
            } else {
              upcoming.push(ride);
            }
          });
        }
        console.log("Upcoming Rides:", upcoming);
        console.log("In-Progress Rides:", inProgress);
        setUpcomingRides(upcoming);
        setInProgressRides(inProgress);
      } catch (err: any) {
        if (err.message !== "AUTHENTICATION_REDIRECT") {
          setError(err.message || "Failed to fetch rides");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
  }, [apiUtil]);

  return (
    <View style={styles.container}>
      <ChevronBack style={styles.backButton} />
      
      {/* <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={20} color={AppColors.basicBlack} />
          <Text style={styles.headerText}>Vellore Institute of Technology</Text>
        </View>
        <Text style={styles.brandText}>UniPool</Text>
      </View> */}

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={AppColors.secondaryDarkGreen} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Upcoming Rides</Text>
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleUpcomingScroll}
              scrollEventThrottle={16}
              snapToInterval={window.width}
              decelerationRate="fast"
              snapToAlignment="center"
            >
              {upcomingRides.length === 0 ? (
                <View style={{ justifyContent: "center", alignItems: "center", width: window.width }}>
                  <Text>No upcoming rides found.</Text>
                </View>
              ) : (
                upcomingRides.map((ride) => (
                  <View key={ride.ride_id || ride.id || "unknown-ride"} style={styles.pageContainer}>
                    <RideCard
                      id={(ride.ride_id || ride.id) ?? ""}
                      origin={ride.start_location}
                      destination={ride.end_location}
                      time={formatTime(ride.start_time)}
                      price={ride.total_price}
                      seatsAvailable={`${ride.booked_seats}/${ride.total_seats}`}
                    />
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.paginationContainer}>
              {upcomingRides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    activeUpcomingPage === index
                      ? styles.paginationDotActive
                      : {},
                  ]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Rides In-Progress</Text>
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleInProgressScroll}
              scrollEventThrottle={16}
              snapToInterval={window.width}
              decelerationRate="fast"
              snapToAlignment="center"
            >
              {inProgressRides.length === 0 ? (
                <View style={{ justifyContent: "center", alignItems: "center", width: window.width }}>
                  <Text>No in-progress rides found.</Text>
                </View>
              ) : (
                inProgressRides.map((ride) => (
                  <View key={ride.ride_id || ride.id || "unknown-ride"} style={styles.pageContainer}>
                    <RideCard
                      id={(ride.ride_id || ride.id) ?? ""}
                      origin={ride.start_location}
                      destination={ride.end_location}
                      time={formatTime(ride.start_time)}
                      price={ride.total_price}
                      seatsAvailable={`${ride.booked_seats}/${ride.total_seats}`}
                      isSelected={true}
                    />
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.paginationContainer}>
              {inProgressRides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    activeInProgressPage === index
                      ? styles.paginationDotActive
                      : {},
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <Image
        source={require("../../assets/airplane.png")}
        style={styles.airplaneIcon}
        resizeMode="contain"
      />
      <View style={styles.navBarView}>
        <MainNavBar
          variant={navBarVariant}
          bottomNavItems={bookingScreenNavItems}
          iconPath={require("../../assets/wallet.png")}
          text="View Details"
        />
      </View>
    </View>
  );
};

export default BookingScreen;
