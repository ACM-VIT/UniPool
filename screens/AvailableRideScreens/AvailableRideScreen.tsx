import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Image, Dimensions, Platform, RefreshControl, FlatList, ListRenderItem, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import BrandInfo from "../../components/BrandInfo/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";
import RideCardSkeleton from "../../components/RideCardSkeleton";
import MatchInsightsShelf, { MatchSignal } from "../../components/MatchInsightsShelf";
import { DarkEmptyGlyph } from "../../components/EmptyState";
import AppColors from "../../design_systems/colors";

import { useApi } from "../../utils/ApiUtil";
import { useAuthGate } from "../../contexts/AuthGate";
import { useUser } from "../../contexts/UserContext";
import { useThemeColors } from "../../contexts/ThemeContext";
import bottomNavItems from "../../data/BottomNavigationItems";
import styles from "./AvailableRideScreens.styles";
import BrandedAlert from "../../components/BrandedAlert";
import { appHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { hasSeatsLeft, seatsAvailableLabel } from "../../utils/seatMath";
import { useTabletContentStyle } from "../../utils/responsive";
import { createDateTimeFormatter } from "../../utils/rideTime";
import ExternalRideCard from "../../components/ExternalRideCard";
import type { ExternalRide } from "../../utils/ExternalRideService";

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
  // Lowercase gender value used by same-gender result-card highlighting.
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
  match_signals?: MatchSignal[];
}

type VisibleRideItem = {
  ride: RideData;
  isBestMatch: boolean;
};

