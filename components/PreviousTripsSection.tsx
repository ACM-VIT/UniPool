import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
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

const PreviousTripsSection: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rideData, setRideData] = useState<UserRideData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { apiUtil } = useApi();
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;

    const displayedRides = rideData.slice(Math.max(rideData.length - 5, 0));

    const fetchUserRides = async () => {
        try {
            setLoading(true);
            const response = await apiUtil.get<UserRideData[]>("/user/rides");
            setRideData(response);
        } catch (error) {
            const errorMessage = 
                typeof error === "object" && error !== null && "message" in error
                    ? String((error as { message?: unknown }).message)
                    : "Failed to load ride data";
            setError(errorMessage);
            console.error("Error fetching user rides:", error);
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
                                <PreviousTripsCompressed trip={trip} />
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
        fontWeight: "600",
        color: "#000",
        fontFamily: "NunitoSans_600SemiBold",
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
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
        marginHorizontal: 4,
        opacity: 0.5,
    },
    paginationDotActive: {
        opacity: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        width: "100%",
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 15,
        padding: "5%",
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 8,
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
        padding: "5%",
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 8,
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
