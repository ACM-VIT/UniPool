import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import AppColors from "../design_systems/colors";

const pinIcon = require("../assets/location-pin.png");
const arrowIcon = require("../assets/navigation-2.png");
const clockIcon = require("../assets/clock.png");
const walletIcon = require("../assets/wallet.png");
const seatIcon = require("../assets/sofa.png");

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;

interface RideCardProps {
  id: string;
  origin?: string;
  destination?: string;
  time?: string;
  price?: number;
  seatsAvailable?: string;
  totalSeats?: number;
  onSelect?: (id: string) => void;
}

const RideCard: React.FC<RideCardProps> = ({
  id,
  origin = "VIT Vellore",
  destination = "Chennai Airport",
  time = "1700 hrs",
  price = 500,
  seatsAvailable = "1/2",
  totalSeats = 2,
  onSelect = () => {},
}) => {
  const getVehicleImage = () => {
    if (totalSeats <= 2) return require("../assets/motorcycle.png");
    if (totalSeats <= 4) return require("../assets/racer.png");
    if (totalSeats <= 7) return require("../assets/wagon.png");
    if (totalSeats <= 10) return require("../assets/foodvan.png");
    return require("../assets/Bus.png");
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onSelect(id)}>
      <View style={styles.leftBlock}>
        <View style={styles.row}>
          <Image source={pinIcon} style={styles.mainIcon} />
          <Text style={styles.locationText}>{origin}</Text>
        </View>

        <Image source={require("../assets/dotted_line.png")} style={styles.dotLine} />

        <View style={styles.row}>
          <Image source={arrowIcon} style={styles.mainIcon} />
          <Text style={styles.locationText}>{destination}</Text>
        </View>

        <View style={styles.seatRow}>
          <Image source={seatIcon} style={styles.seatIcon} />
          <Text style={styles.seatText}>{seatsAvailable} seats available</Text>
        </View>
      </View>

      <View style={styles.rightBlock}>
        <View style={styles.infoRow}>
          <Image source={clockIcon} style={styles.infoIcon} />
          <Text style={styles.infoText}>{time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Image source={walletIcon} style={styles.infoIcon} />
          <Text style={styles.infoText}>₹ {price}</Text>
        </View>
      </View>

      <Image source={getVehicleImage()} style={styles.vehicle} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 0,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    overflow: "visible",
  },

  leftBlock: {
    flex: 1.4,
    paddingRight: 10,
  },

  rightBlock: {
    flex: 0.8,
    alignItems: "flex-end",
    paddingTop: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  mainIcon: {
    width: 22,
    height: 22,
    tintColor: AppColors.secondaryDarkGreen,
    marginRight: 6,
  },

  locationText: {
    fontSize: 21,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
  },

  dotLine: {
    width: 2,
    height: hp(4),
    tintColor: AppColors.secondaryDarkGreen,
    marginLeft: 12,
    marginVertical: 4,
  },

  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  seatIcon: {
    width: 20,
    height: 20,
    tintColor: AppColors.secondaryDarkGreen,
    marginRight: 6,
  },

  seatText: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicBlack,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  infoIcon: {
    width: 18,
    height: 18,
    tintColor: AppColors.secondaryDarkGreen,
    marginRight: 6,
  },

  infoText: {
    fontSize: 17,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.basicBlack,
  },

  vehicle: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: wp(35),
    height: hp(12),
    resizeMode: "contain",
  },
});

export default RideCard;
