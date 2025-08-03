import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useIsFocused, useRoute } from "@react-navigation/native";

import BrandInfo from "../../components/BrandInfo";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import RideCard from "../../components/RideCard";
import LoadingComponent from "../../components/LoadingComponent";

import { useApi } from "../../utils/ApiUtil";
import bottomNavItems from "../../data/BottomNavigationItems";
import styles from "./AvailableRideScreens.styles";

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
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { apiUtil } = useApi();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMeta, setSearchMeta] = useState<ApiResponse['meta'] | null>(null);
  
  const [filters, setFilters] = useState<SearchFilters>({
    maxPrice: '',
    minSeats: '',
    sortBy: 'relevance',
    preferredTime: '',
    radius: '10',
    date: '',
  });

  // Extract route parameters
  let fromLocation = "";
  let toLocation = "";
  let fromCoordinates: { latitude: number; longitude: number } | undefined;
  let toCoordinates: { latitude: number; longitude: number } | undefined;

  if (route.params && typeof route.params === "object") {
    if ("fromLocation" in route.params && typeof (route.params as any).fromLocation === "string") {
      fromLocation = (route.params as any).fromLocation;
    }
    if ("toLocation" in route.params && typeof (route.params as any).toLocation === "string") {
      toLocation = (route.params as any).toLocation;
    }
    if ("fromCoordinates" in route.params && (route.params as any).fromCoordinates) {
      fromCoordinates = (route.params as any).fromCoordinates;
    }
    if ("toCoordinates" in route.params && (route.params as any).toCoordinates) {
      toCoordinates = (route.params as any).toCoordinates;
    }
    if ((route.params as any).params) {
      const nested = (route.params as any).params;
      if (typeof nested.fromLocation === "string") {
        fromLocation = nested.fromLocation;
      }
      if (typeof nested.toLocation === "string") {
        toLocation = nested.toLocation;
      }
      if (nested.fromCoordinates) {
        fromCoordinates = nested.fromCoordinates;
      }
      if (nested.toCoordinates) {
        toCoordinates = nested.toCoordinates;
      }
    }
  }

  if (!fromLocation || !toLocation) {
    try {
      const navState = (navigation as any).getState?.();
      if (navState && navState.routes) {
        const currentRoute = navState.routes[navState.index ?? 0];
        if (currentRoute && currentRoute.params) {
          if (typeof currentRoute.params.fromLocation === "string") {
            fromLocation = currentRoute.params.fromLocation;
          }
          if (typeof currentRoute.params.toLocation === "string") {
            toLocation = currentRoute.params.toLocation;
          }
        }
      }
    } catch (e) {
      // Silent catch
    }
  }

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
        Alert.alert("Error", "Failed to fetch rides. Please try again.");
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
  }, [isFocused, fromLocation, toLocation]);

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
      (navigation as any).navigate("AvailableRidesSelectedScreen", { 
        ride: selectedRide 
      });
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
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>

      <View style={styles.ridesHeaderRow}>
        <View style={styles.ridesHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <View>
            <Text style={styles.ridesCountText}>
              {loading ? "Searching..." : `${rides.length} rides found`}
            </Text>
            {searchMeta && (
              <Text style={styles.searchMetaText}>
                Sorted {getSortLabel()} • {searchMeta.used_radius_km}km radius
              </Text>
            )}
          </View>
        </View>
        <View style={styles.ridesHeaderRight}>
          <TouchableOpacity
            style={styles.createRideButton}
            onPress={() => (navigation as any).navigate("CreateRide")}
          >
            <Text style={styles.createRideButtonText}>Create Ride</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && <LoadingComponent />}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentContainer, { backgroundColor: require('../../design_systems/colors').default.primaryLightGreen }]}>
          {rides.length === 0 && !loading ? (
            <View style={styles.noRidesContainer}>
              <Text style={styles.noRidesTitle}>No rides found</Text>
              <Text style={styles.noRidesSubtitle}>
                Try adjusting your filters or search radius
              </Text>
              <TouchableOpacity
                style={styles.adjustFiltersButton}
                onPress={() => setShowFilters(true)}
              >
                <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rides.map((ride: RideData) => (
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
                />
                
                {/* Enhanced ride info */}
                <View style={styles.rideEnhancements}>
                  {ride.relevance_score && filters.sortBy === 'relevance' && (
                    <View style={styles.relevanceContainer}>
                      <Text style={styles.relevanceScore}>
                        {getRelevanceLabel(ride.relevance_score)}
                      </Text>
                    </View>
                  )}
                  
                  {ride.match_reason && (
                    <Text style={styles.matchReason}>
                      💡 {ride.match_reason}
                    </Text>
                  )}
                  
                  <View style={styles.distanceInfo}>
                    {ride.start_distance && (
                      <Text style={styles.distanceText}>
                        📍 {formatDistance(ride.start_distance)} from pickup
                      </Text>
                    )}
                    {ride.end_distance && (
                      <Text style={styles.distanceText}>
                        🎯 {formatDistance(ride.end_distance)} from destination
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.hostInfo}>
                    <Text style={styles.hostName}>
                      👤 Host: {ride.host_user_name}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {renderFilterModal()}
    </SafeAreaView>
  );
};

export default AvailableRideScreen;