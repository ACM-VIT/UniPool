import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
import { useRouter } from "expo-router";
import { appHref } from "../navigation/routes";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import AppColors from "../design_systems/colors";
import LoadingComponent from "./LoadingComponent";
import PreviousTripsSkeleton from "./PreviousTripsSkeleton";

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
    // Server-computed UI state from /user/rides. Drives which rides
    // surface on the home carousel — see filter below.
    viewer_state?:
        | "host"
        | "confirmed_passenger"
        | "pending_passenger"
        | "rejected_passenger"
        | "available"
        | "full"
        | "past";
    request_status?: string;
}

interface PreviousTripsSectionProps {
    // Fires whenever the "do we have trips to show?" answer changes —
    // lets HomeScreen swap between this section and the "Rides around
    // you" tile without showing both at once.
    onHasTripsChange?: (hasTrips: boolean) => void;
}

const PreviousTripsSection: React.FC<PreviousTripsSectionProps> = ({ onHasTripsChange }) => {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rideData, setRideData] = useState<UserRideData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { apiUtil } = useApi();
    const { isGuest } = useAuthGate();
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;

    // Memoize the de-dupe + filter + slice so re-renders driven by
    // pagination dot taps (currentIndex changes) don't rebuild this
    // work each time.
    //
    // Filter rule for the home carousel: only surface trips the user
    // is *actually going on*. That means host + confirmed_passenger,
    // plus the catch-all `available`/`full` for bookings whose state
    // didn't resolve. Pending and rejected bookings are filtered out
    // — they don't belong on the home headline; the dedicated Trips
    // tab carries them with the proper pending/declined treatments.
    const { uniqueRides, displayedRides } = useMemo(() => {
        const seen = new Map<string, UserRideData>();
        for (const ride of rideData) {
            if (!ride.ride_id || seen.has(ride.ride_id)) continue;
            if (
                ride.viewer_state === "pending_passenger" ||
                ride.viewer_state === "rejected_passenger"
            ) {
                continue;
            }
            seen.set(ride.ride_id, ride);
        }
        const unique = Array.from(seen.values());
        const display = unique.slice(Math.max(unique.length - 5, 0));
        return { uniqueRides: unique, displayedRides: display };
    }, [rideData]);

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
        // Guests have no rides — render the empty state without poking the API.
        if (isGuest) {
            setLoading(false);
            setRideData([]);
            return;
        }
        fetchUserRides();
    }, [apiUtil, isGuest]);

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

    const hasTrips = !loading && !error && displayedRides.length > 0;

    // Notify the parent (HomeScreen) whenever the answer changes. The
    // parent uses this to swap to the "Rides around you" tile when no
    // trips exist.
    useEffect(() => {
        onHasTripsChange?.(hasTrips);
    }, [hasTrips, onHasTripsChange]);

    // Return null during loading too. The old skeleton-while-loading
    // approach left a ~200pt slot that VANISHED when /user/rides
    // resolved empty (mirror of the NearbyTile-appearing-then-
    // disappearing shift). Now: loading + error + empty all render
    // nothing. The slot only fills once we KNOW there are trips, so
    // the only layout change is content APPEARING (sheet expands,
    // absorbed by its inner ScrollView) rather than disappearing
    // (sheet shrinks, visible jump). Same approach as the parent
    // delaying NearbyTile until hasUserTrips === false.
    if (loading || error || displayedRides.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <View style={styles.yourTripsSection}>
                <Text style={styles.sectionTitle}>
                    {isGuest ? "Recent trips" : "Your trips"}
                </Text>
            </View>

            {loading ? (
                // Skeleton matches the loaded trip card geometry exactly so
                // the section doesn't grow + push the rest of the sheet
                // down when /user/rides resolves.
                <PreviousTripsSkeleton />
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
                                    // Each carousel page matches the parent
                                    // ScrollView width — i.e. the same inner
                                    // width as scrollableContent (screen
                                    // minus 2 × 2.5% gutter on each side).
                                    // Previously this was `screenWidth - 32`
                                    // which didn't track the rest of the
                                    // sheet's pill widths, so the "Your
                                    // trips" card sat a different size from
                                    // the buttons below.
                                    { width: screenWidth * 0.95 },
                                ]}
                            >
                                <PreviousTripsCompressed
                                    trip={trip}
                                    // @ts-ignore: rideId is expected by RideDetailsScreen navigation
                                    onPress={() => router.navigate(appHref("RideDetailsScreen", { rideId: trip.ride_id }))}
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
        // Matches the HomeScreen sectionTitle — sentence-case sub-
        // header, calm weight, slight dim. Keeps the home sheet from
        // having multiple competing ExtraBold blocks.
        paddingHorizontal: "2.5%",
        fontSize: 14,
        color: AppColors.secondaryDarkGreen,
        fontFamily: "NunitoSans_600SemiBold",
        letterSpacing: -0.05,
        opacity: 0.7,
    },
    tripContainer: {
        // No horizontal margin — the page width is computed inline
        // (`width: screenWidth * 0.95`) to match scrollableContent's
        // inner width. Adding margin here would break the paging
        // snap (each "page" must equal the ScrollView's width).
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    paginationDot: {
        width: 5,
        height: 5,
        borderRadius: 4,
        backgroundColor: "rgba(38,59,51,0.30)",
        marginHorizontal: 3,
    },
    paginationDotActive: {
        opacity: 1,
        backgroundColor: AppColors.secondaryDarkGreen,
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
        // Forest card on the lime canvas — the same surface system that
        // UpNextCard already nails. Bold dark slab on lime reads premium;
        // washed cream tiles read cheap.
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 28,
        paddingHorizontal: 22,
        minHeight: 110,
    },
    emptyText: {
        fontSize: 15,
        lineHeight: 22,
        color: AppColors.primaryLightGreen,
        textAlign: "center",
        fontFamily: "NunitoSans_700Bold",
        letterSpacing: 0.1,
    },
});

export default PreviousTripsSection;
