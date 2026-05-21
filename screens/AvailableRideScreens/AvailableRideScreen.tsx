import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Image, Dimensions, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";
import LoadingComponent from "../../components/LoadingComponent";
import SearchingForRidesLoader from "../../components/SearchingForRidesLoader";
import AppColors from "../../design_systems/colors";

import { useApi } from "../../utils/ApiUtil";
import { useAuthGate } from "../../contexts/AuthGate";
import bottomNavItems from "../../data/BottomNavigationItems";
import styles from "./AvailableRideScreens.styles";
import BrandedAlert from "../../components/BrandedAlert";
import { appHref, useDecodedLocalSearchParams } from "../../navigation/routes";

interface AvailableRideScreenProps {
  setNavBarVariant: (variant: 0 | 1 | 2) => void;
  setNavBarText: (text: string) => void;
  setNavBarIcon: (icon: any) => void;
  setNavBarItems: (items: any[]) => void;
}

interface SearchFilters {
  maxPrice: string;
  minSeats: string;
  sortBy: 'relevance' | 'time' | 'price' | 'distance';
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'night' | '';
  radius: string;
  date: string;
}

interface RideData {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  total_seats: number;
  booked_seats: number;
  host_user_name: string;
  host_user_profile_picture_url?: string;
  // Lowercase "male" | "female" | "other" — drives the same-gender
  // affinity tint on the result card when the viewer is female.
  host_user_gender?: string;
  same_gender_female?: boolean;
  is_same_gender_female?: boolean;
  host_rating_average?: number | null;
  host_rating_count?: number;
  start_distance?: number;
  end_distance?: number;
  total_distance?: number;
  relevance_score?: number;
  match_reason?: string;
}

interface ApiResponse {
  rides: RideData[];
  meta: {
    total_found: number;
    used_radius_km: number;
    sort_by: string;
  };
}

