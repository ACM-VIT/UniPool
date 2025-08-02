import React, { useState, useEffect } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import AppColors from "../design_systems/colors";
import { 
  searchLocationsWithFallback,
  getPopularLocations, 
  getPopularLocationsFallback,
  LocationResult,
  formatLocationName,
  POPULAR_LOCATIONS,
  UserLocation,
  NearbyPlace
} from "../utils/LocationService";

const { width, height } = Dimensions.get("window");

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

export const CommonLocationCoordinates = [
  { location: "Chennai", latitude: 12.989196, longitude: 80.178799 },
  { location: "Vellore", latitude: 12.968, longitude: 77.1559 },
  { location: "Bangalore", latitude: 13.1985, longitude: 77.6665 },
  { location: "Coimbatore", latitude: 11.0376, longitude: 77.0363 },
  { location: "Salem", latitude: 11.6641, longitude: 78.1579 },
  { location: "Madurai", latitude: 9.912, longitude: 78.1242 },
  { location: "Pondicherry", latitude: 11.9352, longitude: 79.8082 },
];

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface RideDetails {
  from: string;
  to: string;
  date: Date;
  fromCoordinates?: LocationCoordinates;
  toCoordinates?: LocationCoordinates;
}

interface RideDetailsSelectorProps {
  onSubmit: (details: RideDetails) => void;
  onLocationSelectionChange?: (hasFromAndTo: boolean) => void;
  onLocationSwap?: () => void;
  fromLocation?: string;
  toLocation?: string;
  userLocation?: UserLocation;
}

