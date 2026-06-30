import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
import { useRouter } from "expo-router";
import { appHref } from "../navigation/routes";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { useUser } from "../contexts/UserContext";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import PreviousTripsSkeleton from "./PreviousTripsSkeleton";
import type { HomeRide } from "../utils/AppStateService";

type UserRideData = HomeRide;

const DEBUG_PREVIOUS_TRIPS =
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_DEBUG_TRIPS === "1";

interface PreviousTripsSectionProps {
    /** Reports whether the home carousel has visible trips. */
    onHasTripsChange?: (hasTrips: boolean) => void;
    ridesFromState?: UserRideData[];
    appStateResolved?: boolean;
}

type PaginationDotsProps = {
    displayedRides: UserRideData[];
    currentIndex: number;
    maxDots: number;
};

const PaginationDots: React.FC<PaginationDotsProps> = ({
    displayedRides,
    currentIndex,
    maxDots,
}) => {
    const colors = useThemeColors();
    const totalItems = displayedRides.length;
    const dotInactive = { backgroundColor: colors.inkLine };
    const dotActive = { backgroundColor: colors.textPrimary };

    if (totalItems <= maxDots) {
        return (
            <>
                {displayedRides.map((ride, index) => (
                    <View
                        key={`dot-${ride.ride_id}`}
                        style={[
                            styles.paginationDot,
                            dotInactive,
                            currentIndex === index ? [styles.paginationDotActive, dotActive] : null,
                        ]}
                    />
                ))}
            </>
        );
    }

    const dots = [];
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
                    dotInactive,
                    currentIndex === dotIndex ? [styles.paginationDotActive, dotActive] : null,
                ]}
            />,
        );
    }

    return <>{dots}</>;
};

const PreviousTripsSection: React.FC<PreviousTripsSectionProps> = ({
    onHasTripsChange,
    ridesFromState,
    appStateResolved,
}) => {
    const colors = useThemeColors();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rideData, setRideData] = useState<UserRideData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { apiUtil } = useApi();
    const { isGuest } = useAuthGate();
    const { user: viewerUser } = useUser();
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;
    const controlledByAppState = appStateResolved !== undefined;

    // Home only highlights trips the viewer is actually taking. Pending
    // and rejected requests stay in the dedicated Trips tab.
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
            // Keep completed trips out of the home carousel; history owns them.
            const response = await apiUtil.get<UserRideData[]>("/user/rides?scope=upcoming");
            if (DEBUG_PREVIOUS_TRIPS) console.log("Raw API Response:", response);
            
            if (!Array.isArray(response)) {
                throw new Error("API response is not an array");
            }
            
            setRideData(response);
            if (DEBUG_PREVIOUS_TRIPS) console.log("User rides fetched successfully:", response.length, "rides");
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
        if (controlledByAppState) {
            if (!appStateResolved) {
                setLoading(true);
                return;
            }
            setError(null);
            setRideData(ridesFromState ?? []);
            setLoading(false);
            return;
        }

        // Guests have no private rides, so avoid an authenticated request.
        if (isGuest) {
            setLoading(false);
            setRideData([]);
            return;
        }
        fetchUserRides();
    }, [apiUtil, appStateResolved, controlledByAppState, isGuest, ridesFromState]);

    const handleScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        // Must match snapToInterval so the dot follows the centered card.
        const pageWidth = screenWidth * 0.95;
        const index = Math.round(contentOffset / pageWidth);
        setCurrentIndex(index);
    };

    const hasTrips = !loading && !error && displayedRides.length > 0;

    // Preserve HomeScreen's tri-state loading contract. Emitting `false`
    // before the rides request resolves would briefly show the nearby-rides
    // tile and then replace it with this carousel.
    useEffect(() => {
        if (loading) return;
        onHasTripsChange?.(hasTrips);
    }, [hasTrips, loading, onHasTripsChange]);

    // Reserve no vertical space until there are trips to show; otherwise the
    // home sheet visibly shrinks when the request resolves empty.
    if (loading || error || displayedRides.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <View style={styles.yourTripsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {isGuest ? "Recent trips" : "Your trips"}
                </Text>
            </View>

            {loading ? (
                // Matches the loaded card geometry if this branch is reached
                // by a future loading-state change.
                <PreviousTripsSkeleton />
            ) : (
                <>
                    <ScrollView
                        horizontal
                        // Cards are narrower than the viewport, so snap to
                        // card width instead of using pagingEnabled.
                        snapToInterval={screenWidth * 0.95}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        disableIntervalMomentum
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                    >
                        {displayedRides.map((trip: UserRideData, index: number) => (
                            <View
                                key={trip.ride_id}
                                style={[
                                    styles.tripContainer,
                                    // Match the sheet content width so the
                                    // carousel aligns with the controls below.
                                    { width: screenWidth * 0.95 },
                                ]}
                            >
                                <PreviousTripsCompressed
                                    trip={trip}
                                    // @ts-ignore: rideId is expected by RideDetailsScreen navigation.
                                    onPress={() => router.navigate(appHref("RideDetailsScreen", { rideId: trip.ride_id }))}
                                    onOpenChat={() => {
                                        // Group chats use the ride id as chatId; the short
                                        // destination keeps the header title compact.
                                        const shortDest = (trip.end_location || "")
                                            .split(",")[0]
                                            .trim();
                                        const title = shortDest
                                            ? `Trip to ${shortDest}`
                                            : "Ride chat";
                                        router.navigate(
                                            appHref("ChatMessages", {
                                                chatId: String(trip.ride_id),
                                                chatTitle: title,
                                                userId: viewerUser?.id,
                                                isGroupChat: true,
                                            })
                                        );
                                    }}
                                />
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.paginationContainer}>
                        <PaginationDots
                            displayedRides={displayedRides}
                            currentIndex={currentIndex}
                            maxDots={maxDots}
                        />
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
        paddingHorizontal: "2.5%",
        fontSize: 16,
        color: AppColors.secondaryDarkGreen,
        fontFamily: "NunitoSans_700Bold",
        letterSpacing: -0.05,
        opacity: 0.95,
    },
    tripContainer: {
        // Keep a visible gap between adjacent cards while preserving the
        // page width used by snapToInterval.
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 8,
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
