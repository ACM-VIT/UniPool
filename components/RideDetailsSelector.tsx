import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from "lucide-react-native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent as AndroidDateTimePickerEvent,
} from "@react-native-community/datetimepicker";import { format } from "date-fns";
import AppColors from "../design_systems/colors";
import { 
  searchLocationsWithFallback,
  getInstantLocationResults,
  getPopularLocations, 
  getPopularLocationsFallback,
  LocationResult,
  formatLocationName,
  getLocationDisplayName,
  POPULAR_LOCATIONS,
  UserLocation,
  NearbyPlace,
  getCoordinatesForLocation
} from "../utils/LocationService";

const { width: rawWidth, height: rawHeight } = Dimensions.get("window");
// Tablet branch only: phones keep their real window dimensions so
// every `width * 0.NN` / `height * 0.NN` size below scales naturally
// across iPhone SE → 16 Pro Max. On tablets we substitute a fixed
// iPhone 14/15 reference (390 × 844) so the From/To card icons,
// padding, and chip sizes don't inflate ~2.6× on the iPad canvas.
const isTablet = rawWidth >= 768;
const width = isTablet ? 390 : rawWidth;
const height = isTablet ? 844 : rawHeight;

const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const isLargeDevice = width >= 400;

const wp = (percentage: number) => (width * percentage) / 100;
const hp = (percentage: number) => (height * percentage) / 100;

const getFontSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

const getSpacing = (base: number) => {
  if (isSmallDevice) return base * 0.8;
  if (isLargeDevice) return base * 1.2;
  return base;
};

const FORCE_IOS_PICKER_UI = false;

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