export const RideDetailsSelector: React.FC<RideDetailsSelectorProps> = ({
  onSubmit,
  onLocationSelectionChange,
  onLocationSwap,
  fromLocation: externalFromLocation,
  toLocation: externalToLocation,
  userLocation,
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
        const res = await apiUtil.get("/user/default-address");
        if (typeof res === "object" && res !== null && "address" in res && typeof (res as any).address === "string") {
          setDefaultStartAddress((res as any).address);
          try {
            await AsyncStorage.setItem('unipool_start_address', (res as any).address);
          } catch (e) {
          }
        }
      } catch (err) {}
    }
    fetchDefaultAddress();
  }, [apiUtil]);

  const [fromLocation, setFromLocation] = useState<string>(externalFromLocation || "");
  const [hasClearedFrom, setHasClearedFrom] = useState(false);
  const [toLocation, setToLocation] = useState<string>(externalToLocation || "");
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [fromCoordinates, setFromCoordinates] = useState<LocationCoordinates | null>(null);
  const [toCoordinates, setToCoordinates] = useState<LocationCoordinates | null>(null);
  const [selectedLocationResult, setSelectedLocationResult] = useState<LocationResult | null>(null);

  const [fromCleared, setFromCleared] = useState(false);

  React.useEffect(() => {
    if (!externalFromLocation && !fromLocation && defaultStartAddress && !fromCleared) {
      setFromLocation(defaultStartAddress);
    }
  }, [defaultStartAddress, externalFromLocation, fromLocation, fromCleared]);

  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [popularLocations, setPopularLocations] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const getCoordinatesForLocation = (locationName: string, locationResult?: LocationResult): LocationCoordinates | null => {
    if (locationResult && locationResult.lat && locationResult.lon) {
      return {
        latitude: parseFloat(locationResult.lat),
        longitude: parseFloat(locationResult.lon)
      };
    }

    const commonLocation = CommonLocationCoordinates.find(
      loc => loc.location.toLowerCase().includes(locationName.toLowerCase()) ||
             locationName.toLowerCase().includes(loc.location.toLowerCase())
    );
    
    if (commonLocation) {
      return {
        latitude: commonLocation.latitude,
        longitude: commonLocation.longitude
      };
    }

    if (userLocation) {
      const randomOffset = () => (Math.random() - 0.5) * 0.02;
      return {
        latitude: userLocation.latitude + randomOffset(),
        longitude: userLocation.longitude + randomOffset(),
      };
    }

    const randomOffset = () => (Math.random() - 0.5) * 0.02;
    return {
      latitude: 12.989196 + randomOffset(),
      longitude: 80.178799 + randomOffset(),
    };
  };

  const submitRideDetails = (from: string, to: string, date: Date, fromCoords?: LocationCoordinates, toCoords?: LocationCoordinates) => {
    const rideDetails: RideDetails = {
      from,
      to,
      date,
      fromCoordinates: (fromCoords ?? fromCoordinates) ?? undefined,
      toCoordinates: (toCoords ?? toCoordinates) ?? undefined
    };
    
    console.log('Submitting ride details with coordinates:', rideDetails);
    onSubmit(rideDetails);
  };

  const handleSearchInput = async (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Clear popular locations when user types more than 2 characters
    // This prevents confusion between search results and popular locations
    if (text.length > 2) {
      setPopularLocations([]);
    } else {
      // Only show popular locations for short queries (0-2 characters)
      try {
        const popular = await getPopularLocations(text, userLocation);
        setPopularLocations(popular);
      } catch (error) {
        const fallbackPopular = getPopularLocationsFallback(text);
        setPopularLocations(fallbackPopular);
      }
    }
    
    if (text.length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(async () => {
        try {
          console.log('Starting search for:', text);
          const results = await searchLocationsWithFallback(text);
          console.log('Search completed, results:', results.length);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          const fallbackResults = getPopularLocationsFallback(text).slice(0, 4).map((location, index) => ({
            display_name: `${location}, India`,
            lat: "13.0827",
            lon: "80.2707", 
            place_id: `fallback_${index}`,
            name: location
          }));
          setSearchResults(fallbackResults);
        } finally {
          setIsSearching(false);
        }
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: string, isFrom: boolean, locationResult?: LocationResult) => {
    console.log('Location selected:', location, 'isFrom:', isFrom, 'locationResult:', locationResult);
    
    const coordinates = getCoordinatesForLocation(location, locationResult);
    console.log('Generated coordinates:', coordinates);
    
    if (isFrom) {
      setFromLocation(location);
      setFromCoordinates(coordinates);
      setShowFromDropdown(false);
    } else {
      setToLocation(location);
      setToCoordinates(coordinates);
      setShowToDropdown(false);
    }
    
    setSearchQuery("");
    setSearchResults([]);
    setPopularLocations([]);
    
    const updatedFrom = isFrom ? location : fromLocation;
    const updatedTo = isFrom ? toLocation : location;
    const updatedFromCoords = isFrom ? coordinates : fromCoordinates;
    const updatedToCoords = isFrom ? toCoordinates : coordinates;
    
    if (updatedFrom && updatedTo) {
      submitRideDetails(
        updatedFrom,
        updatedTo,
        selectedDate,
        updatedFromCoords ?? undefined,
        updatedToCoords ?? undefined
      );
    }
  };

  const handleLocationSelectorOpen = async (isFrom: boolean) => {
    console.log('Opening location selector, isFrom:', isFrom, 'userLocation:', userLocation);
    
    if (isFrom) {
      setShowFromDropdown(true);
    } else {
      setShowToDropdown(true);
    }
    
    setIsLoadingPopular(true);
    setPopularLocations([]);
    
    try {
      console.log('Getting popular locations...');
      const popular = await getPopularLocations("", userLocation);
      console.log('Got popular locations:', popular);
      setPopularLocations(popular);
    } catch (error) {
      console.error('Error getting popular locations:', error);
      console.log('Using default fallback locations');
      setPopularLocations(POPULAR_LOCATIONS.default);
    } finally {
      setIsLoadingPopular(false);
    }
    
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDateTimeChange = (event: any, selected?: Date) => {
    if (selected) {
      setSelectedDate(selected);
      if (pickerMode === "date") {
        setPickerMode("time");
      } else {
        setShowPicker(false);
        setPickerMode("date");
        
        if (fromLocation && toLocation) {
          submitRideDetails(fromLocation, toLocation, selected, fromCoordinates ?? undefined, toCoordinates ?? undefined);
        }
      }
    } else {
      setShowPicker(false);
      setPickerMode("date");
    }
  };

  const handleDateFieldClick = () => {
    setPickerMode("date");
    setShowPicker(true);
  };

  const handleLocationSwap = () => {
    const tempLocation = fromLocation;
    const tempCoordinates = fromCoordinates;
    
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    setFromCoordinates(toCoordinates);
    setToCoordinates(tempCoordinates);
    
    if (onLocationSwap) {
      onLocationSwap();
    }

    if (toLocation && tempLocation) {
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
      setFromLocation("");
      setFromCoordinates(null);
      setFromCleared(true);
    } else {
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
    setSelectedDate(new Date());
    if (fromLocation && toLocation) {
      submitRideDetails(
        fromLocation,
        toLocation,
        new Date(),
        fromCoordinates ?? undefined,
        toCoordinates ?? undefined
      );
    }
  };

  const setToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    if (fromLocation && toLocation) {
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
      const coords = getCoordinatesForLocation(externalFromLocation);
      setFromCoordinates(coords);
    }
  }, [externalFromLocation]);

  useEffect(() => {
    if (externalToLocation !== undefined) {
      setToLocation(externalToLocation);
      const coords = getCoordinatesForLocation(externalToLocation);
      setToCoordinates(coords);
    }
  }, [externalToLocation]);

  useEffect(() => {
    if (fromLocation && hasClearedFrom) {
      setHasClearedFrom(false);
    }
  }, [fromLocation]);

  useEffect(() => {
    if (onLocationSelectionChange) {
      onLocationSelectionChange(fromLocation !== "" && toLocation !== "");
    }
  }, [fromLocation, toLocation, onLocationSelectionChange]);

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const getTextTruncationLength = () => {
    if (isSmallDevice) return 20;
    if (isMediumDevice) return 25;
    return 30;
  };

  return (
    <View style={styles.container}>
      <View style={styles.locationsWrapper}>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => handleLocationSelectorOpen(true)}
        >
          <View style={styles.inputContent}>
            <Image
              source={require("../assets/location-pin-2.png")}
              style={styles.icon}
            />
            <Text style={styles.selectedText} numberOfLines={1} ellipsizeMode="tail">
              {fromLocation ? (fromLocation.length > getTextTruncationLength() ? fromLocation.slice(0, getTextTruncationLength() - 3) + '...' : fromLocation) : "From"}
            </Text>
            {fromLocation !== "" && (
              <TouchableOpacity
                style={styles.clearIconContainer}
                onPress={e => {
                  e.stopPropagation && e.stopPropagation();
                  handleLocationClear(true);
                }}
              >
                <X size={wp(4)} color={AppColors.basicBlack} />
              </TouchableOpacity>
            )}
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
          style={styles.inputContainer}
          onPress={() => handleLocationSelectorOpen(false)}
        >
          <View style={styles.inputContent}>
            <Image
              source={require("../assets/arrow-icon.png")}
              style={styles.icon}
            />
            <Text style={styles.selectedText} numberOfLines={1} ellipsizeMode="tail">
              {toLocation ? (toLocation.length > getTextTruncationLength() ? toLocation.slice(0, getTextTruncationLength() - 3) + '...' : toLocation) : "To"}
            </Text>
            {toLocation !== "" && (
              <TouchableOpacity
                style={styles.clearIconContainer}
                onPress={e => {
                  e.stopPropagation && e.stopPropagation();
                  handleLocationClear(false);
                }}
              >
                <X size={wp(4)} color={AppColors.basicBlack} />
              </TouchableOpacity>
            )}
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
                  <Text style={styles.label}>{format(selectedDate, "EEE d MMM yyyy")}</Text>
                  <Text style={styles.selectedDateText}>{format(selectedDate, "h:mm a")}</Text>
                </>
              ) : (
                <Text style={styles.label}>When</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

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
                  <ActivityIndicator size="small" color={AppColors.basicWhite} />
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
                        handleLocationSelect(location, showFromDropdown)
                      }
                    >
                      <Image
                        source={require("../assets/location-pin.png")}
                        style={styles.locationIcon}
                      />
                      <Text style={styles.locationText}>{location}</Text>
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
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode={pickerMode}
          display="default"
          onChange={handleDateTimeChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: wp(5),
    overflow: "hidden",
    borderColor: AppColors.basicBlack,
    borderWidth: 2,
  },
  locationsWrapper: {
    position: "relative",
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.5),
    borderBottomWidth: 2,
    borderBottomColor: AppColors.basicBlack,
    flexDirection: "row",
    minHeight: hp(7),
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
  },
  label: {
    marginLeft: wp(2),
    fontSize: getFontSize(16, 18, 20),
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  selectedText: {
    fontSize: getFontSize(16, 18, 20),
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: wp(2),
    flex: 1,
  },
  selectedDateText: {
    marginLeft: wp(2),
    fontSize: getFontSize(10, 11, 12),
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  dateContainer: {
    width: "100%",
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    minHeight: hp(7),
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
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
    right: wp(8),
    top: hp(7),
    zIndex: 10,
    padding: getSpacing(4),
    backgroundColor: AppColors.primaryLightGreen,
  },
  switchIcon: {
    width: wp(6),
    height: wp(6),
    tintColor: AppColors.basicBlack,
  },
  clearIconContainer: {
    marginLeft: wp(2),
    justifyContent: "center",
    alignItems: "center",
    minHeight: hp(4),
    minWidth: wp(6),
    paddingHorizontal: wp(1),
  },
});