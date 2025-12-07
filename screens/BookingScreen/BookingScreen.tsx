import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Alert,
  TouchableOpacity,
} from "react-native";
import RideCard from "../../components/RideCard";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import BrandInfo from "../../components/BrandInfo";
import LottieView from "lottie-react-native";
import LoadingComponent from "../../components/LoadingComponent";

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
  host_user_id?: string;
  is_user_host?: boolean;
}

const window = Dimensions.get("window");

const BookingScreen: React.FC = () => {
  const [activeAvailablePage, setActiveAvailablePage] = useState(0);
  const [activeInProgressPage, setActiveInProgressPage] = useState(0);
  const [upcomingRides, setUpcomingRides] = useState<RideData[]>([]);
  const [inProgressRides, setInProgressRides] = useState<RideData[]>([]);
  const [availableRides, setAvailableRides] = useState<RideData[]>([]);
  const [availableLoading, setAvailableLoading] = useState(true);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiUtil } = useApi();
  const navigation = require("@react-navigation/native").useNavigation();

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

  const calculateAvailableSeats = (ride: RideData): string => {
    const auth = require('@react-native-firebase/auth').getAuth();
    const currentUser = auth.currentUser;
    const isHost = currentUser && ride.host_user_id === currentUser.uid;
    
    const bookedSeats = typeof ride.booked_seats === "number" ? ride.booked_seats : 0;
    const totalSeats = typeof ride.total_seats === "number" ? ride.total_seats : 0;

    const actualBookedSeats = isHost ? bookedSeats + 1 : bookedSeats;
    const availableSeats = Math.max(totalSeats - actualBookedSeats, 0);
    
    console.log(`Seat calculation for ride ${ride.ride_id || ride.id}: isHost=${isHost}, booked=${bookedSeats}, total=${totalSeats}, available=${availableSeats}`);
    
    return totalSeats > 0 ? `${availableSeats}/${totalSeats}` : `${availableSeats}/-`;
  };

  const formatDateLabel = (timeString?: string): string => {
    if (!timeString) return "";
    try {
      const dateObj = new Date(timeString);
      const today = new Date();
      const isToday = dateObj.toDateString() === today.toDateString();
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString("en-US", { month: "long" });
      const year = dateObj.getFullYear();
      return `${isToday ? "Today, " : ""}${day} ${month}, ${year}`;
    } catch (error) {
      return "";
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

  const handleAvailableScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveAvailablePage(pageIndex);
  };

  const handleInProgressScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveInProgressPage(pageIndex);
  };

  const fetchAvailableRides = async () => {
    setAvailableLoading(true);
    setAvailableError(null);

    try {
      const ridesResponse = await apiUtil.get<RideData[]>("/ride/all");
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const filteredRides = Array.isArray(ridesResponse)
        ? ridesResponse
            .filter((ride) => {
              if (!ride.start_time) return false;
              const rideStart = new Date(ride.start_time);
              if (isNaN(rideStart.getTime())) return false;

              const seatsLeft = (ride.total_seats ?? 0) - (ride.booked_seats ?? 0);
              const hasCapacity = seatsLeft > 0;

              return hasCapacity && rideStart >= startOfToday;
            })
            .sort(
              (a, b) =>
                new Date(a.start_time).getTime() -
                new Date(b.start_time).getTime()
            )
        : [];

      setAvailableRides(filteredRides);
    } catch (err: any) {
      console.log("Error fetching available rides:", err);
      if (err?.message === "AUTHENTICATION_REDIRECT") return;
      setAvailableError("Could not load available rides");
    } finally {
      setAvailableLoading(false);
    }
  };

  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = require('@react-native-firebase/auth').getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.log("Unauthenticated user found in BookingScreen");
          setError("Please sign in to view your rides");
          return;
        }

        console.log("User authenticated, fetching rides...");
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
            
            const isHost = currentUser && ride.host_user_id === currentUser.uid;
            console.log(`Processing ride ${rideId}: host_user_id=${ride.host_user_id}, current_user_id=${currentUser?.uid}, is_host=${isHost}`);
            
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
        console.log('Error fetching user rides:', err);
        if (err.message === "AUTHENTICATION_REDIRECT") {
          console.log('Authentication redirect in BookingScreen - not showing error');
          return;
        }
        setError(err.message || "Failed to fetch rides");
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
    fetchAvailableRides();
  }, [apiUtil]);

  // Debug: Log all rides once before rendering
  const combinedLoading = loading || availableLoading;
  const availablePreview = availableRides.slice(0, 5);
  const inProgressDisplayRides = inProgressRides.length > 0 ? inProgressRides : upcomingRides;
  const showingUpcomingAsFallback = inProgressRides.length === 0 && upcomingRides.length > 0;
  const nothingToShow = !combinedLoading && availablePreview.length === 0 && inProgressDisplayRides.length === 0 && !availableError;
  const blockingError = !!(error && availablePreview.length === 0 && inProgressDisplayRides.length === 0);
  
  console.log('upcomingRides:', upcomingRides);
  console.log('inProgressRides:', inProgressRides);
  console.log('availableRides:', availableRides);
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

      {combinedLoading ? (
        <LoadingComponent />
      ) : blockingError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <Text style={{ color: "red", fontFamily: "NunitoSans_600SemiBold", fontSize: 16, textAlign: "center" }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 18,
              backgroundColor: AppColors.secondaryDarkGreen,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 14,
            }}
            onPress={() => fetchAvailableRides()}
          >
            <Text style={{ color: AppColors.basicWhite, fontFamily: "NunitoSans_600SemiBold" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : nothingToShow ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ position: "relative", marginBottom: 20 }}>
            <LottieView
              source={require("../../assets/bookings.json")}
              autoPlay
              loop
              resizeMode="cover"
              style={{ width: 200, height: 200 }}
            />
            <View style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 53,
              height: 20,
              backgroundColor: AppColors.primaryLightGreen,
            }} />
          </View>
          <Text style={{
            fontSize: 24,
            fontFamily: "NunitoSans_700Bold",
            color: AppColors.basicBlack,
            textAlign: "center",
            marginBottom: 10
          }}>
            No Rides Yet
          </Text>
          <Text style={{
            fontSize: 16,
            fontFamily: "NunitoSans_400Regular",
            color: AppColors.basicBlack,
            textAlign: "center",
            marginBottom: 30
          }}>
            All dressed up, but nowhere to ride? Browse what is available right now.
          </Text>
          <View style={{ flexDirection: "row", gap: 15 }}>
            <TouchableOpacity
              style={{
                backgroundColor: AppColors.secondaryDarkGreen,
                paddingHorizontal: 25,
                paddingVertical: 12,
                borderRadius: 25,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}
              onPress={() => navigation.navigate("AvailableRidesListScreen" as never)}
            >
              <Text style={{
                color: "white",
                fontSize: 16,
                fontFamily: "NunitoSans_600SemiBold"
              }}>
                Available Rides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: AppColors.primaryLightGreen,
                paddingHorizontal: 25,
                paddingVertical: 12,
                borderRadius: 25,
                borderWidth: 2,
                borderColor: AppColors.secondaryDarkGreen,
              }}
              onPress={() => navigation.navigate("CreateRide")}
            >
              <Text style={{
                color: AppColors.secondaryDarkGreen,
                fontSize: 16,
                fontFamily: "NunitoSans_600SemiBold"
              }}>
                Create Ride
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Rides</Text>
            <TouchableOpacity
              style={[
                styles.viewAllButton,
                availablePreview.length === 0 && { opacity: 0.5 },
              ]}
              disabled={availablePreview.length === 0}
              onPress={() => navigation.navigate("AvailableRidesListScreen" as never)}
            >
              <Text style={styles.viewAllButtonText}>See all rides</Text>
            </TouchableOpacity>
          </View>
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleAvailableScroll}
              scrollEventThrottle={16}
              snapToInterval={window.width}
              decelerationRate="fast"
              snapToAlignment="center"
            >
              {availablePreview.length === 0 ? (
                <View style={{ justifyContent: "center", alignItems: "center", width: window.width }}>
                  <Text style={{ fontFamily: "NunitoSans_400Regular" }}>No available rides right now.</Text>
                </View>
              ) : (
                availablePreview.map((ride) => {
                  const rideId = ride.ride_id || ride.id;
                  return (
                    <View key={rideId || "available-ride"} style={styles.pageContainer}>
                      <Text style={styles.rideDateLabel}>{formatDateLabel(ride.start_time)}</Text>
                      <RideCard
                        id={rideId ?? ""}
                        origin={ride.start_location}
                        destination={ride.end_location}
                        time={formatTime(ride.start_time)}
                        price={ride.total_price}
                        seatsAvailable={calculateAvailableSeats(ride)}
                        totalSeats={ride.total_seats}
                        variant="inprogress"
                        onSelect={() => {
                          if (!rideId) {
                            Alert.alert("Error", "No ride ID found for this ride. Please try again later.");
                            return;
                          }
                          navigation.navigate("RideDetailsScreen", { rideId });
                        }}
                      />
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.paginationContainer}>
              {availablePreview.length > 1 && availablePreview.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    activeAvailablePage === index
                      ? styles.paginationDotActive
                      : {},
                  ]}
                />
              ))}
            </View>
            {availableError && (
              <Text style={styles.sectionErrorText}>{availableError}</Text>
            )}
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
              {inProgressDisplayRides.length === 0 ? (
                <View style={{ justifyContent: "center", alignItems: "center", width: window.width }}>
                  <Text style={{ fontFamily: "NunitoSans_400Regular" }}>No rides to show here.</Text>
                </View>
              ) : (
                inProgressDisplayRides.map((ride) => {
                  const rideId = ride.ride_id || ride.id;
                  const variant = showingUpcomingAsFallback ? "upcoming" : "inprogress";
                  return (
                    <View key={rideId || "user-ride"} style={styles.pageContainer}>
                      <Text style={styles.rideDateLabel}>
                        {formatDateLabel(ride.start_time)}
                        {showingUpcomingAsFallback ? " (upcoming)" : ""}
                      </Text>
                      <RideCard
                        id={rideId ?? ""}
                        origin={ride.start_location}
                        destination={ride.end_location}
                        time={formatTime(ride.start_time)}
                        price={ride.total_price}
                        seatsAvailable={calculateAvailableSeats(ride)}
                        totalSeats={ride.total_seats}
                        isSelected={variant === "inprogress"}
                        variant={variant as "upcoming" | "inprogress"}
                        date={
                          variant === "upcoming" && ride.start_time
                            ? new Date(ride.start_time).toLocaleDateString("en-GB")
                            : undefined
                        }
                        onSelect={() => {
                          if (!rideId) {
                            Alert.alert("Error", "No ride ID found for this ride. Please try again later.");
                            return;
                          }
                          navigation.navigate("RideDetailsScreen", { rideId });
                        }}
                      />
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.paginationContainer}>
              {inProgressDisplayRides.length > 1 && inProgressDisplayRides.map((_, index) => (
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
