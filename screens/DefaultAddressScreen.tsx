import React, { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Image } from "react-native";
import { X } from "lucide-react-native";
import ChevronBack from "../components/ChevronBack";
import BrandInfo from "../components/BrandInfo";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import BrandedAlert from "../components/BrandedAlert";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../utils/responsive";

const { width, height } = Dimensions.get("window");

const DefaultAddressScreen: React.FC = () => {
  const [defaultAddress, setDefaultAddress] = useState<string>("");
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const [loading, setLoading] = useState(false);
  const api = useApi();
  const apiUtil = api.apiUtil;

  useEffect(() => {
    const fetchDefaultAddress = async () => {
      setLoading(true);
      try {
        const cached = await AsyncStorage.getItem("defaultAddress");
        if (cached) {
          setDefaultAddress(cached);
        } else {
          const res = await apiUtil.get("/user/default-address");
          if (typeof res === "object" && res !== null && "address" in res && typeof (res as any).address === "string") {
            setDefaultAddress((res as any).address);
            await AsyncStorage.setItem("defaultAddress", (res as any).address);
          }
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
        BrandedAlert.alert("Saved", "Your default pickup is updated.");
      } else {
        await apiUtil.post("/user/default-address", { address: details.from });
        BrandedAlert.alert("Saved", "We'll use this as your default pickup.");
      }
      setDefaultAddress(details.from);
      await AsyncStorage.setItem("defaultAddress", details.from);
    } catch (err) {
      BrandedAlert.alert("Couldn't save", "We couldn't update your default pickup. Try again?");
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
      console.log('Unable to get popular locations without user location');
      setPopularLocations([]);
    } finally {
      setIsLoadingPopular(false);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const clearAddress = async () => {
    setDefaultAddress("");
    setSearchQuery("");
    await AsyncStorage.removeItem("defaultAddress");
    try {
      await apiUtil.put("/user/default-address", { address: "" });
    } catch (err) {
    }
  };

  return (
    <View style={styles.container}>
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
        contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}
      >
        <View style={styles.cardWrapper}>
          {/* No card title / description — the page header already
              says "Default Start Address," and the input itself
              ("Enter your default address…") is self-explanatory. */}
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
                  <X size={16} color={AppColors.basicWhite} />
                </TouchableOpacity>
              )}
              {loading && (
                <ActivityIndicator size="small" color={AppColors.primaryLightGreen} style={styles.loadingIcon} accessibilityLabel="Loading" />
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
                accessibilityLabel="Loading"
                />
              )}
            </View>

            <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
              {isLoadingPopular ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={AppColors.basicWhite} accessibilityLabel="Loading" />
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
                  No locations found.
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
    </View>
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
  // Matches the shared ProfileScreen headerTitle pattern so every
  // settings sub-page (Profile, Personal Info, Passengers History,
  // Default Address) wears the same crown.
  headerTitle: {
    fontSize: 24,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.3,
    marginLeft: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Forest dark card on the lime canvas — same vocabulary as the
  // ProfileScreen menuContainer cards. Was an outlined "ghost card"
  // before, which made this screen feel like it lived in a different
  // app.
  cardWrapper: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.2,
    marginBottom: 6,
    textAlign: "left",
  },
  cardDescription: {
    fontSize: 13,
    color: AppColors.basicWhite,
    opacity: 0.7,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "left",
    marginBottom: 16,
    lineHeight: 19,
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(181,215,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(181,215,80,0.25)",
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    height: height * 0.03,
    width: height * 0.04,
    resizeMode: "contain",
    // Lime tint so the location pin reads on the forest dark card.
    tintColor: AppColors.primaryLightGreen,
  },
  selectedText: {
    // Sits inside the forest dark cardWrapper now — so text reads as
    // white, not basicBlack-on-lime.
    fontSize: 16,
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_700Bold",
    marginLeft: 12,
    flex: 1,
    letterSpacing: -0.1,
  },
  placeholderText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "NunitoSans_600SemiBold",
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