const coordinatesFromLocationResult = (locationResult?: LocationResult): LocationCoordinates | null => {
  if (!locationResult?.lat || !locationResult?.lon) return null;
  const latitude = Number(locationResult.lat);
  const longitude = Number(locationResult.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

interface RideDetails {
  from: string;
  to: string;
  date: Date;
  fromCoordinates?: LocationCoordinates;
  toCoordinates?: LocationCoordinates;
}

interface RideDetailsSelectorProps {
  onSubmit: (details: RideDetails) => void;
  /**
   * Fires whenever either location field changes (even with only one set).
   * Parents use this to update the map preview as the user types — without
   * waiting for the date to also be filled.
   */
  onCoordsChange?: (from: LocationCoordinates | null, to: LocationCoordinates | null) => void;
  onLocationSelectionChange?: (hasFromAndTo: boolean) => void;
  onLocationSwap?: () => void;
  fromLocation?: string;
  toLocation?: string;
  userLocation?: UserLocation;
  /**
   * Bump this counter from the parent to imperatively clear From,
   * To, and their coordinates (used by the Search Rides X button).
   * Effect compares the new value to the previous one and resets on
   * change — first render is treated as the baseline.
   */
  clearTrigger?: number;
  /**
   * Seed value for the date pill. Used when the parent comes in with
   * a pre-filled date (e.g. CreateRide opened from the search-empty-
   * state). Only consulted on first render; once the user picks a
   * date from the wheel, the internal state takes over.
   */
  initialDate?: Date;
  /**
   * When true, the selector stops auto-submitting whenever
   * from + to + date all happen to be filled. Instead it renders
   * its own "Search rides" footer button — the user has to explicitly
   * tap it, giving them a beat to also tweak the date if they want.
   * Date stays optional (the default `now + 1h` value is still
   * submitted if untouched). Used by the home-screen search sheet
   * where auto-submit would yank the user out of the sheet the
   * moment they picked a destination, before they had a chance to
   * change the date.
   */
  manualSubmit?: boolean;
}

export const RideDetailsSelector: React.FC<RideDetailsSelectorProps> = ({
  onSubmit,
  onCoordsChange,
  onLocationSelectionChange,
  onLocationSwap,
  fromLocation: externalFromLocation,
  toLocation: externalToLocation,
  userLocation,
  clearTrigger,
  initialDate,
  manualSubmit = false,
}) => {
  const { apiUtil } = require('../utils/ApiUtil').useApi();
  const [defaultStartAddress, setDefaultStartAddress] = useState<string>("");
  
  React.useEffect(() => {
    async function fetchDefaultAddress() {
      let cached = "";
      try {
        cached = await AsyncStorage.getItem('unipool_start_address') || "";
      } catch (e) {
      }
      if (cached) {
        setDefaultStartAddress(cached);
        return;
      }
      
      try {
        const auth = require('@react-native-firebase/auth').getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.log("No authenticated user found in RideDetailsSelector");
          return;
        }

        console.log("User authenticated, fetching default address...");
        const res = await apiUtil.get("/user/default-address");
        if (typeof res === "object" && res !== null && "address" in res && typeof (res as any).address === "string") {
          setDefaultStartAddress((res as any).address);
          try {
            await AsyncStorage.setItem('unipool_start_address', (res as any).address);
          } catch (e) {
          }
        }
      } catch (err: any) {
        if (err?.message !== "AUTHENTICATION_REDIRECT") {
          console.log("Error fetching default address:", err);
        }
      }
    }
    fetchDefaultAddress();
  }, [apiUtil]);

  const [fromLocation, setFromLocation] = useState<string>(externalFromLocation || "");
  const [hasClearedFrom, setHasClearedFrom] = useState(false);
  const [toLocation, setToLocation] = useState<string>(externalToLocation || "");
  
  const getInitialDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    return now;
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate ?? getInitialDate());
  
  const [fromCoordinates, setFromCoordinates] = useState<LocationCoordinates | null>(null);
  const [toCoordinates, setToCoordinates] = useState<LocationCoordinates | null>(null);
  const coordinateResolveRequestRef = useRef({ from: 0, to: 0 });

  const [fromCleared, setFromCleared] = useState(false);

  React.useEffect(() => {
    if (!externalFromLocation && !fromLocation && defaultStartAddress && !fromCleared) {
      setFromLocation(defaultStartAddress);
    }
  }, [defaultStartAddress, externalFromLocation, fromLocation, fromCleared]);

  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState<Date | null>(null);
  
  const pickerModeRef = useRef<"date" | "time">("date");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [popularLocations, setPopularLocations] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const submitRideDetails = (from: string, to: string, date: Date, fromCoords?: LocationCoordinates, toCoords?: LocationCoordinates) => {
    // In manualSubmit mode the consumer wants a tap-to-go flow —
    // never auto-fire just because all three fields happen to be
    // filled. The footer "Search rides" button (rendered at the
    // bottom of this component) is the only path that calls
    // onSubmit in that mode.
    if (manualSubmit) {
      return;
    }
    // Only submit if all three fields are filled
    if (!from || !to || !date) {
      console.log('Not submitting - missing required fields:', { from: !!from, to: !!to, date: !!date });
      return;
    }

    // Use the provided date directly, no fallback to avoid state issues
    console.log('submitRideDetails called with date:', date);
    console.log('Current selectedDate state:', selectedDate);
    
    const rideDetails: RideDetails = {
      from,
      to,
      date: date, // Use the passed date directly
      fromCoordinates: (fromCoords ?? fromCoordinates) ?? undefined,
      toCoordinates: (toCoords ?? toCoordinates) ?? undefined
    };
    
    console.log('Submitting ride details with coordinates:', rideDetails);
    onSubmit(rideDetails);
  };

  const handleSearchInput = async (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    searchAbortRef.current?.abort();
    const requestId = ++searchRequestRef.current;
    const includeCurrentLocation = showFromDropdown;
    const instantResults = getInstantLocationResults(text, userLocation, 8, {
      includeCurrentLocation,
    });

    if (text.trim().length === 0) {
      setSearchResults([]);
      setPopularLocations(instantResults);
      setIsSearching(false);
      setIsLoadingPopular(false);
      return;
    }

    if (text.trim().length < 2) {
      setSearchResults([]);
      setPopularLocations(instantResults);
      setIsSearching(false);
      setIsLoadingPopular(false);
      return;
    }

    setPopularLocations([]);
    setSearchResults(instantResults);
    setIsSearching(true);

    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timeout = setTimeout(async () => {
      try {
        const results = await searchLocationsWithFallback(
          text,
          undefined,
          10,
          userLocation,
          controller.signal,
          { includeCurrentLocation }
        );
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(results.length > 0 ? results : instantResults);
      } catch (error) {
        if (requestId !== searchRequestRef.current) return;
        if ((error as any)?.name !== "AbortError") {
          console.error('Search failed:', error);
        }
        setSearchResults(instantResults);
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsSearching(false);
        }
      }
    }, 160);
    searchTimeoutRef.current = timeout;
  };

  const handleLocationSelect = (location: string, isFrom: boolean, locationResult?: LocationResult) => {
    console.log('Location selected:', location, 'isFrom:', isFrom, 'locationResult:', locationResult);

    const immediateCoords = coordinatesFromLocationResult(locationResult);

    if (isFrom) {
      coordinateResolveRequestRef.current.from += 1;
      setFromLocation(location);
      setFromCoordinates(immediateCoords);
      setFromCleared(false);
      setShowFromDropdown(false);
    } else {
      coordinateResolveRequestRef.current.to += 1;
      setToLocation(location);
      setToCoordinates(immediateCoords);
      setShowToDropdown(false);
    }

    setSearchQuery("");
    setSearchResults([]);
    setPopularLocations([]);
    setIsSearching(false);
    setIsLoadingPopular(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchAbortRef.current?.abort();
    searchRequestRef.current += 1;

    const updatedFrom = isFrom ? location : fromLocation;
    const updatedTo = isFrom ? toLocation : location;
    const updatedFromCoords = isFrom ? immediateCoords : fromCoordinates;
    const updatedToCoords = isFrom ? toCoordinates : immediateCoords;

    if (updatedFrom && updatedTo && selectedDate) {
      submitRideDetails(
        updatedFrom,
        updatedTo,
        selectedDate,
        updatedFromCoords ?? undefined,
        updatedToCoords ?? undefined
      );
    }

    if (immediateCoords) return;

    const field = isFrom ? "from" : "to";
    const requestId = coordinateResolveRequestRef.current[field];

    void getCoordinatesForLocation(location).then((coordinates) => {
      if (coordinateResolveRequestRef.current[field] !== requestId) return;

      const resolvedCoords = coordinates ? {
        latitude: coordinates.lat,
        longitude: coordinates.lon
      } : null;

      if (isFrom) {
        setFromCoordinates(resolvedCoords);
      } else {
        setToCoordinates(resolvedCoords);
      }

      const finalFromCoords = isFrom ? resolvedCoords : fromCoordinates;
      const finalToCoords = isFrom ? toCoordinates : resolvedCoords;

      if (updatedFrom && updatedTo && selectedDate) {
        submitRideDetails(
          updatedFrom,
          updatedTo,
          selectedDate,
          finalFromCoords ?? undefined,
          finalToCoords ?? undefined
        );
      }
    }).catch((error) => {
      if (coordinateResolveRequestRef.current[field] === requestId) {
        console.error('Error getting coordinates for location:', location, error);
      }
    });
  };

  const handleLocationSelectorOpen = async (isFrom: boolean) => {
    console.log('Opening location selector, isFrom:', isFrom, 'userLocation:', userLocation);
    
    if (isFrom) {
      setShowFromDropdown(true);
    } else {
      setShowToDropdown(true);
    }
    
    searchAbortRef.current?.abort();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchRequestRef.current += 1;
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setIsLoadingPopular(false);
    const includeCurrentLocation = isFrom;
    setPopularLocations(getInstantLocationResults("", userLocation, 10, {
      includeCurrentLocation,
    }));

    try {
      const popular = await getPopularLocations("", userLocation, {
        includeCurrentLocation,
      });
      setPopularLocations(popular);
    } catch (error) {
      console.error('Error getting popular locations:', error);
      setPopularLocations(
        includeCurrentLocation
          ? getPopularLocationsFallback("")
          : getPopularLocationsFallback("").filter((location) => location.source !== "current")
      );
    }
  };

  const handleDateTimeChange = (event: any, selected?: Date) => {
    if (selected) {
      console.log('Date/time changed to:', selected);
      setSelectedDate(selected);
      setTempDate(selected);
      
      if (pickerMode === "date") {
        setPickerMode("time");
      } else {
        setShowDateTimePicker(false);
        setPickerMode("date");
        
        if (fromLocation && toLocation && selected) {
          console.log('Submitting with updated date:', selected);
          submitRideDetails(fromLocation, toLocation, selected, fromCoordinates ?? undefined, toCoordinates ?? undefined);
        }
      }
    } else {
      setShowDateTimePicker(false);
      setPickerMode("date");
    }
  };

  const handleDateFieldClick = () => {
    if (Platform.OS === "ios" || FORCE_IOS_PICKER_UI) {
      console.log('Opening iOS-style picker modal');
      const initialDate = selectedDate || getInitialDate();
      setTempDate(initialDate);
      setPickerMode("date");
      pickerModeRef.current = "date";
      setShowDateTimePicker(true);
    } else {
      console.log('Opening native Android picker');
      setPickerMode("date");
      pickerModeRef.current = "date";
      const initialDate = selectedDate || getInitialDate();
      DateTimePickerAndroid.open({
        value: initialDate,
        onChange: handleAndroidPickerChange,
        mode: "date",
        minimumDate: new Date(),
      });
    }
  };

   const handleAndroidPickerChange = (
    event: AndroidDateTimePickerEvent,
    date?: Date
  ) => {
    if (FORCE_IOS_PICKER_UI || showDateTimePicker) {
      console.log('Ignoring Android picker event - iOS UI forced or modal showing');
      return;
    }
    
    if (event.type === "dismissed") {
      if (pickerModeRef.current === "time") {
        const finalDate = selectedDate || getInitialDate();
        console.log('Time picker dismissed, using current date:', finalDate);
        setPickerMode("date");
        pickerModeRef.current = "date";
        if (fromLocation && toLocation && finalDate) {
          console.log('Submitting Android ride details after time dismissal:', finalDate);
          submitRideDetails(
            fromLocation,
            toLocation,
            finalDate,
            fromCoordinates ?? undefined,
            toCoordinates ?? undefined
          );
        }
      } else {
        setPickerMode("date");
        pickerModeRef.current = "date";
      }
      return;
    }
    
    const current = date || selectedDate || getInitialDate();
    console.log('Android picker changed:', current, 'mode:', pickerModeRef.current);

    if (pickerModeRef.current === "date") {
      console.log('Date selected, updating state and opening time picker');
      setSelectedDate(current);
      setTempDate(current);
      setPickerMode("time");
      pickerModeRef.current = "time";
      
      DateTimePickerAndroid.open({
        value: current,
        onChange: handleAndroidPickerChange,
        mode: "time",
      });
    } else if (pickerModeRef.current === "time") {
      console.log('Final Android date/time selected:', current);
      setSelectedDate(current);
      setTempDate(current);
      setPickerMode("date");
      pickerModeRef.current = "date";
      if (fromLocation && toLocation && current) {
        console.log('Submitting Android ride details with date:', current);
        submitRideDetails(
          fromLocation,
          toLocation,
          current,
          fromCoordinates ?? undefined,
          toCoordinates ?? undefined
        );
      }
    }
  };

  const handleDateTimeConfirm = () => {
    const finalDate = tempDate || selectedDate || getInitialDate();
    console.log('iOS date/time confirmed:', finalDate);
    setSelectedDate(finalDate);
    setShowDateTimePicker(false);
    setPickerMode("date");
    
    if (fromLocation && toLocation && finalDate) {
      console.log('Submitting iOS ride details with date:', finalDate);
      submitRideDetails(
        fromLocation,
        toLocation,
        finalDate,
        fromCoordinates ?? undefined,
        toCoordinates ?? undefined
      );
    }
  };

  const handleDateTimeCancel = () => {
    console.log('iOS date/time picker cancelled');
    setTempDate(selectedDate);
    setShowDateTimePicker(false);
    setPickerMode("date");
  };

  const handleLocationSwap = () => {
    // No-op when there's nothing to swap *into* From. Previously this
    // would clear From, then a `useEffect` watching the parent's
    // `fromLocation` prop would re-fill it to the same value, leaving
    // both fields with the original From location (duplicate).
    if (!toLocation || !fromLocation) return;

    const tempLocation = fromLocation;
    const tempCoordinates = fromCoordinates;

    coordinateResolveRequestRef.current.from += 1;
    coordinateResolveRequestRef.current.to += 1;
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    setFromCoordinates(toCoordinates);
    setToCoordinates(tempCoordinates);

    if (onLocationSwap) {
      onLocationSwap();
    }

    if (selectedDate) {
      submitRideDetails(
        toLocation,
        tempLocation,
        selectedDate,
        (toCoordinates ?? undefined),
        (tempCoordinates ?? undefined)
      );
    }
  };

  const handleLocationClear = (isFrom: boolean) => {
    if (isFrom) {
      coordinateResolveRequestRef.current.from += 1;
      setFromLocation("");
      setFromCoordinates(null);
      setFromCleared(true);
    } else {
      coordinateResolveRequestRef.current.to += 1;
      setToLocation("");
      setToCoordinates(null);
    }

    const updatedFrom = isFrom ? "" : fromLocation;
    const updatedTo = isFrom ? toLocation : "";
    
    if (onLocationSelectionChange) {
      onLocationSelectionChange(updatedFrom !== "" && updatedTo !== "");
    }
  };

  const setToToday = () => {
    const today = new Date();
    today.setHours(today.getHours() + 1);
    today.setMinutes(0, 0, 0);
    console.log('Setting to today:', today);
    setSelectedDate(today);
    setTempDate(today);
    if (fromLocation && toLocation) {
      console.log('Submitting today ride details with date:', today);
      submitRideDetails(
        fromLocation,
        toLocation,
        today,
        fromCoordinates ?? undefined,
        toCoordinates ?? undefined
      );
    }
  };

  const setToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    console.log('Setting to tomorrow:', tomorrow);
    setSelectedDate(tomorrow);
    setTempDate(tomorrow);
    if (fromLocation && toLocation) {
      console.log('Submitting tomorrow ride details with date:', tomorrow);
      submitRideDetails(
        fromLocation,
        toLocation,
        tomorrow,
        fromCoordinates ?? undefined,
        toCoordinates ?? undefined
      );
    }
  };

  useEffect(() => {
    if (externalFromLocation !== undefined) {
      setFromLocation(externalFromLocation);
      
      // Handle async coordinate fetching
      const fetchCoords = async () => {
        try {
          const coords = await getCoordinatesForLocation(externalFromLocation);
          if (coords) {
            setFromCoordinates({
              latitude: coords.lat,
              longitude: coords.lon
            });
          }
        } catch (error) {
          console.error('Error fetching coordinates for external from location:', error);
        }
      };
      
      fetchCoords();
    }
  }, [externalFromLocation]);

  useEffect(() => {
    if (externalToLocation !== undefined) {
      setToLocation(externalToLocation);
      
      // Handle async coordinate fetching
      const fetchCoords = async () => {
        try {
          const coords = await getCoordinatesForLocation(externalToLocation);
          if (coords) {
            setToCoordinates({
              latitude: coords.lat,
              longitude: coords.lon
            });
          }
        } catch (error) {
          console.error('Error fetching coordinates for external to location:', error);
        }
      };
      
      fetchCoords();
    }
  }, [externalToLocation]);

  useEffect(() => {
    if (fromLocation && hasClearedFrom) {
      setHasClearedFrom(false);
    }
  }, [fromLocation]);

  // Imperative clear from the parent (e.g. Search Rides X button).
  // `fromCleared` blocks the defaultStartAddress auto-fill effect
  // from immediately re-populating From after we wipe it.
  useEffect(() => {
    if (clearTrigger === undefined) return;
    coordinateResolveRequestRef.current.from += 1;
    coordinateResolveRequestRef.current.to += 1;
    setFromLocation("");
    setToLocation("");
    setFromCoordinates(null);
    setToCoordinates(null);
    setFromCleared(true);
    setHasClearedFrom(true);
  }, [clearTrigger]);

  useEffect(() => {
    if (onLocationSelectionChange) {
      onLocationSelectionChange(fromLocation !== "" && toLocation !== "");
    }
  }, [fromLocation, toLocation, onLocationSelectionChange]);

  // Push coord updates upward whenever either pin changes, so the parent
  // can animate the map preview without waiting for a full From+To+date
  // submission. Either side may be null when only one location is set.
  useEffect(() => {
    if (onCoordsChange) {
      onCoordsChange(fromCoordinates ?? null, toCoordinates ?? null);
    }
  }, [fromCoordinates, toCoordinates, onCoordsChange]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchAbortRef.current?.abort();
    };
  }, []);

  const getTextTruncationLength = () => {
    if (isSmallDevice) return 20;
    if (isMediumDevice) return 25;
    return 30;
  };

  return (
    <View style={styles.container}>
      <View style={styles.locationsWrapper}>
        <View style={styles.routeConnector} pointerEvents="none" />
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => handleLocationSelectorOpen(true)}
        >
          <View style={styles.inputContent}>
            <View style={styles.routeDotOutline} />
            {/* Muted lime placeholder when empty (matches `label`),
                bright lime 700Bold when filled (matches the date
                label). No clear-X — the whole row is tappable, so a
                second clear control was redundant chrome. */}
            <Text
              style={fromLocation ? styles.selectedText : styles.label}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {fromLocation || "From"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchIconContainer}
          onPress={handleLocationSwap}
        >
          <Image
            source={require("../assets/switch-1.png")}
            style={styles.switchIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inputContainer, { borderBottomWidth: 0 }]}
          onPress={() => handleLocationSelectorOpen(false)}
        >
          <View style={styles.inputContent}>
            <View style={styles.routeDotFilled} />
            <Text
              style={toLocation ? styles.selectedText : styles.label}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {toLocation || "To"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.dateContainer}>
        <TouchableOpacity onPress={handleDateFieldClick} style={styles.dateInputContainer}>
          <View style={styles.inputContent}>
            <Image
              source={require("../assets/calendar-icon.png")}
              style={styles.icon}
            />
            <View style={styles.dateTextContainer}>
              {selectedDate ? (
                <>
                  <Text style={styles.selectedDateLabel}>{format(selectedDate, "EEE d MMM yyyy")}</Text>
                  <Text style={styles.selectedDateText}>{format(selectedDate, "h:mm a")}</Text>
                </>
              ) : (
                <Text style={styles.label}>When</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Manual-submit footer button. Only renders in manualSubmit
          mode (the home-screen search sheet). Disabled until both
          From and To are filled — date is optional and falls back
          to the "now + 1h" default the selector seeds at mount, so
          the user can tap straight through if they don't care
          about a specific time. Calls onSubmit directly, bypassing
          the auto-submit guard above. */}
      {manualSubmit ? (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!fromLocation || !toLocation}
          onPress={() => {
            const finalDate = selectedDate || getInitialDate();
            onSubmit({
              from: fromLocation,
              to: toLocation,
              date: finalDate,
              fromCoordinates: fromCoordinates ?? undefined,
              toCoordinates: toCoordinates ?? undefined,
            });
          }}
          style={[
            styles.manualSubmitBtn,
            (!fromLocation || !toLocation) && styles.manualSubmitBtnDisabled,
          ]}
          accessibilityLabel="Search rides"
        >
          <Text style={styles.manualSubmitBtnText}>
            {!fromLocation || !toLocation
              ? "Pick a from and to"
              : "Search rides"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={showFromDropdown || showToDropdown}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select {showFromDropdown ? "From" : "To"} Location
            </Text>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a location..."
                placeholderTextColor={AppColors.basicWhite + "80"}
                value={searchQuery}
                onChangeText={handleSearchInput}
                autoFocus={true}
              />
              {isSearching && (
                <ActivityIndicator 
                  size="small" 
                  color={AppColors.basicWhite} 
                  style={styles.searchLoader}
                accessibilityLabel="Loading"
                />
              )}
            </View>

            <View style={styles.scrollableArea}>
              <ScrollView 
                style={styles.locationList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
              {/* Show loading state */}
              {isLoadingPopular ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={AppColors.basicWhite} accessibilityLabel="Loading" />
                  <Text style={styles.loadingText}>Loading nearby places...</Text>
                </View>
              ) : null}

              {/* Show popular locations only when:
                  1. Search query is empty or very short (<=2 chars)
                  2. No search results are available
                  3. Not currently searching
              */}
              {!isSearching && 
               searchQuery.length <= 2 && 
               searchResults.length === 0 && 
               popularLocations.length > 0 ? (
                <>
                  <Text style={styles.sectionHeader}>
                    {searchQuery.length === 0 ? "Popular Locations" : "Popular Locations"}
                  </Text>
                  {popularLocations.map((location, index) => (
                    <TouchableOpacity
                      key={`popular-${index}`}
                      style={styles.locationItem}
                      onPress={() =>
                        handleLocationSelect(getLocationDisplayName(location), showFromDropdown, location)
                      }
                    >
                      <Image
                        source={require("../assets/location-pin.png")}
                        style={styles.locationIcon}
                      />
                      <Text style={styles.locationText}>{getLocationDisplayName(location)}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}

              {/* Show search results when available */}
              {searchResults.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Search Results</Text>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.locationItem}
                      onPress={() =>
                        handleLocationSelect(formatLocationName(result), showFromDropdown, result)
                      }
                    >
                      <Image
                        source={require("../assets/location-pin.png")}
                        style={styles.locationIcon}
                      />
                      <View style={styles.searchResultContent}>
                        <Text style={styles.locationText} numberOfLines={1}>
                          {result.name || result.display_name.split(',')[0]}
                        </Text>
                        <Text style={styles.locationSubtext} numberOfLines={2}>
                          {result.display_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Show "No results found" only when user has typed >2 chars and no results */}
              {searchQuery.length > 2 && !isSearching && searchResults.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No locations found for "{searchQuery}"
                  </Text>
                  <Text style={styles.noResultsSubtext}>
                    Try a different search term or check your spelling
                  </Text>
                </View>
              )}

              {/* Show helpful message when user starts typing but results aren't loaded yet */}
              {searchQuery.length > 0 && searchQuery.length <= 2 && !isSearching && searchResults.length === 0 && (
                <View style={styles.hintContainer}>
                  <Text style={styles.hintText}>
                    Type more characters to search for locations...
                  </Text>
                </View>
              )}
            </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowFromDropdown(false);
                setShowToDropdown(false);
                setSearchQuery("");
                setSearchResults([]);
                setPopularLocations([]);
                setIsSearching(false);
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = null;
                }
                searchAbortRef.current?.abort();
                searchRequestRef.current += 1;
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {(Platform.OS === 'ios' || FORCE_IOS_PICKER_UI) && (
        <Modal
          visible={showDateTimePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.dateTimeModalContainer}>
            <View style={styles.dateTimeModalContent}>
              <View style={styles.dateTimeHeader}>
                <TouchableOpacity onPress={handleDateTimeCancel}>
                  <Text style={styles.dateTimeButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateTimeTitle}>Select Date & Time</Text>
                <TouchableOpacity onPress={handleDateTimeConfirm}>
                  <Text style={styles.dateTimeButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateTimePickerContainer}>
                <DateTimePicker
                  value={tempDate || selectedDate || getInitialDate()}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) {
                      setTempDate(date);
                    }
                  }}
                  minimumDate={new Date()}
                  // The modal sits on the forest dark surface, so the
                  // spinner needs to render its wheel text in white,
                  // not black. `themeVariant="dark"` flips iOS 14+ to
                  // the dark spinner, and `textColor` covers older
                  // builds.
                  themeVariant="dark"
                  textColor={AppColors.basicWhite}
                  accentColor={AppColors.primaryLightGreen}
                  style={styles.dateTimePicker}
                />
              </View>
              
              <View style={styles.quickSelectContainer}>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const today = new Date();
                    today.setHours(today.getHours() + 1);
                    today.setMinutes(0, 0, 0);
                    console.log('Quick select today:', today);
                    setTempDate(today);
                  }}
                >
                  <Text style={styles.quickSelectText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0); // Set to 9 AM tomorrow
                    console.log('Quick select tomorrow:', tomorrow);
                    setTempDate(tomorrow);
                  }}
                >
                  <Text style={styles.quickSelectText}>Tomorrow</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Manual-submit footer — sits beneath the forest selector card
  // in manualSubmit mode. Lime CTA against the lime sheet canvas
  // would disappear, so it borrows the white treatment from
  // HomeScreen.createRideButton. Disabled state stays the same
  // shape but drops opacity + uses a flatter label so the screen
  // reads "fill the two fields, then tap me".
  manualSubmitBtn: {
    marginTop: 14,
    backgroundColor: AppColors.basicWhite,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  manualSubmitBtnDisabled: {
    opacity: 0.55,
  },
  manualSubmitBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 15.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.3,
  },
  container: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    // Forest card on lime — matches UpNextCard / PreviousTripsSection
    // empty card. Bold dark slab carries the route inputs; lime accents
    // (dots, swap button) and white text live inside.
    backgroundColor: AppColors.secondaryDarkGreen,
    borderWidth: 0,
    // Match the home sheet's other forest tiles for cross-platform
    // shadow parity — Android's Material renderer needs higher
    // elevation to read at the same depth iOS gets from shadow props.
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  locationsWrapper: {
    position: "relative",
  },
  // Vertical dotted connector that spans between the From and To rows,
  // mirroring the BlaBlaCar / inDrive dot-line-dot route pattern we use
  // on RideCard + UpNextCard. The dots are `hp(2)` wide, so their
  // centre sits at `wp(4) + hp(1)` from the row's start — minus half
  // the connector width (1pt) to centre the column on the dot.
  routeConnector: {
    position: "absolute",
    left: wp(4) + hp(1) - 1,
    top: hp(5.5),
    bottom: hp(5.5),
    width: 2,
    backgroundColor: "rgba(181,215,80,0.55)",
    borderRadius: 1,
  },
  inputContainer: {
    width: "100%",
    paddingLeft: wp(4),
    // Extra right padding so the clear-X icon clears the absolutely-
    // positioned lime swap button (which is anchored at right wp(4),
    // 36×36). Without this, the X visually overlapped the swap
    // button and read as a smudge under its edge.
    paddingRight: wp(14),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    minHeight: hp(6.5),
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    height: hp(3),
    width: hp(3),
    resizeMode: "contain",
    tintColor: AppColors.primaryLightGreen,
  },
  // Replace pin/arrow icons with abstract route dots. Empty circle = origin,
  // filled circle = destination (universal cartography idiom).
  routeDotOutline: {
    width: hp(2),
    height: hp(2),
    borderRadius: hp(1),
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    backgroundColor: "transparent",
    marginRight: wp(3),
  },
  routeDotFilled: {
    width: hp(2),
    height: hp(2),
    borderRadius: hp(1),
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: wp(3),
  },
  label: {
    marginLeft: wp(2),
    fontSize: getFontSize(15, 16, 17),
    // Default state ("When", "From", "To"). Was 0.55 SemiBold which
    // washed out to near-invisible on the forest card — users
    // couldn't see the placeholder labels. Bold @ 0.85 keeps the
    // empty-state look distinct from a filled value (still slightly
    // dimmer) while reading clearly at a glance.
    color: AppColors.primaryLightGreen,
    opacity: 0.85,
    fontFamily: "NunitoSans_700Bold",
  },
  // Filled From / To location — mirrors `selectedDateLabel` exactly
  // so the location row and the date row look like one design system,
  // not two. Was white 700Bold @ 17 (too loud, mismatch with the lime
  // date headline below).
  selectedText: {
    fontSize: getFontSize(15, 15.5, 16),
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.15,
    marginLeft: 0,
    flex: 1,
  },
  selectedDateText: {
    marginLeft: wp(2),
    fontSize: getFontSize(12, 13, 14),
    // The selected time — full white, no opacity. The previous lime+opacity
    // combo read as a washed olive on the forest card.
    color: AppColors.basicWhite,
    opacity: 0.85,
    fontFamily: "NunitoSans_600SemiBold",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  selectedDateLabel: {
    marginLeft: wp(2),
    // Was 800ExtraBold @ 18 — same weight as section titles, which
    // made the whole sheet feel "shouty." Dropped to 700Bold @ 16 so
    // it reads as a confident value, not a banner. Mirrors the
    // location text below.
    fontSize: getFontSize(15, 15.5, 16),
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.15,
  },
  dateContainer: {
    width: "100%",
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    minHeight: hp(6.5),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  dateInputContainer: {
    flex: 1,
  },
  dateTextContainer: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    // Centre the inner sheet on iPad so it docks as a phone-shape
    // card under the dim backdrop instead of stretching the full
    // 1032pt canvas. On phone this is a no-op because the inner
    // sheet's `maxWidth: 540` is wider than the window.
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: wp(3),
    borderTopRightRadius: wp(3),
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
    maxHeight: hp(75),
    minHeight: hp(50),
  },
  modalTitle: {
    fontSize: getFontSize(16, 17, 18),
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: hp(2),
    color: AppColors.primaryLightGreen,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: wp(2),
    marginBottom: hp(2),
    paddingHorizontal: wp(3),
    minHeight: hp(6),
    borderWidth: 1,
    borderColor: AppColors.primaryLightGreen + "30",
  },
  searchInput: {
    flex: 1,
    color: AppColors.basicWhite,
    fontSize: getFontSize(14, 15, 16),
    fontFamily: "NunitoSans_400Regular",
    paddingVertical: hp(1.5),
  },
  searchLoader: {
    marginLeft: wp(2),
  },
  scrollableArea: {
    flex: 1,
  },
  locationList: {
    maxHeight: hp(40),
    minHeight: hp(20),
  },
  sectionHeader: {
    fontSize: getFontSize(12, 13, 14),
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.primaryLightGreen,
    marginTop: hp(1.5),
    marginBottom: hp(1),
  },
  locationItem: {
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: AppColors.basicWhite + "20",
    flexDirection: "row",
    alignItems: "center",
    minHeight: hp(6),
  },
  locationIcon: {
    width: wp(4),
    height: wp(4),
    tintColor: AppColors.basicWhite,
    marginRight: wp(3),
  },
  locationText: {
    fontSize: getFontSize(14, 15, 16),
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite,
    flex: 1,
  },
  searchResultContent: {
    flex: 1,
  },
  locationSubtext: {
    fontSize: getFontSize(10, 11, 12),
    fontFamily: "NunitoSans_300Light",
    color: AppColors.basicWhite + "80",
    marginTop: hp(0.3),
  },
  noResultsText: {
    fontSize: getFontSize(12, 13, 14),
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite + "80",
    textAlign: "center",
    marginTop: hp(3),
    fontStyle: "italic",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: hp(3),
    paddingHorizontal: wp(4),
  },
  noResultsSubtext: {
    fontSize: getFontSize(10, 11, 12),
    fontFamily: "NunitoSans_300Light",
    color: AppColors.basicWhite + "60",
    textAlign: "center",
    marginTop: hp(1),
    fontStyle: "italic",
  },
  hintContainer: {
    alignItems: "center",
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
  },
  hintText: {
    fontSize: getFontSize(11, 12, 13),
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite + "70",
    textAlign: "center",
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(3),
  },
  loadingText: {
    fontSize: getFontSize(12, 13, 14),
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite,
    marginLeft: wp(3),
  },
  closeButton: {
    marginTop: hp(2),
    alignItems: "center",
    paddingVertical: hp(2),
    backgroundColor: AppColors.basicBlack,
    borderRadius: wp(2),
    minHeight: hp(6),
    justifyContent: "center",
  },
  closeButtonText: {
    color: AppColors.basicWhite,
    fontSize: getFontSize(14, 15, 16),
    fontFamily: "NunitoSans_600SemiBold",
  },
  switchIconContainer: {
    position: "absolute",
    right: wp(4),
    top: hp(5.5),
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primaryLightGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  switchIcon: {
    width: wp(4.5),
    height: wp(4.5),
    // Forest icon on lime swap-button — same as the inverted CTA pattern.
    tintColor: AppColors.secondaryDarkGreen,
  },
  clearIconContainer: {
    marginLeft: wp(2),
    justifyContent: "center",
    alignItems: "center",
    minHeight: hp(4),
    minWidth: wp(6),
    paddingHorizontal: wp(1),
  },
  dateTimeModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    // Centre the date/time picker card on iPad — same pattern as
    // the location-search sheet above.
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dateTimeModalContent: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(2),
    maxHeight: hp(70),
  },
  dateTimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    // Lime-tinted hairline on the forest modal — matches the rest
    // of the forest-surface dividers in the app.
    borderBottomColor: "rgba(181,215,80,0.18)",
  },
  dateTimeTitle: {
    fontSize: getFontSize(16, 17, 18),
    fontFamily: "NunitoSans_800ExtraBold",
    // Lime on forest — was black on forest, which was nearly
    // invisible.
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.2,
  },
  dateTimeButtonText: {
    fontSize: getFontSize(14, 15, 16),
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.primaryLightGreen,
  },
  dateTimePickerContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    alignItems: "center",
  },
  dateTimePicker: {
    width: "100%",
    height: hp(25),
  },
  quickSelectContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderTopWidth: 1,
    borderTopColor: "rgba(181,215,80,0.18)",
  },
  quickSelectButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: AppColors.primaryLightGreen + "20",
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: AppColors.primaryLightGreen,
  },
  quickSelectText: {
    fontSize: getFontSize(13, 14, 15),
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.primaryLightGreen,
  },
});