interface ApiResponse {
  rides: RideData[];
  /** Rides the server marked as tight route/time matches. */
  strict_matches?: { id: string; start_distance_m: number; end_distance_m: number }[];
  external_rides?: ExternalRide[];
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

const rideTimeFormatter = createDateTimeFormatter(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const rideDateFormatter = createDateTimeFormatter("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const formatRideStart = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { time: "", date: "" };
  return {
    time: rideTimeFormatter?.format(date) ?? date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: rideDateFormatter?.format(date) ?? date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  };
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

const AvailableRideResultRow = React.memo(function AvailableRideResultRow({
  item,
  selectedRideId,
  viewerGender,
  onSelect,
}: {
  item: VisibleRideItem;
  selectedRideId: string | null;
  viewerGender: string | null;
  onSelect: (rideId: string) => void;
}) {
  const { ride, isBestMatch } = item;
  const startLabels = useMemo(() => formatRideStart(ride.start_time), [ride.start_time]);
  const hostRating = formatHostRating(ride);
  // Inline palette overrides keep the under-card row legible in dark mode.
  const colors = useThemeColors();

  return (
    <View style={styles.rideCardWrapper}>
      {isBestMatch ? (
        <View style={styles.bestMatchBadgeWrap} pointerEvents="none">
          <View style={styles.bestMatchBadge}>
            <Text style={styles.bestMatchBadgeGlyph}>★</Text>
            <Text style={styles.bestMatchBadgeText}>Best match</Text>
          </View>
        </View>
      ) : null}
      <RideCard
        id={ride.id}
        origin={ride.start_location}
        destination={ride.end_location}
        shareable
        startTimeIso={ride.start_time}
        time={startLabels.time}
        date={startLabels.date}
        price={ride.total_price}
        isSelected={selectedRideId === ride.id}
        seatsAvailable={seatsAvailableLabel(ride.total_seats, ride.booked_seats)}
        totalSeats={ride.total_seats}
        onSelect={onSelect}
        pricePerPerson={false}
        matchReason={ride.match_reason}
        isSameGenderFemale={
          ride.same_gender_female === true ||
          ride.is_same_gender_female === true ||
          (
            viewerGender === "female" &&
            (ride.host_user_gender || "").toLowerCase() === "female"
          )
        }
      />

      {Array.isArray(ride.match_signals) && ride.match_signals.length > 0 ? (
        <MatchInsightsShelf
          signals={ride.match_signals}
          isBestMatch={isBestMatch}
        />
      ) : null}

      <View style={styles.rideEnhancements}>
        <View style={styles.hostLine}>
          <Text style={[styles.hostName, { color: colors.textPrimary }]}>
            Hosted by {ride.host_user_name}
          </Text>
          {hostRating ? (
            <Text style={[styles.hostRating, colors.mode === "dark" && { color: colors.textSecondary }]}>
              ★ {hostRating}
            </Text>
          ) : null}
        </View>
        <View style={styles.distanceInfo}>
          {ride.start_distance ? (
            <Text style={[styles.distanceText, colors.mode === "dark" && { color: colors.textSecondary }]}>
              {formatDistance(ride.start_distance)} from pickup
            </Text>
          ) : null}
          {ride.end_distance ? (
            <Text style={[styles.distanceText, colors.mode === "dark" && { color: colors.textSecondary }]}>
              {formatDistance(ride.end_distance)} from drop-off
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const DEBUG_RIDE_SEARCH =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_RIDE_SEARCH === "1";

const AvailableRideScreen: React.FC<AvailableRideScreenProps> = ({
  setNavBarVariant,
  setNavBarText,
  setNavBarIcon,
  setNavBarItems,
}) => {
  const { navigate, back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const routeParams = useDecodedLocalSearchParams();
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();
  const colors = useThemeColors();
  // Real safe-area inset keeps the header below system chrome.
  const insets = useSafeAreaInsets();

  // Monotonic id for search requests. Only the response from the newest
  // request is applied, so an earlier (stale/empty) request that resolves out
  // of order can't overwrite the latest results — that's the "no results, then
  // results on the same search" race.
  const fetchSeqRef = useRef(0);

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [externalRides, setExternalRides] = useState<ExternalRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // iOS date selection is committed only when the user taps Done.
  const [tempPickerDate, setTempPickerDate] = useState<Date | null>(null);
  const [searchMeta, setSearchMeta] = useState<ApiResponse['meta'] | null>(null);
  // Strict-match IDs drive the "Best match" badge on search results.
  const [strictMatchIds, setStrictMatchIds] = useState<Set<string>>(new Set());
  // Shared user context avoids a screen-local profile request.
  const { user: viewerUser } = useUser();
  const viewerGender = (viewerUser?.gender || "").toLowerCase() || null;
  const visibleRides = useMemo(
    () =>
      rides.flatMap((ride: RideData) =>
        hasSeatsLeft(ride.total_seats, ride.booked_seats)
          ? [{
          ride,
          isBestMatch: strictMatchIds.has(ride.id),
        }]
          : [],
      ),
    [rides, strictMatchIds],
  );
  
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromCoordinates, setFromCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [toCoordinates, setToCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [targetTimeIso, setTargetTimeIso] = useState("");
  
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

  // Normalize route params from both direct and nested Expo Router payloads.
  useEffect(() => {
    let newFromLocation = "";
    let newToLocation = "";
    let newFromCoordinates: { latitude: number; longitude: number } | undefined;
    let newToCoordinates: { latitude: number; longitude: number } | undefined;
    let newTargetTimeIso = "";

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
      if ("targetTime" in routeParams && typeof (routeParams as any).targetTime === "string") {
        newTargetTimeIso = (routeParams as any).targetTime;
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
        if (typeof nested.targetTime === "string") {
          newTargetTimeIso = nested.targetTime;
        }
      }
    }

    if (DEBUG_RIDE_SEARCH) {
      console.log('Route params updated:', { newFromLocation, newToLocation, newFromCoordinates, newToCoordinates, newTargetTimeIso });
    }
    
    setFromLocation(newFromLocation);
    setToLocation(newToLocation);
    setFromCoordinates(newFromCoordinates);
    setToCoordinates(newToCoordinates);
    setTargetTimeIso(newTargetTimeIso);
    const targetTimeDate = newTargetTimeIso ? new Date(newTargetTimeIso) : null;
    const routeDate =
      targetTimeDate && !Number.isNaN(targetTimeDate.getTime())
        ? formatDateParam(targetTimeDate)
        : "";
    setFilters((current) =>
      current.date === routeDate ? current : { ...current, date: routeDate },
    );
  }, [routeParams]);

  const searchQueryParams = useMemo(() => {
    let queryParams = `start_location=${encodeURIComponent(fromLocation)}&end_location=${encodeURIComponent(toLocation)}`;
    const targetTimeDate = targetTimeIso ? new Date(targetTimeIso) : null;
    const hasValidTargetTime =
      !!targetTimeDate && !Number.isNaN(targetTimeDate.getTime());
    const targetDate = hasValidTargetTime ? formatDateParam(targetTimeDate) : "";
    
    if (fromCoordinates) {
      queryParams += `&start_lat=${fromCoordinates.latitude}&start_lon=${fromCoordinates.longitude}`;
    }
    if (toCoordinates) {
      queryParams += `&end_lat=${toCoordinates.latitude}&end_lon=${toCoordinates.longitude}`;
    }
    
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
    const effectiveDate = filters.date || targetDate;
    if (effectiveDate) {
      queryParams += `&date=${effectiveDate}`;
    }
    if (hasValidTargetTime && (!filters.date || filters.date === targetDate)) {
      queryParams += `&target_time=${encodeURIComponent(targetTimeIso)}`;
    }
    
    return queryParams;
  }, [
    filters.date,
    filters.maxPrice,
    filters.minSeats,
    filters.preferredTime,
    filters.radius,
    filters.sortBy,
    fromCoordinates,
    fromLocation,
    targetTimeIso,
    toCoordinates,
    toLocation,
  ]);

  const fetchRides = ({ refresh = false }: { refresh?: boolean } = {}) => {
    if (!fromLocation || !toLocation) {
      if (DEBUG_RIDE_SEARCH) console.log("No locations provided, not fetching rides.");
      // Invalidate any in-flight request so its late response can't land.
      fetchSeqRef.current += 1;
      setRides([]);
      setExternalRides([]);
      setSearchMeta(null);
      setStrictMatchIds(new Set());
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Claim this request as the newest; its response is the only one applied.
    const seq = ++fetchSeqRef.current;
    const isCurrent = () => seq === fetchSeqRef.current;

    // First fetch uses the page loader; refreshes use the inline spinner.
    if (refresh) {
      setRefreshing(true);
    } else {
      setRides([]);
      setExternalRides([]);
      setSearchMeta(null);
      setStrictMatchIds(new Set());
      setLoading(true);
    }
    if (DEBUG_RIDE_SEARCH) {
      console.log("Fetching rides for:", { fromLocation, toLocation, fromCoordinates, toCoordinates, filters });
    }

    const searchEndpoint = `/ride/search?${searchQueryParams}`;
    const searchRequest = refresh
      ? apiUtil.getUncached<ApiResponse>(searchEndpoint)
      : apiUtil.get<ApiResponse>(searchEndpoint);

    searchRequest
      .then((response) => {
        if (!isCurrent()) return; // a newer search superseded this one
        if (DEBUG_RIDE_SEARCH) console.log("API response:", response);
        if (response && response.rides) {
          setRides(response.rides);
          setExternalRides(response.external_rides ?? []);
          setSearchMeta(response.meta);
          const ids = new Set<string>();
          for (const m of response.strict_matches ?? []) {
            if (m?.id) ids.add(m.id);
          }
          setStrictMatchIds(ids);
        } else {
          setRides(Array.isArray(response) ? response : []);
          setExternalRides([]);
          setSearchMeta(null);
          setStrictMatchIds(new Set());
        }
      })
      .catch((err: any) => {
        if (!isCurrent()) return; // a newer search superseded this one
        // Auth redirects are handled by the auth flow, not this result list.
        const isAuthRedirect =
          err instanceof Error && err.message === "AUTHENTICATION_REDIRECT";
        console.error("API error:", err);
        setRides([]);
        setExternalRides([]);
        setSearchMeta(null);
        setStrictMatchIds(new Set());
        if (!isAuthRedirect) {
          BrandedAlert.alert("Error", "Failed to fetch rides. Please try again.");
        }
      })
      .finally(() => {
        if (!isCurrent()) return; // keep the newest request's spinner state
        setLoading(false);
        setRefreshing(false);
      });
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
  }, [isFocused, searchQueryParams]);

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

  const handleRideSelection = useCallback((rideId: string) => {
    const selectedRide = rides.find(ride => ride.id === rideId);
    if (selectedRide) {
      navigate(appHref("AvailableRidesSelectedScreen", {
        ride: selectedRide,
      } as any));
    } else {
      setSelectedRideId((prev) => (prev === rideId ? null : rideId));
    }
  }, [rides, navigate]);

  const applyFilters = () => {
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTargetTimeIso("");
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

  const openDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedFilterDate,
        mode: "date",
        minimumDate: new Date(),
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type !== "set" || !selectedDate) return;
          setFilters((current) => ({
            ...current,
            date: formatDateParam(selectedDate),
          }));
        },
      });
      return;
    }
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
        <View style={[styles.selectorModalContent, colors.mode === "dark" && { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.selectorHeader}>
            <Text style={[styles.selectorTitle, colors.mode === "dark" && { color: colors.textPrimary }]}>{title}</Text>
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

  const renderRideItem: ListRenderItem<VisibleRideItem> = useCallback(({ item }) => (
    <AvailableRideResultRow
      item={item}
      selectedRideId={selectedRideId}
      viewerGender={viewerGender}
      onSelect={handleRideSelection}
    />
  ), [handleRideSelection, selectedRideId, viewerGender]);

  const rideKeyExtractor = useCallback((item: VisibleRideItem) => item.ride.id, []);

  const renderEmptyResults = useCallback(() => {
    if (loading && rides.length === 0) {
      return (
        <>
          {[0, 1, 2].map((i) => (
            <View key={`skeleton-${i}`} style={styles.rideCardWrapper}>
              <RideCardSkeleton />
            </View>
          ))}
        </>
      );
    }

    if (rides.length !== 0 || externalRides.length !== 0 || loading) return null;

    return (
      <View style={styles.noRidesContainer}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 8, marginTop: 16 }}>
          {colors.mode === 'dark' ? (
            // Use theme-aware artwork in dark mode.
            <DarkEmptyGlyph
              size={Math.min(Dimensions.get('window').width * 0.45, 200)}
              colors={colors}
            />
          ) : (
            <Image
              source={require('../../assets/no-rides-emoji.png')}
              style={{
                width: Math.min(Dimensions.get('window').width * 0.45, 200),
                height: Math.min(Dimensions.get('window').width * 0.45, 200),
                resizeMode: 'contain',
              }}
            />
          )}
        </View>
        <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center', marginBottom: 6 }}>
          No rides on this route yet
        </Text>
        <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 15, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
          Try a wider time window, or post your own ride and let others jump in.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.adjustFiltersButton, { backgroundColor: colors.navFill }]}
            onPress={() => setShowFilters(true)}
          >
            <Text style={[styles.adjustFiltersButtonText, { color: colors.navIconInactive, fontFamily: 'NunitoSans_800ExtraBold' }]}>Adjust filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.adjustFiltersButton,
              { backgroundColor: colors.mode === "dark" ? colors.primary : AppColors.cardSurface },
            ]}
            onPress={() => {
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
              navigate(appHref("CreateRide", createTarget.params as any));
            }}
          >
            <Text style={[styles.adjustFiltersButtonText, { color: colors.textOnAccent, fontFamily: 'NunitoSans_800ExtraBold' }]}>Post a ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    filters.date,
    fromCoordinates,
    fromLocation,
    loading,
    requireAuth,
    rides.length,
    externalRides.length,
    navigate, toCoordinates,
    toLocation,
    // Re-render when theme tokens used by the empty state change.
    colors,
  ]);

  const renderExternalRidesFooter = useCallback(() => {
    if (externalRides.length === 0) return null;
    const authReturnTo = {
      screen: "AvailableRidesScreen" as const,
      params: {
        fromLocation,
        toLocation,
        fromCoordinates,
        toCoordinates,
        targetTime: targetTimeIso || undefined,
      },
    };
    return (
      <View style={{ marginTop: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.inkLine }} />
          <Text style={{ fontFamily: "NunitoSans_700Bold", fontSize: 12.5, letterSpacing: 0.2, color: colors.textSecondary }}>
            More rides nearby
          </Text>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.inkLine }} />
        </View>
        <Text style={{ fontFamily: "NunitoSans_600SemiBold", fontSize: 11.5, textAlign: "center", marginBottom: 14, lineHeight: 16, color: colors.textTertiary }}>
          These aren't on UniPool. Contact the host directly to arrange.
        </Text>
        {externalRides.map((r) => (
          <ExternalRideCard key={r.id} ride={r} authReturnTo={authReturnTo} />
        ))}
      </View>
    );
  }, [
    colors,
    externalRides,
    fromCoordinates,
    fromLocation,
    targetTimeIso,
    toCoordinates,
    toLocation,
  ]);

