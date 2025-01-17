import React from "react";
import {
    Dimensions,
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
} from "react-native";
import AppColors from "../design-system/colors";

const { width, height } = Dimensions.get("window");

interface RideDetails {
    start_location: string;
    end_location: string;
    start_time: string;
    total_price: number;
    total_seats: number;
    booked_seats: number;
    is_ongoing: number;
    is_same_gender: number;
}

interface PreviousTripsCompressedProps {
    trip: RideDetails;
}

const PreviousTripsCompressed: React.FC<PreviousTripsCompressedProps> = ({
    trip,
}) => {
    return (
        <TouchableOpacity style={styles.container}>
            <View style={styles.contentWrapper}>
                <View style={styles.tripInfo}>
                    <Text style={styles.tripText}>
                        {`${trip.start_location} to ${trip.end_location}`}
                    </Text>
                    <Text style={styles.start_timeText}>
                        {new Date(trip.start_time).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                    </Text>
                </View>
                <View style={styles.priceSection}>
                    <View>
                        <Image
                            source={require("../assets/wallet.png")}
                            style={styles.walletIcon}
                        />
                    </View>
                    <View style={styles.total_priceContainer}>
                        <Text style={styles.rupeeSymbol}>₹</Text>
                        <Text style={styles.total_priceText}>
                            {trip.total_price}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "95%",
        backgroundColor: AppColors.secondaryDarkGreen,
        borderRadius: 15,
        padding: "4%",
    },
    contentWrapper: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    tripInfo: {
        flex: 1,
    },
    tripText: {
        color: AppColors.basicWhite,
        fontSize: 18,
        marginBottom: "1%",
        fontFamily: "NunitoSans_800ExtraBold",
    },
    start_timeText: {
        color: AppColors.primaryLightGreen,
        fontSize: 14,
        fontFamily: "NunitoSans_600SemiBold"
    },
    priceSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    total_priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    rupeeSymbol: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "NunitoSans_400Regular"
    },
    total_priceText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: "NunitoSans_400Regular"
    },
    walletIcon: {
        height: height * 0.03,
        width: width * 0.1,
        objectFit: "contain",
    },
});

export default PreviousTripsCompressed;