const formatDateParam = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseFilterDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const formatFilterDateLabel = (value: string) => {
  if (!value) return "Any date";
  return parseFilterDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AvailableRideScreen: React.FC<AvailableRideScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const router = useRouter();
  const routeParams = useDecodedLocalSearchParams();
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Buffered selection so iOS users can scroll the spinner without
  // committing the filter until they tap Done. Without this, every
  // wheel tick would re-fetch rides — and Cancel would have no way
  // to revert because we'd have already written through to `filters`.
  const [tempPickerDate, setTempPickerDate] = useState<Date | null>(null);
  const [searchMeta, setSearchMeta] = useState<ApiResponse['meta'] | null>(null);
  // Viewer's gender — used to gate the same-gender pink affinity tint on
  // host cards. Null while we wait for /user/details (or for guests, who
  // simply never qualify).
  const [viewerGender, setViewerGender] = useState<string | null>(null);
  
  // State for locations and coordinates
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromCoordinates, setFromCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [toCoordinates, setToCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  
  const [filters, setFilters] = useState<SearchFilters>({
    maxPrice: '',
    minSeats: '',
    sortBy: 'relevance',
    preferredTime: '',
    radius: '10',
    date: '',
  });

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  // One-shot fetch for the viewer's gender. Guests never qualify for the
  // same-gender tint, so skip the call entirely. Stored as lower-case to
  // line up with what the server returns on host cards.
  useEffect(() => {
    if (isGuest) {
      setViewerGender(null);
      return;
    }
    let cancelled = false;
    apiUtil
      .get<{ user?: { gender?: string } }>("/user/details")
      .then((res) => {
        if (cancelled) return;
        const g = (res?.user?.gender || "").toLowerCase();
        setViewerGender(g || null);
      })
      .catch((err) => {
        console.warn("viewer gender fetch failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, apiUtil]);

  // Extract and update route parameters when they change
  useEffect(() => {
    let newFromLocation = "";
    let newToLocation = "";
    let newFromCoordinates: { latitude: number; longitude: number } | undefined;
    let newToCoordinates: { latitude: number; longitude: number } | undefined;

    if (routeParams && typeof routeParams === "object") {
      if ("fromLocation" in routeParams && typeof (routeParams as any).fromLocation === "string") {
        newFromLocation = (routeParams as any).fromLocation;
      }
      if ("toLocation" in routeParams && typeof (routeParams as any).toLocation === "string") {
        newToLocation = (routeParams as any).toLocation;
      }
      if ("fromCoordinates" in routeParams && (routeParams as any).fromCoordinates) {
        newFromCoordinates = (routeParams as any).fromCoordinates;
      }
      if ("toCoordinates" in routeParams && (routeParams as any).toCoordinates) {
        newToCoordinates = (routeParams as any).toCoordinates;
      }
      if ((routeParams as any).params) {
        const nested = (routeParams as any).params;
        if (typeof nested.fromLocation === "string") {
          newFromLocation = nested.fromLocation;
        }
        if (typeof nested.toLocation === "string") {
          newToLocation = nested.toLocation;
        }
        if (nested.fromCoordinates) {
          newFromCoordinates = nested.fromCoordinates;
        }
        if (nested.toCoordinates) {
          newToCoordinates = nested.toCoordinates;
        }
      }
    }

    console.log('Route params updated:', { newFromLocation, newToLocation, newFromCoordinates, newToCoordinates });
    
    setFromLocation(newFromLocation);
    setToLocation(newToLocation);
    setFromCoordinates(newFromCoordinates);
    setToCoordinates(newToCoordinates);
  }, [routeParams]);

  const buildQueryParams = () => {
    let queryParams = `start_location=${encodeURIComponent(fromLocation)}&end_location=${encodeURIComponent(toLocation)}`;
    
    if (fromCoordinates) {
      queryParams += `&start_lat=${fromCoordinates.latitude}&start_lon=${fromCoordinates.longitude}`;
    }
    if (toCoordinates) {
      queryParams += `&end_lat=${toCoordinates.latitude}&end_lon=${toCoordinates.longitude}`;
    }
    
    // Add filter parameters
    if (filters.maxPrice) {
      queryParams += `&max_price=${filters.maxPrice}`;
    }
    if (filters.minSeats) {
      queryParams += `&min_seats=${filters.minSeats}`;
    }
    if (filters.sortBy !== 'relevance') {
      queryParams += `&sort_by=${filters.sortBy}`;
    }
    if (filters.preferredTime) {
      queryParams += `&preferred_time=${filters.preferredTime}`;
    }
    if (filters.radius !== '10') {
      queryParams += `&radius=${filters.radius}`;
    }
    if (filters.date) {
      queryParams += `&date=${filters.date}`;
    }
    
    return queryParams;
  };

  const fetchRides = () => {
    if (!fromLocation || !toLocation) {
      console.log("No locations provided, not fetching rides.");
      setRides([]);
      return;
    }

    setLoading(true);
    console.log("Fetching rides for:", { fromLocation, toLocation, fromCoordinates, toCoordinates, filters });
    
    const queryParams = buildQueryParams();
    
    apiUtil
      .get<ApiResponse>(`/ride/search?${queryParams}`)
      .then((response) => {
        console.log("API response:", response);
        if (response && response.rides) {
          setRides(response.rides);
          setSearchMeta(response.meta);
        } else {
          // Fallback for old API format
          setRides(Array.isArray(response) ? response : []);
          setSearchMeta(null);
        }
      })
      .catch((err: any) => {
        // AUTHENTICATION_REDIRECT bubbles up here as a real Error when
        // a guest hits anything ApiUtil considers private. /ride/search
        // is public (OptionalAuthenticate), so this branch should only
        // ever fire on actual network failures now — but we still
        // belt-and-braces guard against the auth redirect to make sure
        // a stray 401 from a side call doesn't show "Failed to fetch
        // rides" to a guest with a perfectly valid empty result set.
        const isAuthRedirect =
          err instanceof Error && err.message === "AUTHENTICATION_REDIRECT";
        console.error("API error:", err);
        setRides([]);
        setSearchMeta(null);
        if (!isAuthRedirect) {
          BrandedAlert.alert("Error", "Failed to fetch rides. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isFocused) return;
    setSelectedRideId(null); 
    setNavBarVariant(0);
    setNavBarText("");
    setNavBarIcon(require("../../assets/wallet.png"));
    setNavBarItems(bottomNavItems);
    
    fetchRides();
    
    return () => {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    };
  }, [isFocused, fromLocation, toLocation, fromCoordinates, toCoordinates]);

  useEffect(() => {
    if (!isFocused) return;
    if (selectedRideId) {
      setNavBarVariant(2);
      setNavBarText("View Details");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    } else {
      setNavBarVariant(0);
      setNavBarText("");
      setNavBarIcon(require("../../assets/wallet.png"));
      setNavBarItems(bottomNavItems);
    }
  }, [
    isFocused,
    selectedRideId,
    setNavBarVariant,
    setNavBarText,
    setNavBarIcon,
    setNavBarItems,
  ]);

  const handleRideSelection = (rideId: string) => {
    const selectedRide = rides.find(ride => ride.id === rideId);
    if (selectedRide) {
      router.navigate(appHref("AvailableRidesSelectedScreen", {
        ride: selectedRide,
      } as any));
    } else {
      setSelectedRideId((prev) => (prev === rideId ? null : rideId));
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchRides();
  };

  const clearFilters = () => {
    setFilters({
      maxPrice: '',
      minSeats: '',
      sortBy: 'relevance',
      preferredTime: '',
      radius: '10',
      date: '',
    });
  };

  const selectedFilterDate = filters.date ? parseFilterDate(filters.date) : new Date();

  // Android uses the imperative `DateTimePickerAndroid.open(...)` which
  // surfaces the platform-native calendar dialog and commits on its own
  // confirm button — no buffer needed; we write through to `filters`
  // directly from `onChange` once Android returns a selection.
  const onAndroidDatePick = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    // Android emits an event when the user dismisses; check `type` so
    // tapping Cancel doesn't silently overwrite the filter with the
    // current `value`.
    if (event.type !== "set" || !selectedDate) return;
    setFilters((current) => ({ ...current, date: formatDateParam(selectedDate) }));
  };

  // iOS picks land in the buffer only. The modal sheet's Done button
  // commits, Cancel discards.
  const onIosSpinnerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setTempPickerDate(selectedDate);
  };

  const openDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedFilterDate,
        mode: "date",
        display: "calendar",
        minimumDate: new Date(),
        onChange: onAndroidDatePick,
      });
      return;
    }
    // Seed the buffer with whatever is currently committed so the
    // spinner doesn't jump to today the moment the modal opens.
    setTempPickerDate(selectedFilterDate);
    setShowDatePicker(true);
  };

  const confirmDatePicker = () => {
    if (tempPickerDate) {
      setFilters((current) => ({
        ...current,
        date: formatDateParam(tempPickerDate),
      }));
    }
    setShowDatePicker(false);
  };

  const cancelDatePicker = () => {
    setTempPickerDate(null);
    setShowDatePicker(false);
  };

  const clearDateFromPicker = () => {
    setFilters((current) => ({ ...current, date: "" }));
    setTempPickerDate(null);
    setShowDatePicker(false);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const formatHostRating = (ride: RideData) => {
    const count = ride.host_rating_count || 0;
    if (!ride.host_rating_average || count === 0) return null;
    return `${ride.host_rating_average.toFixed(1)} (${count})`;
  };

  const getRelevanceLabel = (score?: number) => {
    if (!score) return '';
    if (score >= 80) return '🔥 Perfect Match';
    if (score >= 60) return '✨ Great Match';
    if (score >= 40) return '👍 Good Match';
    return '💡 Possible Match';
  };

  const getSortLabel = () => {
    switch (filters.sortBy) {
      case 'time': return 'by Time';
      case 'price': return 'by Price';
      case 'distance': return 'by Distance';
      default: return 'by Relevance';
    }
  };

  const [showSortBySelector, setShowSortBySelector] = useState(false);
  const [showPreferredTimeSelector, setShowPreferredTimeSelector] = useState(false);
  const [showMinSeatsSelector, setShowMinSeatsSelector] = useState(false);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  const sortByOptions = [
    { label: "Relevance (Smart)", value: "relevance" },
    { label: "Departure Time", value: "time" },
    { label: "Price (Low to High)", value: "price" },
    { label: "Distance", value: "distance" },
  ];

  const preferredTimeOptions = [
    { label: "Any Time", value: "" },
    { label: "Morning (6AM - 12PM)", value: "morning" },
    { label: "Afternoon (12PM - 5PM)", value: "afternoon" },
    { label: "Evening (5PM - 9PM)", value: "evening" },
    { label: "Night (9PM - 6AM)", value: "night" },
  ];

  const minSeatsOptions = [
    { label: "Any", value: "" },
    { label: "1 seat", value: "1" },
    { label: "2 seats", value: "2" },
    { label: "3 seats", value: "3" },
    { label: "4+ seats", value: "4" },
  ];

  const radiusOptions = [
    { label: "5 km", value: "5" },
    { label: "10 km (Recommended)", value: "10" },
    { label: "20 km", value: "20" },
    { label: "50 km", value: "50" },
  ];

  const renderOptionSelector = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { label: string; value: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.selectorModalContainer}>
        <View style={styles.selectorModalContent}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.selectorCloseButton}>
              <Text style={styles.selectorCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.selectorOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectorOption,
                  selectedValue === option.value && styles.selectedSelectorOption
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.selectorOptionText,
                  selectedValue === option.value && styles.selectedSelectorOptionText
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Image
                    source={require("../../assets/check.png")}
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.filterModalContainer}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Search Filters</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.filterCloseButton}
            >
              <Text style={styles.filterCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={() => setShowSortBySelector(true)}
              >
                <Text style={styles.filterSelectorText}>
                  {sortByOptions.find(opt => opt.value === filters.sortBy)?.label || "Select option"}
                </Text>
                <Text style={styles.filterSelectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Preferred Time</Text>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={() => setShowPreferredTimeSelector(true)}
              >
                <Text style={styles.filterSelectorText}>
                  {preferredTimeOptions.find(opt => opt.value === filters.preferredTime)?.label || "Any Time"}
                </Text>
                <Text style={styles.filterSelectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Maximum Price (₹)</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.maxPrice}
                onChangeText={(text) => setFilters({...filters, maxPrice: text})}
                placeholder="Enter max budget"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Minimum Seats Required</Text>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={() => setShowMinSeatsSelector(true)}
              >
                <Text style={styles.filterSelectorText}>
                  {minSeatsOptions.find(opt => opt.value === filters.minSeats)?.label || "Any"}
                </Text>
                <Text style={styles.filterSelectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Search Radius</Text>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={() => setShowRadiusSelector(true)}
              >
                <Text style={styles.filterSelectorText}>
                  {radiusOptions.find(opt => opt.value === filters.radius)?.label || "10 km (Recommended)"}
                </Text>
                <Text style={styles.filterSelectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date</Text>
              <TouchableOpacity
                style={styles.filterSelector}
                onPress={openDatePicker}
                accessibilityRole="button"
                accessibilityLabel="Choose ride date"
              >
                <Text style={styles.filterSelectorText}>
                  {formatFilterDateLabel(filters.date)}
                </Text>
                <Text style={styles.filterSelectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {renderOptionSelector(
        showSortBySelector,
        () => setShowSortBySelector(false),
        "Sort By",
        sortByOptions,
        filters.sortBy,
        (value) => setFilters({...filters, sortBy: value as any})
      )}

      {renderOptionSelector(
        showPreferredTimeSelector,
        () => setShowPreferredTimeSelector(false),
        "Preferred Time",
        preferredTimeOptions,
        filters.preferredTime,
        (value) => setFilters({...filters, preferredTime: value as any})
      )}

      {renderOptionSelector(
        showMinSeatsSelector,
        () => setShowMinSeatsSelector(false),
        "Minimum Seats Required",
        minSeatsOptions,
        filters.minSeats,
        (value) => setFilters({...filters, minSeats: value})
      )}

      {renderOptionSelector(
        showRadiusSelector,
        () => setShowRadiusSelector(false),
        "Search Radius",
        radiusOptions,
        filters.radius,
        (value) => setFilters({...filters, radius: value})
      )}

      {/* iOS date picker as a bottom modal sheet on the forest surface.
          Spinner display with `themeVariant="dark"` matches the rest of
          the modal chrome (forest fill, lime accents) — was previously
          `display="inline"` which rendered a hard-coded white calendar
          slab with super-faded date text on top, jarring against the
          dark filter sheet. Pattern mirrors the date-time picker in
          RideDetailsSelector so the app speaks one language for time
          input. Android continues to use the imperative native dialog
          via `DateTimePickerAndroid.open(...)`. */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={cancelDatePicker}
        >
          <View style={styles.dateModalContainer}>
            <View style={styles.dateModalContent}>
              <View style={styles.dateModalHeader}>
                <TouchableOpacity onPress={cancelDatePicker} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.dateModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Choose date</Text>
                <TouchableOpacity onPress={confirmDatePicker} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={[styles.dateModalButtonText, styles.dateModalButtonTextStrong]}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateModalPickerContainer}>
                <DateTimePicker
                  value={tempPickerDate || selectedFilterDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={onIosSpinnerChange}
                  themeVariant="dark"
                  textColor={AppColors.basicWhite}
                  accentColor={AppColors.primaryLightGreen}
                  style={styles.dateModalPicker}
                />
              </View>

              <View style={styles.dateModalQuickRow}>
                <TouchableOpacity
                  style={styles.dateModalQuickButton}
                  onPress={() => setTempPickerDate(new Date())}
                >
                  <Text style={styles.dateModalQuickText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateModalQuickButton}
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setTempPickerDate(tomorrow);
                  }}
                >
                  <Text style={styles.dateModalQuickText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateModalQuickButton, styles.dateModalQuickButtonGhost]}
                  onPress={clearDateFromPicker}
                >
                  <Text style={[styles.dateModalQuickText, styles.dateModalQuickTextGhost]}>Any date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>

      <View style={styles.ridesHeaderRow}>
        <View style={styles.ridesHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <View>
            <Text style={styles.ridesCountText}>
              {loading ? "Searching..." : `${rides.length} rides found`}
            </Text>
            {searchMeta && (
              <Text style={styles.searchMetaText}>
                Sorted {getSortLabel()}
              </Text>
            )}
          </View>
        </View>
        {/* Top-right Create-Ride CTA removed — it duplicated the
            "Post a ride" CTA inside the empty state and shouted at
            every search results screen, including ones with plenty
            of rides already. Posting belongs in the empty state /
            Home composer, not as a permanent header chip. */}
      </View>

      {/* Loader only on COLD fetches — i.e. when there's nothing on
          screen yet. If we already have cards from a previous fetch
          (focus regain, filter apply, etc.), keep them visible and
          let the new payload swap them in silently. The "Searching..."
          label in the header still tells the user a request is in
          flight, so this isn't a stealth update. */}
      {loading && rides.length === 0 && <SearchingForRidesLoader />}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentContainer, { backgroundColor: require('../../design_systems/colors').default.primaryLightGreen }]}>
          {rides.length === 0 && !loading ? (
            <View style={styles.noRidesContainer}>
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Image
                  // Cropped emoji-only asset — the full no-rides.png
                  // has "Uh Oh! No Rides Available" baked in, which
                  // collides with our own title + body below.
                  source={require('../../assets/no-rides-emoji.png')}
                  style={{
                    marginTop: 16,
                    width: Math.min(Dimensions.get('window').width * 0.45, 200),
                    height: Math.min(Dimensions.get('window').width * 0.45, 200),
                    resizeMode: 'contain',
                  }}
                />
              </View>
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 22, color: require('../../design_systems/colors').default.secondaryDarkGreen, letterSpacing: -0.4, textAlign: 'center', marginBottom: 6 }}>
                No rides on this route yet
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 15, lineHeight: 22, color: require('../../design_systems/colors').default.secondaryDarkGreen, opacity: 0.7, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
                Try a wider time window, or post your own ride and let others jump in.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.adjustFiltersButton, { backgroundColor: require('../../design_systems/colors').default.secondaryDarkGreen }]}
                  onPress={() => setShowFilters(true)}
                >
                  <Text style={[styles.adjustFiltersButtonText, { color: require('../../design_systems/colors').default.primaryLightGreen, fontFamily: 'NunitoSans_800ExtraBold' }]}>Adjust filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  // Cream-filled secondary button — pairs with the
                  // forest "Adjust filters" sibling on the left as a
                  // calm primary/secondary duo. No border; the cream
                  // surface alone provides enough contrast against
                  // the lime canvas.
                  style={[
                    styles.adjustFiltersButton,
                    {
                      backgroundColor: require('../../design_systems/colors').default.cardSurface,
                    },
                  ]}
                  onPress={() => {
                    // Posting requires an account — gate here so the
                    // user gets the AuthSheet up front instead of
                    // filling out the whole form only to hit a 401
                    // ("Authorization header not found") on submit.
                    const createTarget = {
                      screen: "CreateRide" as const,
                      params: {
                        fromLocation,
                        toLocation,
                        fromCoordinates,
                        toCoordinates,
                        date: filters.date || undefined,
                      },
                    };
                    if (!requireAuth(createTarget as any, "to post a ride")) return;
                    router.navigate(appHref("CreateRide", createTarget.params as any));
                  }}
                >
                  <Text style={[styles.adjustFiltersButtonText, { color: require('../../design_systems/colors').default.secondaryDarkGreen, fontFamily: 'NunitoSans_800ExtraBold' }]}>Post a ride</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            rides
              .filter((ride: RideData) => ride.total_seats > (ride.booked_seats + 1)) // Filter out full rides (accounting for ride creator)
              .map((ride: RideData) => (
              <View key={ride.id} style={styles.rideCardWrapper}>
                <RideCard
                  id={ride.id}
                  origin={ride.start_location}
                  destination={ride.end_location}
                  // Opt in to long-press share — works for any
                  // signed-in or guest user; the share sheet has no
                  // host-only restriction.
                  shareable
                  startTimeIso={ride.start_time}
                  time={new Date(ride.start_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  // Short weekday + day + month, e.g. "Thu, 21 May" —
                  // the time is already in the top-right detail row, so
                  // this slot just owns the date half of the timestamp.
                  date={new Date(ride.start_time).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  price={ride.total_price}
                  isSelected={selectedRideId === ride.id}
                  seatsAvailable={`${ride.total_seats - ride.booked_seats}/${ride.total_seats}`}
                  onSelect={handleRideSelection}
                  pricePerPerson={false}
                  matchReason={ride.match_reason}
                  // Same-gender affinity tint — only paints when both
                  // sides resolve to "female". Guests + missing host
                  // gender fall through to the default surface.
                  isSameGenderFemale={
                    ride.same_gender_female === true ||
                    ride.is_same_gender_female === true ||
                    (
                      viewerGender === "female" &&
                      (ride.host_user_gender || "").toLowerCase() === "female"
                    )
                  }
                />

                {/* Sub-row beneath card: host + walking distances. Kept compact
                    so the BlaBlaCar-style card stays the visual anchor. */}
                <View style={styles.rideEnhancements}>
                  <View style={styles.hostLine}>
                    <Text style={styles.hostName}>
                      Hosted by {ride.host_user_name}
                    </Text>
                    {formatHostRating(ride) ? (
                      <Text style={styles.hostRating}>
                        ★ {formatHostRating(ride)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.distanceInfo}>
                    {ride.start_distance ? (
                      <Text style={styles.distanceText}>
                        {formatDistance(ride.start_distance)} from pickup
                      </Text>
                    ) : null}
                    {ride.end_distance ? (
                      <Text style={styles.distanceText}>
                        {formatDistance(ride.end_distance)} from drop-off
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {renderFilterModal()}
    </View>
  );
};

export default AvailableRideScreen;
