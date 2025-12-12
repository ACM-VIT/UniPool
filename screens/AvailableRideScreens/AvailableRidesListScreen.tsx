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
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const groupRidesByDate = useCallback(
    (rides: RideData[]) => {
      const grouped: RidesByDate = {};

      const filtered = rides.filter((ride) => {
        if (!searchQuery) return true;

        const src = ride.start_location?.toLowerCase() ?? "";
        const dest = ride.end_location?.toLowerCase() ?? "";
        const q = searchQuery.toLowerCase();

        return src.includes(q) || dest.includes(q);
      });

      filtered.forEach((ride) => {
        if (!ride.start_time) return;
        const rideDate = new Date(ride.start_time);
        if (isNaN(rideDate.getTime())) return;
        if (!matchesSelectedDate(ride)) return;

        const dateKey = rideDate.toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(ride);
      });

      Object.values(grouped).forEach((list) =>
        list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );

      const orderedDateKeys = Object.keys(grouped).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      setRidesByDate(grouped);
      setSortedDates(orderedDateKeys);
    },
    [matchesSelectedDate, searchQuery]
  );

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
            const seatsLeft = (ride.total_seats ?? 0) - (ride.booked_seats ?? 0);
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
          if (date) handleDateSelection(date);
        },
      });
    } else {
      setShowIOSDatePicker(true);
    }
  }, [handleDateSelection, selectedDate]);

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchBar}>
        <Image
          source={require("../../assets/search_black.png")}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#000"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <View style={styles.dateHeaderTopRow}>
        <Text style={styles.dateHeaderTopText}>
          {selectedDate ? format(selectedDate, "d MMM, EEEE") : ""}
        </Text>

        <TouchableOpacity style={styles.calendarBox} onPress={openCalendarPicker}>
          <Image
            source={require("../../assets/calendar.png")}
            style={styles.calendarIcon}
          />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10 }}>
        {quickSelectDates.map(({ key, title, subtitle, date }) => {
          const isActive = !!selectedDate && isSameDay(date, selectedDate);

          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
              onPress={() => handleDateSelection(date)}
            >
              <Text style={[styles.dayChipTitle, isActive && styles.dayChipTitleActive]}>
                {title}
              </Text>
              <Text style={[styles.dayChipSubtitle, isActive && styles.dayChipSubtitleActive]}>
                {subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );


  const handleIOSDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) handleDateSelection(date);
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
              <Text style={styles.dateCount}>{ridesByDate[dateKey]?.length ?? 0} rides</Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Rides</Text>
          <View style={{ width: 32 }} />
        </View>

        {renderSearchBar()}

        {renderDateFilter()}

        <View style={styles.contentWrapper}>{renderContent()}</View>

        {showIOSDatePicker && Platform.OS === "ios" && (
          <View style={styles.iosPickerContainer}>
            <DateTimePicker
              mode="date"
              display="inline"
              value={selectedDate || new Date()}
              onChange={(event, date) => {
                if (event.type !== "dismissed") handleIOSDateChange(event, date);
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
    paddingBottom: 10,
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
    paddingTop: 34,
    paddingBottom: 4,
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

  searchBarContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4E86C",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
  },

  searchIcon: {
    width: 22,
    height: 22,
    tintColor: "#000",
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    color: "#000",
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
  },

  dateFilterContainer: {
    backgroundColor: "#143324",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    borderRadius: 18,
    marginTop: 4,
    marginBottom: 10,
  },

  dateHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateHeaderTopText: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: "#FFFFFF",
  },

  calendarBox: {
    width: 40,
    height: 40,
    backgroundColor: "#D4E86C",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  calendarIcon: {
    width: 20,
    height: 20,
    tintColor: "#143324",
  },

  dayChip: {
    backgroundColor: "#D4E86C",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    alignItems: "center",
  },

  dayChipActive: {
    backgroundColor: "#FFFFFF",
  },

  dayChipTitle: {
    fontSize: 12,
    fontFamily: "NunitoSans_700Bold",
    color: "#000",
  },

  dayChipSubtitle: {
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    color: "#000",
  },

  dayChipTitleActive: {
    color: "#000",
  },

  dayChipSubtitleActive: {
    color: "#000",
  },

  listScroll: {
    flex: 1,
    paddingTop: 0,
  },

  scrollContent: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 80,
  },

  dateSection: {
    backgroundColor: "transparent",
    padding: 0,
    marginBottom: 10,
    borderRadius: 0,
  },

  rideCardWrapper: {
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  dateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  dateLabel: {
    color: "#143324",
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
  },

  dateCount: {
    color: AppColors.basicBlack,
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
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
