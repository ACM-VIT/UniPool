import React, { useState, useEffect } from "react";
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

export const CommonLocationCoordinates = [
  { location: "Chennai", latitude: 12.989196, longitude: 80.178799 },
  { location: "Vellore", latitude: 12.968, longitude: 77.1559 },
  { location: "Bangalore", latitude: 13.1985, longitude: 77.6665 },
  { location: "Coimbatore", latitude: 11.0376, longitude: 77.0363 },
  { location: "Salem", latitude: 11.6641, longitude: 78.1579 },
  { location: "Madurai", latitude: 9.912, longitude: 78.1242 },
  { location: "Pondicherry", latitude: 11.9352, longitude: 79.8082 },
];

interface RideDetails {
  from: string;
  to: string;
  date: Date;
}

interface RideDetailsSelectorProps {
  onSubmit: (details: RideDetails) => void;
  onLocationSelectionChange?: (hasFromAndTo: boolean) => void;
  onLocationSwap?: () => void;
  fromLocation?: string;
  toLocation?: string;
  userLocation?: UserLocation;
}

const RideDetailsSelector: React.FC<RideDetailsSelectorProps> = ({
  onSubmit,
  onLocationSelectionChange,
  onLocationSwap,
  fromLocation: externalFromLocation,
  toLocation: externalToLocation,
  userLocation,
}) => {
  const [fromLocation, setFromLocation] = useState(externalFromLocation || "");
  const [toLocation, setToLocation] = useState(externalToLocation || "");
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const handleSearchInput = async (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    try {
      const popular = await getPopularLocations(text, userLocation);
      setPopularLocations(popular);
    } catch (error) {
      const fallbackPopular = getPopularLocationsFallback(text);
      setPopularLocations(fallbackPopular);
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

  const handleLocationSelect = (location: string, isFrom: boolean) => {
    if (isFrom) {
      setFromLocation(location);
      setShowFromDropdown(false);
    } else {
      setToLocation(location);
      setShowToDropdown(false);
    }
    
    setSearchQuery("");
    setSearchResults([]);
    setPopularLocations([]);
    
    const updatedFrom = isFrom ? location : fromLocation;
    const updatedTo = isFrom ? toLocation : location;
    
    if (updatedFrom && updatedTo && onSubmit) {
      onSubmit({
        from: updatedFrom,
        to: updatedTo,
        date: selectedDate
      });
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
        
        if (fromLocation && toLocation && onSubmit) {
          onSubmit({
            from: fromLocation,
            to: toLocation,
            date: selected
          });
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
    setFromLocation(toLocation);
    setToLocation(tempLocation);
    if (onLocationSwap) {
      onLocationSwap();
    }
  };

  const setToToday = () => {
    setSelectedDate(new Date());
    if (fromLocation && toLocation && onSubmit) {
      onSubmit({
        from: fromLocation,
        to: toLocation,
        date: new Date()
      });
    }
  };

  const setToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    if (fromLocation && toLocation && onSubmit) {
      onSubmit({
        from: fromLocation,
        to: toLocation,
        date: tomorrow
      });
    }
  };

  useEffect(() => {
    if (externalFromLocation !== undefined) {
      setFromLocation(externalFromLocation);
    }
  }, [externalFromLocation]);

  useEffect(() => {
    if (externalToLocation !== undefined) {
      setToLocation(externalToLocation);
    }
  }, [externalToLocation]);

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

  return (
    <View style={styles.container}>
      <View style={styles.locationsWrapper}>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => handleLocationSelectorOpen(true)}
        >
          <View style={styles.inputContent}>
            <Image
              source={require("../assets/location-pin.png")}
              style={styles.icon}
            />
            <Text style={styles.selectedText}>{fromLocation || "From"}</Text>
            {fromLocation !== "" && (
              <TouchableOpacity
                style={styles.clearIconContainer}
                onPress={e => {
                  e.stopPropagation && e.stopPropagation();
                  setFromLocation("");
                }}
              >
                <X size={16} color={AppColors.basicBlack} />
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
            <Text style={styles.selectedText}>{toLocation || "To"}</Text>
            {toLocation !== "" && (
              <TouchableOpacity
                style={styles.clearIconContainer}
                onPress={e => {
                  e.stopPropagation && e.stopPropagation();
                  setToLocation("");
                }}
              >
                <X size={16} color={AppColors.basicBlack} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.dateContainer}>
        <TouchableOpacity onPress={handleDateFieldClick}>
          <View style={styles.inputContent}>
            <Image
              source={require("../assets/calendar-icon.png")}
              style={styles.icon}
            />
            <View>
              <Text style={styles.label}>Date of Journey</Text>
              <Text style={styles.selectedDateText}>
                {format(selectedDate, "EEE d MMM yyyy")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.dateButtons}>
          <TouchableOpacity style={styles.dateButton} onPress={setToToday}>
            <Text style={styles.dateButtonText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateButton} onPress={setToTomorrow}>
            <Text style={styles.dateButtonText}>Tomorrow</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showFromDropdown || showToDropdown}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
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

            <ScrollView style={styles.locationList}>
              {isLoadingPopular ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={AppColors.basicWhite} />
                  <Text style={styles.loadingText}>Loading nearby places...</Text>
                </View>
              ) : popularLocations.length > 0 ? (
                <>
                  <Text style={styles.sectionHeader}>Popular Locations</Text>
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

              {searchResults.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Search Results</Text>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.locationItem}
                      onPress={() =>
                        handleLocationSelect(formatLocationName(result), showFromDropdown)
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

              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <Text style={styles.noResultsText}>
                  No locations found. Try a different search term.
                </Text>
              )}
            </ScrollView>

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
        </View>
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
    borderRadius: 20,
    overflow: "hidden",
    borderColor: AppColors.basicBlack,
    borderWidth: 2,
  },
  locationsWrapper: {
    position: "relative",
  },
  inputContainer: {
    width: "100%",
    padding: "4%",
    paddingVertical: "6%",
    borderBottomWidth: 2,
    borderBottomColor: AppColors.basicBlack,
    flexDirection: "row",
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    height: height * 0.03,
    width: height * 0.04,
    objectFit: "contain",
  },
  label: {
    fontSize: 8,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  selectedText: {
    fontSize: 20,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: "2%",
  },
  selectedDateText: {
    marginLeft: "2%",
    fontSize: 12,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  dateContainer: {
    width: "100%",
    padding: "4%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  dateButtons: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
  },
  dateButton: {
    backgroundColor: AppColors.basicBlack,
    paddingVertical: "4%",
    paddingHorizontal: "8%",
    borderRadius: 8,
    textAlign: "center",
    alignItems: "center",
    flex: 1,
    minWidth: 70,
  },
  dateButtonText: {
    color: AppColors.basicWhite,
    fontSize: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: "5%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: "4%",
    color: AppColors.primaryLightGreen,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 8,
    marginBottom: "4%",
    paddingHorizontal: "3%",
  },
  searchInput: {
    flex: 1,
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    paddingVertical: "3%",
  },
  searchLoader: {
    marginLeft: "2%",
  },
  locationList: {
    maxHeight: "70%",
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.primaryLightGreen,
    marginTop: "3%",
    marginBottom: "2%",
  },
  locationItem: {
    paddingVertical: "3%",
    paddingHorizontal: "2%",
    borderBottomWidth: 1,
    borderBottomColor: AppColors.basicWhite + "20",
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    width: 16,
    height: 16,
    tintColor: AppColors.basicWhite,
    marginRight: "3%",
  },
  locationText: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite,
    flex: 1,
  },
  searchResultContent: {
    flex: 1,
  },
  locationSubtext: {
    fontSize: 12,
    fontFamily: "NunitoSans_300Light",
    color: AppColors.basicWhite + "80",
    marginTop: 2,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite + "80",
    textAlign: "center",
    marginTop: "5%",
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: "5%",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite,
    marginLeft: "3%",
  },
  closeButton: {
    marginTop: "4%",
    alignItems: "center",
    padding: "3%",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 8,
  },
  closeButtonText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
  },
  switchIconContainer: {
    position: "absolute",
    right: 30,
    top: 70,
    transform: [{ translateY: -10 }],
    zIndex: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  switchIcon: {
    width: 25,
    height: 25,
    tintColor: AppColors.basicBlack,
  },
  clearIconContainer: {
    marginLeft: 24,
    justifyContent: "center",
    alignItems: "center",
    height: 24,
    width: 24,
  },
  clearIcon: {
    width: 16,
    height: 16,
    tintColor: AppColors.basicBlack,
  },
});

export default RideDetailsSelector;
