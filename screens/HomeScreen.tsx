import React from "react";
import { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Dimensions,
} from "react-native";
import MainNavBar from "../components/MainNavBar";
import RideDetailsSelector from "../components/RideDetailsSelector";
import PreviousTripsCompressed from "../components/PreviousTripsCompressed";
import bottomNavItems from "../design-system/BottomNavigationItems";
import { rideData } from "../dummy-data/DummyTrips";
import AppColors from "../design-system/colors";
import PreviousTripsSection from "../components/PreviousTripsSection";

const { width, height } = Dimensions.get("window");

const HomeScreen: React.FC = () => {
    const handleRideSubmit = (details: {
        from: string;
        to: string;
        date: Date;
    }) => {
        console.log("Submitted ride details:", details);
    };

    const [currentIndex, setCurrentIndex] = useState(0);
    const screenWidth = Dimensions.get('window').width;

    const handleScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / screenWidth);
        setCurrentIndex(index);
    };

    const popularDestinations = [
        "Chennai",
        "Hyderabad",
        "Vellore",
        "Bengaluru",
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Map Section */}
                <View style={styles.mapContainer}>
                    <Text>Map goes here</Text>
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                    {/* Popular Destinations */}
                    <View style={styles.InDemandSection}>
                        <Text style={styles.sectionTitle}>
                            In-Demand Destinations
                        </Text>
                        <View style={styles.destinationsContainer}>
                            {popularDestinations.map((city) => (
                                <TouchableOpacity
                                    key={city}
                                    style={styles.destinationButton}
                                >
                                    <Text style={styles.destinationButtonText}>
                                        {city}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Previous Trips Section */}
                    {/* <View style={styles.section}>
                        <View style={styles.YourTripsSection}>
                            <Text style={styles.sectionTitle}>Your Trips</Text>
                        </View>
                        <PreviousTripsCompressed trip={rideData[0]} />
                    </View> */}
                    <PreviousTripsSection />

                    {/* New Ride Section */}
                    <View style={styles.section}>
                        <View style={styles.createRideText}>
                            <Text style={styles.sectionTitle}>
                                Where'd you like to go?
                            </Text>
                            <TouchableOpacity style={styles.destinationButton}>
                                <Text style={styles.destinationButtonText}>
                                    Create Ride
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <RideDetailsSelector onSubmit={handleRideSubmit} />
                    </View>
                    {/* Navigation Bar */}
                    <View style={styles.navBarView}>
                        <MainNavBar
                            variant={0}
                            bottomNavItems={bottomNavItems}
                            iconPath={require("../assets/wallet.png")}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        backgroundColor: AppColors.basicWhite,
    },
    scrollView: {
        width: "100%",
        height: "100%",
    },
    mapContainer: {
        width: "100%",
        height: height * 0.25, // Percentage of screen height
        backgroundColor: AppColors.basicWhite,
        justifyContent: "center",
        alignItems: "center",
    },
    mainContent: {
        height: height * 0.75, // Percentage of screen height
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        backgroundColor: AppColors.primaryLightGreen,
        padding: "2.5%",
        justifyContent: "space-evenly",
    },
    section: {
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: "2.5%",
    },
    InDemandSection: {
        width: "100%",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "2.5%",
    },
    YourTripsSection: {
        width: "100%",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "2.5%",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    destinationsContainer: {
        paddingVertical: "2.5%",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    destinationButton: {
        backgroundColor: AppColors.basicBlack,
        paddingVertical: "2%",
        paddingHorizontal: "4%",
        borderRadius: 8,
    },
    destinationButtonText: {
        color: AppColors.basicWhite,
        fontSize: 12,
    },
    createRideButton: {
        backgroundColor: "#000000",
        paddingVertical: "2%",
        paddingHorizontal: "4%",
        borderRadius: 8,
        alignItems: "center",
    },
    createRideButtonText: {
        color: "#FFFFFF",
        fontWeight: "500",
        fontSize: 16,
    },
    navBarView: {
        width: "100%",
        backgroundColor: AppColors.primaryLightGreen,
        justifyContent: "center",
        alignItems: "center",
    },
    createRideText: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2.5%",
    },
});

export default HomeScreen;