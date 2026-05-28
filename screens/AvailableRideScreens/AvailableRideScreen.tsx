import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Image, Dimensions, Platform, RefreshControl, FlatList, ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import BrandInfo from "../../components/BrandInfo";
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
import { seatsAvailableLabel } from "../../utils/seatMath";
import { useTabletContentStyle } from "../../utils/responsive";

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
  match_signals?: MatchSignal[];
}

type VisibleRideItem = {
  ride: RideData;
  isBestMatch: boolean;
};

interface ApiResponse {
  rides: RideData[];
  /** Server-flagged strict matches — rides whose start AND end are
   *  within 500m of the requested route and within ±3h of the
   *  requested time. Always present (empty array when no coords
   *  or no hits). Used here to flag a "Best match" badge on
   *  overlapping rows in the regular `rides` list. */
  strict_matches?: { id: string; start_distance_m: number; end_distance_m: number }[];
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

const rideTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
})();

const rideDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
})();

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
  // Theme-aware text colors for the under-card host + distance row.
  // Module-scope `styles.hostName` etc. bake forest ink that would
  // disappear against the dark canvas; the inline overrides below
  // swap to the active palette's primary / secondary text tones.
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
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const routeParams = useDecodedLocalSearchParams();
  const [isFocused, setIsFocused] = useState(true);
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();
  const colors = useThemeColors();
  // Real device safe-area inset. The styles previously used a
  // hardcoded `paddingTop: 35` on the rides header, which clipped
  // the brand wordmark + back chevron under the Android status bar
  // on devices with a taller-than-35dp top inset (Pixels, cutouts,
  // notches). Reading the real value keeps the header below system
  // chrome on every device.
  const insets = useSafeAreaInsets();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(false);
  // Pull-to-refresh — kept separate from `loading` so the result list
  // stays mounted while the user yanks the ScrollView down. `loading`
  // drives the full-screen searching loader on first mount; this
  // drives the inline spinner that hangs from the top of the list.
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Buffered selection so iOS users can scroll the spinner without
  // committing the filter until they tap Done. Without this, every
  // wheel tick would re-fetch rides — and Cancel would have no way
  // to revert because we'd have already written through to `filters`.
  const [tempPickerDate, setTempPickerDate] = useState<Date | null>(null);
  const [searchMeta, setSearchMeta] = useState<ApiResponse['meta'] | null>(null);
  // Set of ride IDs the server flagged as strict matches (start and
  // end both within 500m of the requested route AND within ±3h of
  // the requested time). Drives the "Best match" badge on
  // overlapping cards. Cleared on every search so stale flags from
  // a prior query don't bleed into new results.
  const [strictMatchIds, setStrictMatchIds] = useState<Set<string>>(new Set());
  // Viewer's gender — used to gate the same-gender pink affinity tint
  // on host cards. Sourced from the shared `UserContext` so the
  // /user/details fetch on cold boot happens ONCE for the whole app
  // instead of separately per screen. Stays `null` for guests and
  // while the context is still hydrating.
  const { user: viewerUser } = useUser();
  const viewerGender = (viewerUser?.gender || "").toLowerCase() || null;
  const visibleRides = useMemo(
    () =>
      rides
        .filter((ride: RideData) => ride.total_seats > (ride.booked_seats + 1))
        .map((ride: RideData) => ({
          ride,
          isBestMatch: strictMatchIds.has(ride.id),
        })),
    [rides, strictMatchIds],
  );
  
  // State for locations and coordinates
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

  // (The dedicated `/user/details` fetch that used to live here has
  //  moved into the shared `UserContext` — `viewerGender` above is
  //  derived from `useUser()`. This avoids a second network round
  //  trip on every visit to the search screen.)

  // Extract and update route parameters when they change
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
  }, [routeParams]);

  const buildQueryParams = () => {
    let queryParams = `start_location=${encodeURIComponent(fromLocation)}&end_location=${encodeURIComponent(toLocation)}`;
    const targetDate =
      targetTimeIso && !Number.isNaN(new Date(targetTimeIso).getTime())
        ? formatDateParam(new Date(targetTimeIso))
        : "";
    
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
    const effectiveDate = filters.date || targetDate;
    if (effectiveDate) {
      queryParams += `&date=${effectiveDate}`;
    }
    if (targetTimeIso && (!filters.date || filters.date === targetDate)) {
      queryParams += `&target_time=${encodeURIComponent(targetTimeIso)}`;
    }
    
    return queryParams;
  };

  const fetchRides = ({ refresh = false }: { refresh?: boolean } = {}) => {
    if (!fromLocation || !toLocation) {
      if (DEBUG_RIDE_SEARCH) console.log("No locations provided, not fetching rides.");
      setRides([]);
      return;
    }

    // First fetch shows the full-screen searching loader; subsequent
    // pull-to-refresh shows the inline spinner so the list stays put.
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    if (DEBUG_RIDE_SEARCH) {
      console.log("Fetching rides for:", { fromLocation, toLocation, fromCoordinates, toCoordinates, filters });
    }

    const queryParams = buildQueryParams();

    apiUtil
      .get<ApiResponse>(`/ride/search?${queryParams}`)
      .then((response) => {
        if (DEBUG_RIDE_SEARCH) console.log("API response:", response);
        if (response && response.rides) {
          setRides(response.rides);
          setSearchMeta(response.meta);
          const ids = new Set<string>();
          for (const m of response.strict_matches ?? []) {
            if (m?.id) ids.add(m.id);
          }
          setStrictMatchIds(ids);
        } else {
          // Fallback for old API format
          setRides(Array.isArray(response) ? response : []);
          setSearchMeta(null);
          setStrictMatchIds(new Set());
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
        setStrictMatchIds(new Set());
        if (!isAuthRedirect) {
          BrandedAlert.alert("Error", "Failed to fetch rides. Please try again.");
        }
      })
      .finally(() => {
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
  }, [isFocused, fromLocation, toLocation, fromCoordinates, toCoordinates, targetTimeIso]);

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
      router.navigate(appHref("AvailableRidesSelectedScreen", {
        ride: selectedRide,
      } as any));
    } else {
      setSelectedRideId((prev) => (prev === rideId ? null : rideId));
    }
  }, [rides, router]);

  const applyFilters = () => {
    setShowFilters(false);
    fetchRides();
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

    if (rides.length !== 0 || loading) return null;

    return (
      <View style={styles.noRidesContainer}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 8, marginTop: 16 }}>
          {colors.mode === 'dark' ? (
            // Dark mode: theme-aware SVG glyph instead of the
            // lime-tile PNG (which shouts on a charcoal canvas).
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
              router.navigate(appHref("CreateRide", createTarget.params as any));
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
    router,
    toCoordinates,
    toLocation,
    // Re-render the empty state's text/CTA colors when the theme
    // changes — without this the useMemo would cache the JSX with
    // the previous palette's colours captured at first build.
    colors,
  ]);

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
      {/* `BrandInfo` already handles its own safe-area padding
          internally (Platform-aware, uses `useSafeAreaInsets`), so
          DON'T add another `paddingTop` on this absolute wrapper or
          you'll double-count the inset on iOS (was pushing the
          wordmark ~47pt too far down on notched iPhones). The wrapper
          is just here to position + colour the band.
          The `ridesHeaderRow` below needs `insets.top + ~44` to clear
          the absolute `brandInfoHeaderRow` (whose height ≈
          BrandInfo's own paddingTop + ~32pt content); the old
          hardcoded `paddingTop: 35` was too short on tall-status-bar
          Pixels and clipped the back chevron + "X rides found"
          count behind the wordmark. */}
      <View style={[styles.brandInfoHeaderRow, { backgroundColor: colors.background }]}>
        <BrandInfo />
      </View>

      <View style={[styles.ridesHeaderRow, { paddingTop: insets.top + 44, backgroundColor: colors.background }]}>
        <View style={styles.ridesHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <View>
            <Text style={[styles.ridesCountText, { color: colors.textPrimary }]}>
              {loading ? "Searching..." : `${rides.length} rides found`}
            </Text>
            {searchMeta && (
              <Text style={[styles.searchMetaText, { color: colors.textSecondary }]}>
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

      {/* Cold-fetch loading state is handled inside the virtualized
          list so search results render in batches instead of mapping
          every card eagerly. */}
      <FlatList
        style={styles.scrollView}
        data={loading && rides.length === 0 ? [] : visibleRides}
        keyExtractor={rideKeyExtractor}
        renderItem={renderRideItem}
        ListEmptyComponent={renderEmptyResults}
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
