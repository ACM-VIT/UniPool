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
import bottomNavItems from "../../data/BottomNavigationItems";
import BrandInfo from "../../components/BrandInfo";

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
  is_same_gender: number;
  vehicle_type?: "scooter" | "van" | "car" | "suv";
}

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

  const categorizeRide = (ride: RideData, currentTime: Date): 'upcoming' | 'inprogress' | 'completed' => {
    try {
      const rideStartTime = new Date(ride.start_time);
      if (isNaN(rideStartTime.getTime())) {
        return 'upcoming';
      }
      
      const timeDiffHours = (rideStartTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      
      if (timeDiffHours < -24) {
        return 'completed';
      }
      
      if (timeDiffHours > 1) {
        return 'upcoming';
      }
      
      if (timeDiffHours >= -6 && timeDiffHours <= 1) {
        if (ride.is_ongoing === 1) return 'inprogress';
        if (ride.is_ongoing === 0 && timeDiffHours > 0) return 'upcoming';
        
        return timeDiffHours <= 0 ? 'inprogress' : 'upcoming';
      }
      
      return 'completed';
      
    } catch (error) {
      console.warn('Error categorizing ride:', error);
      return 'upcoming';
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
        const currentTime = new Date();
        
        if (Array.isArray(bookings)) {
          bookings.forEach((ride: RideData) => {
            const rideId = ride.ride_id || ride.id;
            if (!rideId || seenIds.has(rideId)) return;
            seenIds.add(rideId);
            
            if (!ride.start_time || !ride.start_location || !ride.end_location) {
              console.warn("Skipping ride with missing required fields:", ride);
              return;
            }
            
            let rideStartTime: Date;
            try {
              rideStartTime = new Date(ride.start_time);
              if (isNaN(rideStartTime.getTime())) {
                throw new Error("Invalid date");
              }
            } catch (error) {
              console.warn("Skipping ride with invalid start_time:", ride.start_time, ride);
              return;
            }
            
            const category = categorizeRide(ride, currentTime);
            const timeDiffHours = (rideStartTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
            
            console.log(`Categorizing ride ${rideId}: start_time=${ride.start_time}, is_ongoing=${ride.is_ongoing}, timeDiff=${timeDiffHours.toFixed(2)}h, category=${category}`);
            
            if (category === 'completed') {
              console.log(`Skipping completed ride ${rideId}`);
              return;
            }
            
            if (category === 'inprogress') {
              inProgress.push(ride);
            } else {
              upcoming.push(ride);
            }
          });
          
          upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          
          inProgress.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        }
        
        console.log("Categorized rides:");
        console.log("Upcoming Rides:", upcoming.length, upcoming.map(r => ({ 
          id: r.ride_id || r.id, 
          start_time: r.start_time, 
          is_ongoing: r.is_ongoing 
        })));
        console.log("In-Progress Rides:", inProgress.length, inProgress.map(r => ({ 
          id: r.ride_id || r.id, 
          start_time: r.start_time, 
          is_ongoing: r.is_ongoing 
        })));
        
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
              {upcomingRides.length > 1 && upcomingRides.map((_, index) => (
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
              {inProgressRides.length > 1 && inProgressRides.map((_, index) => (
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
