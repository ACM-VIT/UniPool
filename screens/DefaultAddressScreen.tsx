import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, Dimensions, SafeAreaView } from "react-native";
import { TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Image } from "react-native";
import { X } from "lucide-react-native";
import ChevronBack from "../components/ChevronBack";
import BrandInfo from "../components/BrandInfo";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";

const { width, height } = Dimensions.get("window");

const DefaultAddressScreen: React.FC = () => {
  const [defaultAddress, setDefaultAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const api = useApi();
  const apiUtil = api.apiUtil;

  useEffect(() => {
    const fetchDefaultAddress = async () => {
      setLoading(true);
      try {
        const res = await apiUtil.get("/user/default-address");
        if (typeof res === "object" && res !== null && "address" in res && typeof (res as any).address === "string") {
          setDefaultAddress((res as any).address);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchDefaultAddress();
  }, []);

  const handleSubmit = async (details: { from: string }) => {
    setLoading(true);
    try {
      if (defaultAddress) {
        await apiUtil.put("/user/default-address", { address: details.from });
        Alert.alert("Success", "Default address updated!");
      } else {
        await apiUtil.post("/user/default-address", { address: details.from });
        Alert.alert("Success", "Default address set!");
      }
      setDefaultAddress(details.from);
    } catch (err) {
      Alert.alert("Error", "Could not update default address.");
    } finally {
      setLoading(false);
    }
  };

  // Location search UI state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [popularLocations, setPopularLocations] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchQuery(defaultAddress);
  }, [defaultAddress]);

  const handleSearchInput = async (text: string) => {
    setSearchQuery(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    try {
      const { getPopularLocations, getPopularLocationsFallback } = require("../utils/LocationService");
      const popular = await getPopularLocations(text, undefined);
      setPopularLocations(popular);
    } catch {
      const { getPopularLocationsFallback } = require("../utils/LocationService");
      setPopularLocations(getPopularLocationsFallback(text));
    }
    if (text.length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(async () => {
        try {
          const { searchLocationsWithFallback } = require("../utils/LocationService");
          const results = await searchLocationsWithFallback(text);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
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

  const handleLocationSelect = (location: string) => {
    setSearchQuery(location);
    setShowDropdown(false);
    setSearchResults([]);
    setPopularLocations([]);
    handleSubmit({ from: location });
  };

  const handleDropdownOpen = async () => {
    setShowDropdown(true);
    setIsLoadingPopular(true);
    setPopularLocations([]);
    try {
      const { getPopularLocations } = require("../utils/LocationService");
      const popular = await getPopularLocations("", undefined);
      setPopularLocations(popular);
    } catch {
      const { POPULAR_LOCATIONS } = require("../utils/LocationService");
      setPopularLocations(POPULAR_LOCATIONS.default);
    } finally {
      setIsLoadingPopular(false);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const clearAddress = () => {
    setDefaultAddress("");
    setSearchQuery("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>

      <View style={styles.headerRowWithChevron}>
        <ChevronBack />
        <Text style={styles.headerTitle}>Default Start Address</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cardWrapper}>
          <Text style={styles.cardTitle}>Set Your Default Start Address</Text>
          <Text style={styles.cardDescription}>
            Choose a location that you frequently travel from to save time on future bookings.
          </Text>
          
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={handleDropdownOpen}
            disabled={loading}
          >
            <View style={styles.inputContent}>
              <Image
                source={require("../assets/location-pin-2.png")}
                style={styles.icon}
              />
              <Text style={[
                styles.selectedText, 
                !defaultAddress && styles.placeholderText
              ]}>
                {defaultAddress || "Enter your default address..."}
              </Text>
              {defaultAddress && (
                <TouchableOpacity
                  style={styles.clearIconContainer}
                  onPress={(e) => {
                    e.stopPropagation && e.stopPropagation();
                    clearAddress();
                  }}
                >
                  <X size={16} color={AppColors.basicBlack} />
                </TouchableOpacity>
              )}
              {loading && (
                <ActivityIndicator size="small" color={AppColors.basicBlack} style={styles.loadingIcon} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* {defaultAddress && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Image
                source={require("../assets/location-pin.png")}
                style={styles.statusIcon}
              />
              <Text style={styles.statusTitle}>Current Default Address</Text>
            </View>
            <Text style={styles.statusAddress}>{defaultAddress}</Text>
          </View>
        )} */}
      </ScrollView>

      <Modal
        visible={showDropdown}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Default Address</Text>
            
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

            <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
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
                      onPress={() => handleLocationSelect(location)}
                      activeOpacity={0.7}
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
                      onPress={() => handleLocationSelect(result.name || result.display_name.split(',')[0])}
                      activeOpacity={0.7}
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
                setShowDropdown(false);
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRowWithChevron: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: height * 0.02,
    gap: 12,
  },
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: height * 0.01,
    marginBottom: height * 0.01,
  },
  chevronRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: height * 0.02,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.basicBlack,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 8,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 14,
    color: AppColors.basicBlack + "CC",
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 2,
    borderTopColor: AppColors.basicBlack,
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    height: height * 0.03,
    width: height * 0.04,
    resizeMode: "contain",
  },
  selectedText: {
    fontSize: 18,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    color: AppColors.basicBlack + "80",
    fontFamily: "NunitoSans_400Regular",
  },
  clearIconContainer: {
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 24,
    width: 24,
  },
  loadingIcon: {
    marginLeft: 12,
  },
  statusCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIcon: {
    height: 20,
    width: 20,
    tintColor: AppColors.primaryLightGreen,
    resizeMode: "contain",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 12,
  },
  statusAddress: {
    fontSize: 16,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 20,
    color: AppColors.primaryLightGreen,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    paddingVertical: 16,
  },
  searchLoader: {
    marginLeft: 12,
  },
  locationList: {
    maxHeight: height * 0.5,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.primaryLightGreen,
    marginTop: 16,
    marginBottom: 12,
  },
  locationItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.basicWhite + "20",
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    width: 16,
    height: 16,
    tintColor: AppColors.basicWhite,
    marginRight: 12,
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
    marginTop: 20,
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicWhite,
    marginLeft: 12,
  },
  closeButton: {
    marginTop: 20,
    alignItems: "center",
    padding: 16,
    backgroundColor: AppColors.basicBlack,
    borderRadius: 8,
  },
  closeButtonText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
  },
});

export default DefaultAddressScreen;