  const totalRideCount = rides.length + externalRides.length;

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.filterModalContainer}>
        <View style={[styles.filterModalContent, colors.mode === "dark" && { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, colors.mode === "dark" && { color: colors.textPrimary }]}>Search Filters</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.filterCloseButton}
            >
              <Text style={[styles.filterCloseButtonText, colors.mode === "dark" && { color: colors.textPrimary }]}>✕</Text>
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

      {Platform.OS === "ios" && showDatePicker && (
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
                  onChange={(_event, selectedDate?: Date) => {
                    if (selectedDate) setTempPickerDate(selectedDate);
                  }}
                  themeVariant="dark"
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
    <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
      {/* Header stays above the virtualized result list while scrolling. */}
      <View style={[styles.brandInfoHeaderRow, { backgroundColor: colors.background }]}>
        <BrandInfo />
      </View>

      <View style={[styles.ridesHeaderRow, { paddingTop: insets.top + 44, backgroundColor: colors.background }]}>
        <View style={styles.ridesHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => back()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <View>
            <Text style={[styles.ridesCountText, { color: colors.textPrimary }]}>
              {loading ? "Searching..." : `${totalRideCount} ride${totalRideCount !== 1 ? "s" : ""} found`}
            </Text>
            {searchMeta && (
              <Text style={[styles.searchMetaText, { color: colors.textSecondary }]}>
                Sorted {getSortLabel()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* The virtualized list owns cold-loading and empty states. */}
      <FlatList
        style={styles.scrollView}
        data={loading && rides.length === 0 ? [] : visibleRides}
        keyExtractor={rideKeyExtractor}
        renderItem={renderRideItem}
        ListEmptyComponent={renderEmptyResults}
        ListFooterComponent={renderExternalRidesFooter}
        contentContainerStyle={[
          styles.contentContainer,
          { backgroundColor: colors.background },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRides({ refresh: true })}
            tintColor={AppColors.secondaryDarkGreen}
            colors={[AppColors.secondaryDarkGreen]}
          />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={48}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
      />

      {renderFilterModal()}
    </View>
  );
};

export default AvailableRideScreen;
