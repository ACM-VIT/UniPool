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
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import RideCard from "../../components/RideCard";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import type { RideData } from "../../dummy-data/Bookings";
import bottomNavItems from "../../data/BottomNavigationItems";
import BrandInfo from "../../components/BrandInfo";

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
  const navigation = require("@react-navigation/native").useNavigation();

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
        const seenIds = new Set<string>();
        if (Array.isArray(bookings)) {
          bookings.forEach((ride: RideData) => {
            const rideId = ride.ride_id || ride.id;
            if (!rideId || seenIds.has(rideId)) return;
            seenIds.add(rideId);
            if (ride.is_ongoing) {
              inProgress.push(ride);
            } else {
              upcoming.push(ride);
            }
          });
        }
        // console.log("Upcoming Rides:", upcoming);
        // console.log("In-Progress Rides:", inProgress);
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

  // Debug: Log all rides once before rendering
  console.log('upcomingRides:', upcomingRides);
  console.log('inProgressRides:', inProgressRides);
  return (
    <View style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: AppColors.primaryLightGreen,
        }}
      >
        <BrandInfo />
      </View>

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
                  <Text style={{ fontFamily: "NunitoSans_400Regular" }}>No upcoming rides found.</Text>
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
                      variant="upcoming"
                      date={ride.start_time ? new Date(ride.start_time).toLocaleDateString("en-GB") : ""}
                      onSelect={() => {
                        if (!ride.ride_id) {
                          console.error("No ride_id found for this ride:", ride);
                          Alert.alert("Error", "No ride ID found for this ride. Please try again later.");
                          return;
                        }
                        console.log("Pressed rideId (upcoming):", ride.ride_id);
                        navigation.navigate("RideDetailsScreen", { rideId: ride.ride_id });
                      }}
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
                  <Text style={{ fontFamily: "NunitoSans_400Regular" }}>No in-progress rides found.</Text>
                </View>
              ) : (
                inProgressRides.map((ride) => (
                  <View key={ride.ride_id || ride.id || "unknown-ride"} style={styles.pageContainer}>
                    <Text style={{
                      textAlign: "left",
                      fontSize: 18,
                      marginBottom: 12,
                      marginLeft: 4,
                      fontFamily: "NunitoSans_400Regular",
                      color: AppColors.basicBlack
                    }}>
                      {(() => {
                        if (!ride.start_time) return "";
                        const dateObj = new Date(ride.start_time);
                        const day = dateObj.getDate();
                        const month = dateObj.toLocaleString("en-US", { month: "long" });
                        const year = dateObj.getFullYear();
                        return `${day} ${month}, ${year}`;
                      })()}
                    </Text>
                    <RideCard
                      id={(ride.ride_id || ride.id) ?? ""}
                      origin={ride.start_location}
                      destination={ride.end_location}
                      time={formatTime(ride.start_time)}
                      price={ride.total_price}
                      seatsAvailable={`${ride.booked_seats}/${ride.total_seats}`}
                      isSelected={true}
                      variant="inprogress"
                      onSelect={() => {
                        if (!ride.ride_id) {
                          console.error("No ride_id found for this ride:", ride);
                          Alert.alert("Error", "No ride ID found for this ride. Please try again later.");
                          return;
                        }
                        console.log("Pressed rideId (inprogress):", ride.ride_id);
                        navigation.navigate("RideDetailsScreen", { rideId: ride.ride_id });
                      }}
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
    </View>
  );
};

export default BookingScreen;
