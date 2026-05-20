import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Image, Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";
import LoadingComponent from "../../components/LoadingComponent";
import SearchingForRidesLoader from "../../components/SearchingForRidesLoader";

import { useApi } from "../../utils/ApiUtil";
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

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMeta, setSearchMeta] = useState<ApiResponse['meta'] | null>(null);
  
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
      .catch((err) => {
        console.error("API error:", err);
        setRides([]);
        setSearchMeta(null);
        BrandedAlert.alert("Error", "Failed to fetch rides. Please try again.");
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

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
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
                  <Text style={styles.checkmark}>✓</Text>
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
              <Text style={styles.filterLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.date}
                onChangeText={(text) => setFilters({...filters, date: text})}
                placeholder="2024-12-25 or leave empty for all dates"
                placeholderTextColor="#666"
              />
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
        <View style={styles.ridesHeaderRight}>
          <TouchableOpacity
            style={styles.createRideButton}
            onPress={() => router.navigate(appHref("CreateRide"))}
          >
            <Text style={styles.createRideButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && <SearchingForRidesLoader />}

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
                  style={[styles.adjustFiltersButton, { backgroundColor: 'rgba(38,59,51,0.10)' }]}
                  onPress={() =>
                    router.navigate(
                      appHref("CreateRide", {
                        // Hand off the search context so the create
                        // form is pre-filled with what they were
                        // looking for — saves re-typing and signals
                        // that they're "offering this route".
                        fromLocation,
                        toLocation,
                        fromCoordinates,
                        toCoordinates,
                        date: filters.date || undefined,
                      } as any),
                    )
                  }
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
                  time={new Date(ride.start_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  price={ride.total_price}
                  isSelected={selectedRideId === ride.id}
                  seatsAvailable={`${ride.total_seats - ride.booked_seats}/${ride.total_seats}`}
                  onSelect={handleRideSelection}
                  pricePerPerson={false}
                  matchReason={ride.match_reason}
                />

                {/* Sub-row beneath card: host + walking distances. Kept compact
                    so the BlaBlaCar-style card stays the visual anchor. */}
                <View style={styles.rideEnhancements}>
                  <Text style={styles.hostName}>
                    Hosted by {ride.host_user_name}
                  </Text>
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
