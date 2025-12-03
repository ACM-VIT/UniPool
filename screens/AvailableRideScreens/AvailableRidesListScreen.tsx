import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import { useApi } from "../../utils/ApiUtil";
import AppColors from "../../design_systems/colors";
import RideCard from "../../components/RideCard";
import LoadingComponent from "../../components/LoadingComponent";

interface RideData {
  id?: string;
  ride_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  host_user_id?: string;
}

type RidesByDate = Record<string, RideData[]>;

const AvailableRidesListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();

  const [ridesByDate, setRidesByDate] = useState<RidesByDate>({});
  const [sortedDates, setSortedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}${minutes}hrs`;
    } catch (err) {
      return timeString;
    }
  };

  const formatDateLabel = (dateKey: string): string => {
    try {
      const dateObj = new Date(dateKey);
      const today = new Date();
      const isToday = dateObj.toDateString() === today.toDateString();
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString("en-US", { month: "long" });
      const year = dateObj.getFullYear();
      return `${isToday ? "Today, " : ""}${day} ${month}, ${year}`;
    } catch (err) {
      return dateKey;
    }
  };

  const calculateSeatsLabel = (ride: RideData) => {
    const seats = typeof ride.total_seats === "number" ? ride.total_seats : 0;
    const booked = typeof ride.booked_seats === "number" ? ride.booked_seats : 0;
    const remaining = Math.max(seats - booked, 0);
    return seats > 0 ? `${remaining}/${seats}` : `${remaining}/-`;
  };

  const groupRidesByDate = (rides: RideData[]) => {
    const grouped: RidesByDate = {};

    rides.forEach((ride) => {
      if (!ride.start_time) return;
      const rideDate = new Date(ride.start_time);
      if (isNaN(rideDate.getTime())) return;

      const dateKey = rideDate.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(ride);
    });

    Object.values(grouped).forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    );

    const orderedDateKeys = Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    setRidesByDate(grouped);
    setSortedDates(orderedDateKeys);
  };

  const fetchAvailableRides = async () => {
    setLoading(true);
    setError(null);
    try {
      const rides = await apiUtil.get<RideData[]>("/ride/all");
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const upcomingRides = Array.isArray(rides)
        ? rides.filter((ride) => {
            if (!ride.start_time) return false;
            const rideStart = new Date(ride.start_time);
            if (isNaN(rideStart.getTime())) return false;
            const seatsLeft =
              (ride.total_seats ?? 0) - (ride.booked_seats ?? 0);
            return rideStart >= startOfToday && seatsLeft > 0;
          })
        : [];

      groupRidesByDate(upcomingRides);
    } catch (err: any) {
      console.log("Error loading available rides:", err);
      if (err?.message === "AUTHENTICATION_REDIRECT") return;
      setError("Unable to load available rides right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableRides();
  }, [apiUtil]);

  const renderContent = () => {
    if (loading) {
      return <LoadingComponent />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAvailableRides}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sortedDates.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No rides are available today.</Text>
          <Text style={styles.emptySubtitle}>
            Pull down to refresh or create a ride for others to join.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate("CreateRide" as never)}
          >
            <Text style={styles.retryButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedDates.map((dateKey) => (
          <View key={dateKey} style={styles.dateSection}>
            <View style={styles.dateHeaderRow}>
              <Text style={styles.dateLabel}>{formatDateLabel(dateKey)}</Text>
              <Text style={styles.dateCount}>
                {ridesByDate[dateKey]?.length ?? 0} rides
              </Text>
            </View>
            {ridesByDate[dateKey]?.map((ride) => {
              const rideId = ride.ride_id || ride.id;
              return (
                <View key={rideId || `${dateKey}-ride`} style={styles.rideCardWrapper}>
                  <RideCard
                    id={rideId ?? ""}
                    origin={ride.start_location}
                    destination={ride.end_location}
                    time={formatTime(ride.start_time)}
                    price={ride.total_price}
                    seatsAvailable={calculateSeatsLabel(ride)}
                    totalSeats={ride.total_seats}
                    variant="inprogress"
                    onSelect={() => {
                      if (!rideId) return;
                      navigation.navigate("RideDetailsScreen" as never, { rideId });
                    }}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandInfoHeaderRow}>
          <BrandInfo />
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Rides</Text>
          <View style={{ width: 32 }} />
        </View>

        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: AppColors.primaryLightGreen,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 38,
    paddingBottom: 6,
    backgroundColor: AppColors.primaryLightGreen,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.basicBlack,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  dateSection: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  dateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dateLabel: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
  },
  dateCount: {
    color: AppColors.basicWhite,
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
  },
  rideCardWrapper: {
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    color: "red",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 14,
  },
  retryButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  retryButtonText: {
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
    marginBottom: 16,
  },
});

export default AvailableRidesListScreen;
