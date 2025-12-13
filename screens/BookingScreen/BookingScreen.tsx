import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  TouchableOpacity,
} from "react-native";

import RideCard from "../../components/RideCard";
import styles from "./BookingScreen.styles";
import BrandInfo from "../../components/BrandInfo";
import LoadingComponent from "../../components/LoadingComponent";
import { useApi } from "../../utils/ApiUtil";

export interface RideData {
  id?: string;
  ride_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  vehicle_type?: "scooter" | "van" | "car" | "suv";
  host_user_id?: string;
}

const window = Dimensions.get("window");

const BookingScreen: React.FC = () => {
  const navigation = require("@react-navigation/native").useNavigation();
  const { apiUtil } = useApi();

  const [activeUpcomingPage, setActiveUpcomingPage] = useState(0);
  const [activeProgressPage, setActiveProgressPage] = useState(0);

  const [upcomingRides, setUpcomingRides] = useState<RideData[]>([]);
  const [progressRides, setProgressRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (timeString: string) => {
    try {
      const d = new Date(timeString);
      return `${d.getHours().toString().padStart(2, "0")}${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}hrs`;
    } catch {
      return timeString;
    }
  };

  const getDateLabel = (timeString?: string) => {
    if (!timeString) return "";
    try {
      const d = new Date(timeString);
      return `${d.getDate()} ${d.toLocaleString("en-US", {
        month: "long",
      })}, ${d.getFullYear()}`;
    } catch {
      return "";
    }
  };

  const getSeats = (ride: RideData) => {
    const booked = ride.booked_seats ?? 0;
    const total = ride.total_seats ?? 0;
    return `${Math.max(total - booked, 0)}/${total}`;
  };

  const categorizeRide = (ride: RideData) => {
    const now = new Date();
    const start = new Date(ride.start_time);
    const diff = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diff <= 1) return "progress";
    return "upcoming";
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const bookings = await apiUtil.get<RideData[]>("/user/rides");

      const upcoming: RideData[] = [];
      const progress: RideData[] = [];

      bookings.forEach((ride) => {
        if (!ride.start_time) return;
        const category = categorizeRide(ride);
        if (category === "progress") progress.push(ride);
        else upcoming.push(ride);
      });

      setUpcomingRides(upcoming);
      setProgressRides(progress);
    } catch (err) {
      console.log("Booking fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const onUpcomingScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActiveUpcomingPage(Math.round(e.nativeEvent.contentOffset.x / window.width));

  const onProgressScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActiveProgressPage(Math.round(e.nativeEvent.contentOffset.x / window.width));

  if (loading) return <LoadingComponent />;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <BrandInfo />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming Rides</Text>
          </View>

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate("AvailableRidesListScreen")}
          >
            <Text style={styles.viewAllButtonText}>See all rides</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          snapToInterval={window.width}
          onScroll={onUpcomingScroll}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
        >
          {upcomingRides.length === 0 ? (
            <View style={styles.emptyPage}>
              <Text style={styles.emptyText}>No upcoming rides</Text>
            </View>
          ) : (
            upcomingRides.map((ride, idx) => (
              <View key={ride.ride_id || idx} style={styles.pageContainer}>
                <RideCard
                  compact={true}
                  id={ride.ride_id || ""}
                  origin={ride.start_location}
                  destination={ride.end_location}
                  time={formatTime(ride.start_time)}
                  price={ride.total_price}
                  seatsAvailable={getSeats(ride)}
                  totalSeats={ride.total_seats}
                  onSelect={() =>
                    navigation.navigate("RideDetailsScreen", { rideId: ride.ride_id })
                  }
                />
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.paginationContainer}>
          {upcomingRides.map((_, i) => (
            <View
              key={i}
              style={[styles.paginationDot, activeUpcomingPage === i && styles.paginationDotActive]}
            />
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Rides In-Progress</Text>
            <Text style={styles.sectionDate}>{getDateLabel(progressRides[0]?.start_time)}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          snapToInterval={window.width}
          onScroll={onProgressScroll}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
        >
          {progressRides.length === 0 ? (
            <View style={styles.emptyPage}>
              <Text style={styles.emptyText}>No rides in progress</Text>
            </View>
          ) : (
            progressRides.map((ride, idx) => (
              <View key={ride.ride_id || idx} style={styles.pageContainer}>
                <RideCard
                  variant="dark"
                  compact={true}
                  id={ride.ride_id || ""}
                  origin={ride.start_location}
                  destination={ride.end_location}
                  time={formatTime(ride.start_time)}
                  price={ride.total_price}
                  seatsAvailable={getSeats(ride)}
                  totalSeats={ride.total_seats}
                  onSelect={() =>
                    navigation.navigate("RideDetailsScreen", { rideId: ride.ride_id })
                  }
                />
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.paginationContainer}>
          {progressRides.map((_, i) => (
            <View
              key={i}
              style={[styles.paginationDot, activeProgressPage === i && styles.paginationDotActive]}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Image
        source={require("../../assets/airplane.png")}
        style={styles.airplaneIcon}
        resizeMode="contain"
      />
    </View>
  );
};

export default BookingScreen;
