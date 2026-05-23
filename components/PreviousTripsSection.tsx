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
import type { HomeRide } from "../utils/AppStateService";

type UserRideData = HomeRide;

interface PreviousTripsSectionProps {
    // Fires whenever the "do we have trips to show?" answer changes —
    // lets HomeScreen swap between this section and the "Rides around
    // you" tile without showing both at once.
    onHasTripsChange?: (hasTrips: boolean) => void;
    ridesFromState?: UserRideData[];
    appStateResolved?: boolean;
}

const PreviousTripsSection: React.FC<PreviousTripsSectionProps> = ({
    onHasTripsChange,
    ridesFromState,
    appStateResolved,
}) => {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rideData, setRideData] = useState<UserRideData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { apiUtil } = useApi();
    const { isGuest } = useAuthGate();
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;
    const controlledByAppState = appStateResolved !== undefined;

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
            // Home "Your trips" never wants finished rides — past
            // trips live under Profile → Trip history. Server-side
            // scope filter keeps the carousel honest even if a future
            // viewer_state changes.
            const response = await apiUtil.getUncached<UserRideData[]>("/user/rides?scope=upcoming");
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

        // Guests have no rides — render the empty state without poking the API.
        if (isGuest) {
            setLoading(false);
            setRideData([]);
            return;
        }
        fetchUserRides();
    }, [apiUtil, appStateResolved, controlledByAppState, isGuest, ridesFromState]);

    const handleScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        // Page width matches the snapToInterval on the ScrollView so
        // the active dot tracks which card is actually centered.
        const pageWidth = screenWidth * 0.95;
        const index = Math.round(contentOffset / pageWidth);
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
    //
    // Crucial: skip the emit while we're still loading. Without this
    // gate, the first render fires `onHasTripsChange(false)` (because
    // `hasTrips` is `false` until the API resolves) which flips the
    // parent's tri-state from `null` to `false` and paints the "Rides
    // around you" tile. Then /user/rides comes back with trips, we
    // fire `(true)`, parent yanks the nearby tile and slides "Your
    // trips" in — that's the visible layout shift / flash. The
    // parent's design treats `null` as "still loading, render neither
    // tile" — we have to respect that until we actually know the
    // answer.
    useEffect(() => {
        if (loading) return;
        onHasTripsChange?.(hasTrips);
    }, [hasTrips, loading, onHasTripsChange]);

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
                        // `pagingEnabled` snaps to the ScrollView's *viewport*
                        // width, but each card is `screenWidth * 0.95` — so the
                        // snap landed mid-card and the user saw two halves
                        // overlapping during drag. `snapToInterval` snaps to
                        // the actual card width regardless of viewport, with
                        // `fast` deceleration so it still feels like paging.
                        snapToInterval={screenWidth * 0.95}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        disableIntervalMomentum
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
                                    onOpenChat={() => {
                                        // Match the canonical "open this ride's group chat"
                                        // shape used by BookingsScreen + TripInfo: the chatId
                                        // is the ride id, title is "Trip to <destination>"
                                        // (first comma-separated part so "Vellore, India"
                                        // shows as just "Vellore"). isGroupChat=true so the
                                        // chat header renders the trip-info pane.
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
                                                isGroupChat: true,
                                            })
                                        );
                                    }}
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
        // Matches the HomeScreen sectionTitle — same Bold weight and
        // 0.95 opacity so "Your trips" reads at the same volume as
        // "Where'd you like to go?" below it. The previous 0.7 dim
        // was too faint on the lime canvas.
        paddingHorizontal: "2.5%",
        fontSize: 16,
        color: AppColors.secondaryDarkGreen,
        fontFamily: "NunitoSans_700Bold",
        letterSpacing: -0.05,
        opacity: 0.95,
    },
    tripContainer: {
        // Each carousel page is `screenWidth * 0.95` wide (set inline
        // on the View). The inner padding here gives each card visible
        // breathing room from its neighbour during drag — without it
        // the leaving + arriving cards looked like one mashed slab.
        // snapToInterval still matches page width so the snap lands
        // cleanly on the next card.
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
