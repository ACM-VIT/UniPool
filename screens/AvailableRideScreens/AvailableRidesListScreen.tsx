import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { format, isSameDay } from "date-fns";
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

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const AvailableRidesListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();

  const [ridesByDate, setRidesByDate] = useState<RidesByDate>({});
  const [sortedDates, setSortedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => getStartOfToday());
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);

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

  const matchesSelectedDate = useCallback(
    (ride: RideData) => {
      if (!selectedDate) return true;
      const rideDate = new Date(ride.start_time);
      return isSameDay(rideDate, selectedDate);
    },
    [selectedDate]
  );

  const groupRidesByDate = useCallback((rides: RideData[]) => {
    const grouped: RidesByDate = {};

    rides.forEach((ride) => {
      if (!ride.start_time) return;
      const rideDate = new Date(ride.start_time);
      if (isNaN(rideDate.getTime())) return;
      if (!matchesSelectedDate(ride)) return;

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
  }, [matchesSelectedDate]);

  const quickSelectDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 4 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return {
        key: index === 0 ? "today" : date.toISOString(),
        title: index === 0 ? "Today" : format(date, "EEE"),
        subtitle: format(date, "d MMM"),
        date,
      };
    });
  }, []);

  const fetchAvailableRides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateParam = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
      const endpoint = dateParam ? `/ride/all?date=${dateParam}` : "/ride/all";
      const rides = await apiUtil.get<RideData[]>(endpoint);
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
            return rideStart >= startOfToday && seatsLeft > 0 && matchesSelectedDate(ride);
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
  }, [apiUtil, groupRidesByDate, matchesSelectedDate, selectedDate]);

  useEffect(() => {
    fetchAvailableRides();
  }, [fetchAvailableRides]);

  const handleDateSelection = useCallback((date: Date | null) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
  }, []);

  const openCalendarPicker = useCallback(() => {
    const currentValue = selectedDate || new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "date",
        value: currentValue,
        onChange: (_event, date) => {
          if (date) {
            handleDateSelection(date);
          }
        },
      });
    } else {
      setShowIOSDatePicker(true);
    }
  }, [handleDateSelection, selectedDate]);

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <Text style={styles.dateFilterHeading}>
        {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Upcoming dates"}
      </Text>
      <View style={styles.dateChipsRow}>
        <View style={styles.dateChipsWrapper}>
          {quickSelectDates.map(({ key, title, subtitle, date }, index) => {
            const isActive = !!selectedDate && isSameDay(date, selectedDate);
            const marginStyle =
              index === quickSelectDates.length - 1 ? null : { marginRight: 8 };

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dateChip,
                  marginStyle,
                  isActive && styles.dateChipActive,
                ]}
                onPress={() =>
                  isActive ? handleDateSelection(null) : handleDateSelection(date)
                }
              >
                <Text
                  style={[
                    styles.dateChipTitle,
                    isActive && styles.dateChipTitleActive,
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.dateChipSubtitle,
                    isActive && styles.dateChipSubtitleActive,
                  ]}
                >
                  {subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.calendarIconButton}
          onPress={openCalendarPicker}
        >
          <Image
            source={require("../../assets/calendar.png")}
            style={styles.calendarIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleIOSDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      handleDateSelection(date);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingComponent />
        </View>
      );
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
          <Text style={styles.emptyTitle}>
            {selectedDate
              ? `No rides for ${format(selectedDate, "EEE, MMM d")}.`
              : "No rides are available right now."}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedDate
              ? "Try a different date or pull down to refresh."
              : "Pull down to refresh or create a ride for others to join."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => (navigation as any).navigate("CreateRide")}
          >
            <Text style={styles.retryButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.listScroll}
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
                        (navigation as any).navigate("RideDetailsScreen", { rideId });
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
        <View style={styles.contentWrapper}>
          {renderDateFilter()}
          {renderContent()}
        </View>
        {showIOSDatePicker && Platform.OS === "ios" && (
          <View style={styles.iosPickerContainer}>
            <DateTimePicker
              mode="date"
              display="inline"
              value={selectedDate || new Date()}
              onChange={(event, date) => {
                if (event.type !== "dismissed") {
                  handleIOSDateChange(event, date);
                }
                setShowIOSDatePicker(false);
              }}
            />
          </View>
        )}
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
  contentWrapper: {
    flex: 1,
    paddingBottom: 16,
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
  listScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  dateFilterContainer: {
    backgroundColor: AppColors.basicWhite,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dateFilterHeading: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.basicBlack,
    marginBottom: 10,
  },
  dateChipsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  dateChipsWrapper: {
    flex: 1,
    flexDirection: "row",
    marginRight: 12,
  },
  dateChip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dateChipActive: {
    borderColor: AppColors.secondaryDarkGreen,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  dateChipTitle: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.secondaryDarkGreen,
    marginBottom: 2,
  },
  dateChipSubtitle: {
    fontSize: 13,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicBlack,
  },
  dateChipTitleActive: {
    color: AppColors.primaryLightGreen,
  },
  dateChipSubtitleActive: {
    color: AppColors.primaryLightGreen,
  },
  calendarIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarIcon: {
    width: 20,
    height: 20,
    tintColor: AppColors.secondaryDarkGreen,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginHorizontal: 16,
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
  iosPickerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.basicWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default AvailableRidesListScreen;
