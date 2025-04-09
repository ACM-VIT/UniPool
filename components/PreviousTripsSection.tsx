import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
import { rideData } from "../dummy-data/DummyTrips";

const PreviousTripsSection: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const screenWidth = Dimensions.get("window").width;
    const maxDots = 5;

    // Only show the latest 5 trips
    const displayedRides = rideData.slice(Math.max(rideData.length - 5, 0));

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

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {displayedRides.map((trip, index) => (
                    <View
                        key={index}
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
        fontSize: 18,
        fontWeight: "600",
        color: "#000000",
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
});

export default PreviousTripsSection;
