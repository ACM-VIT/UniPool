import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";

interface UserRideData {
    ride_id: string;
    host_user_id: string;
    start_location: string;
    end_location: string;
    start_time: string;
    total_seats: number;
    booked_seats: number;
    total_price: number;
    is_ongoing: number;
    is_same_gender: number;
    passenger_id?: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;
const PreviousTripsSection: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rideData, setRideData] = useState<UserRideData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { apiUtil } = useApi();
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;

    const uniqueRidesMap = new Map<string, UserRideData>();
    rideData.forEach((ride) => {
        if (ride.ride_id && !uniqueRidesMap.has(ride.ride_id)) {
            uniqueRidesMap.set(ride.ride_id, ride);
        }
    });
    const uniqueRides = Array.from(uniqueRidesMap.values());
    const displayedRides = uniqueRides.slice(Math.max(uniqueRides.length - 5, 0));

    const fetchUserRides = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiUtil.get<UserRideData[]>("/user/rides");
            console.log("Raw API Response:", response);
            
            if (!Array.isArray(response)) {
                throw new Error("API response is not an array");
            }
            
            setRideData(response);
            console.log("User rides fetched successfully:", response.length, "rides");
        } catch (error) {
            console.error("Error fetching user rides:", error);
            
            let errorMessage = "Failed to load ride data";
            
            if (error instanceof SyntaxError) {
                errorMessage = "Invalid response format from server";
                console.error("JSON Parse Error - possible encoding issue");
            } else if (typeof error === "object" && error !== null && "message" in error) {
                errorMessage = String((error as { message?: unknown }).message);
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserRides();
    }, [apiUtil]);

    const handleScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / screenWidth);
        setCurrentIndex(index);
    };

    const renderPaginationDots = () => {
        const totalItems = displayedRides.length;

        if (totalItems <= maxDots) {
            // If we have 5 or fewer items, show all dots
            return Array(totalItems)
                .fill(0)
                .map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.paginationDot,
                            currentIndex === index
                                ? styles.paginationDotActive
                                : null,
                        ]}
                    />
                ));
        } else {
            // Show 5 dots with ellipsis behavior
            const dots = [];

            // Calculate which dots to show
            for (let i = 0; i < maxDots; i++) {
                let dotIndex;

                if (currentIndex < 2) {
                    // Start of the list: show first 5 dots
                    dotIndex = i;
                } else if (currentIndex > totalItems - 4) {
                    // End of the list: show last 5 dots
                    dotIndex = totalItems - (maxDots - i);
                } else {
                    // Middle of the list: show current ±2 dots
                    dotIndex = currentIndex + (i - 2);
                }

                dots.push(
                    <View
                        key={dotIndex}
                        style={[
                            styles.paginationDot,
                            currentIndex === dotIndex
                                ? styles.paginationDotActive
                                : null,
                        ]}
                    />
                );
            }

            return dots;
        }
    };

    return (
        <View style={styles.section}>
            <View style={styles.yourTripsSection}>
                <Text style={styles.sectionTitle}>Your Trips</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.secondaryDarkGreen} />
                    <Text style={styles.loadingText}>Loading your trips...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : displayedRides.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No trips found</Text>
                </View>
            ) : (
                <>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {displayedRides.map((trip: UserRideData, index: number) => (
                            <View
                                key={trip.ride_id}
                                style={[
                                    styles.tripContainer,
                                    { width: screenWidth - 32 },
                                ]}
                            >
                                <PreviousTripsCompressed
                                    trip={trip}
                                    onPress={() => navigation.navigate("RideDetailsScreen", { rideId: trip.ride_id })}
                                />
                            </View>
                        ))}
                    </ScrollView>

                    {/* Pagination Indicators */}
                    <View style={styles.paginationContainer}>
                        {renderPaginationDots()}
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        gap: 8,
    },
    yourTripsSection: {
    },
    sectionTitle: {
        paddingHorizontal:"2.5%",
        fontSize: 20,
        color: "#000",
        fontFamily: "NunitoSans_400Regular",
    },
    tripContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
        marginLeft: 8,
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    paginationDot: {
        width: 4,
        height: 4,
        borderRadius: 4,
        backgroundColor: AppColors.basicWhite,
        marginHorizontal: 3,
    },
    paginationDotActive: {
        opacity: 1,
        backgroundColor: AppColors.basicBlack,
    },
    loadingContainer: {
        width: "100%",
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 100,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: AppColors.primaryLightGreen,
        fontFamily: "NunitoSans_400Regular",
    },
    errorContainer: {
        width: "100%",
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 15,
        padding: "5%",
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 8,
        minHeight: 100,
    },
    errorText: {
        fontSize: 16,
        color: AppColors.primaryLightGreen,
        textAlign: "center",
        fontFamily: "NunitoSans_400Regular",
    },
    emptyContainer: {
        width: "100%",
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 100,
    },
    emptyText: {
        fontSize: 16,
        color: AppColors.primaryLightGreen,
        textAlign: "center",
        fontFamily: "NunitoSans_400Regular",
    },
});

export default PreviousTripsSection;
