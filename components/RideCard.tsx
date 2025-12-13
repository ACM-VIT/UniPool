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

const bikeImg = require("../assets/Beep-Beep-Motorcycle.png");
const carImg = require("../assets/Beep-Beep-Racer.png");
const wagonImg = require("../assets/wagon.png");
const vanImg = require("../assets/foodvan.png");
const busImg = require("../assets/Bus.png");

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
  compact?: boolean;
  variant?: "light" | "dark";
}

const RideCard: React.FC<RideCardProps> = ({
  id,
  origin,
  destination,
  time,
  price,
  seatsAvailable,
  totalSeats = 4,
  onSelect,
  compact = false,
  variant = "light",
}) => {
  const isDark = variant === "dark";

  const vehicleConfig = () => {
    if (totalSeats <= 2)
      return { image: bikeImg, right: -18, bottom: 6, scale: 1.1 };

    if (totalSeats <= 4)
      return { image: carImg, right: -22, bottom: 6, scale: 1.1 };

    if (totalSeats <= 7)
      return { image: wagonImg, right: -24, bottom: 4, scale: 0.95 };

    if (totalSeats <= 10)
      return { image: vanImg, right: -26, bottom: 2, scale: 1 };

    return { image: busImg, right: -28, bottom: 0, scale: 1.05 };
  };

  const v = vehicleConfig();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onSelect?.(id)}
      style={[
        styles.card,
        compact ? styles.cardCompact : styles.cardFull,
        isDark ? styles.darkCard : styles.lightCard,
      ]}
    >
      <View style={styles.leftBlock}>
        <View style={styles.row}>
          <Image
            source={pinIcon}
            style={[
              styles.iconMain,
              compact ? styles.iconSmall : styles.iconLarge,
              { tintColor: isDark ? "white" : AppColors.secondaryDarkGreen },
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.locationText,
              compact ? styles.locationSmall : styles.locationLarge,
              { color: isDark ? "white" : AppColors.basicBlack },
            ]}
          >
            {origin}
          </Text>
        </View>

        <View
          style={[
            styles.dottedLine,
            compact ? styles.dotSmall : styles.dotLarge,
            { borderColor: isDark ? "white" : AppColors.secondaryDarkGreen },
          ]}
        />

        <View style={styles.row}>
          <Image
            source={arrowIcon}
            style={[
              styles.iconMain,
              compact ? styles.iconSmall : styles.iconLarge,
              { tintColor: isDark ? "white" : AppColors.secondaryDarkGreen },
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.locationText,
              compact ? styles.locationSmall : styles.locationLarge,
              { color: isDark ? "white" : AppColors.basicBlack },
            ]}
          >
            {destination}
          </Text>
        </View>

        <View style={styles.seatRow}>
          <Image
            source={seatIcon}
            style={[
              styles.seatIcon,
              compact ? styles.seatSmall : styles.seatLarge,
              { tintColor: isDark ? "white" : AppColors.secondaryDarkGreen },
            ]}
          />
          <Text
            style={[
              styles.seatText,
              { color: isDark ? "white" : AppColors.basicBlack },
            ]}
          >
            {seatsAvailable} seats available
          </Text>
        </View>
      </View>

      <View style={styles.rightBlock}>
        <View style={styles.infoRow}>
          <Image
            source={clockIcon}
            style={[
              styles.infoIcon,
              compact ? styles.infoSmall : styles.infoLarge,
              { tintColor: isDark ? "white" : AppColors.secondaryDarkGreen },
            ]}
          />
          <Text
            style={[
              styles.infoText,
              { color: isDark ? "white" : AppColors.basicBlack },
            ]}
          >
            {time}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Image
            source={walletIcon}
            style={[
              styles.infoIcon,
              compact ? styles.infoSmall : styles.infoLarge,
              { tintColor: isDark ? "white" : AppColors.secondaryDarkGreen },
            ]}
          />
          <Text
            style={[
              styles.infoText,
              { color: isDark ? "white" : AppColors.basicBlack },
            ]}
          >
            ₹ {price}
          </Text>
        </View>
      </View>

      <Image
        source={v.image}
        style={[
          styles.vehicle,
          compact ? styles.vehicleSmall : styles.vehicleLarge,
          {
            right: v.right,
            bottom: v.bottom,
            transform: [{ scale: v.scale }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

export default RideCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    overflow: "visible",
  },

  lightCard: {
    backgroundColor: "white",
  },
  darkCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },

  cardCompact: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginBottom: 16,
    minHeight: hp(16),
  },
  cardFull: {
    paddingVertical: 26,
    paddingHorizontal: 24,
    marginBottom: 24,
    minHeight: hp(21),
  },

  leftBlock: { flex: 1.5 },
  rightBlock: { flex: 0.8, alignItems: "flex-end" },

  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },

  iconMain: { resizeMode: "contain" },
  iconSmall: { width: 18, height: 18, marginRight: 8 },
  iconLarge: { width: 24, height: 24, marginRight: 10 },

  locationText: { fontWeight: "700", flexShrink: 1 },
  locationSmall: { fontSize: 17 },
  locationLarge: { fontSize: 20 },

  dottedLine: {
    width: 2,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
  dotSmall: { height: hp(3), marginVertical: 3, marginLeft: 8 },
  dotLarge: { height: hp(6), marginVertical: 6, marginLeft: 12 },

  seatRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  seatIcon: { resizeMode: "contain" },
  seatSmall: { width: 16, height: 16, marginRight: 6 },
  seatLarge: { width: 20, height: 20, marginRight: 8 },
  seatText: { fontSize: 15 },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoIcon: { resizeMode: "contain" },
  infoSmall: { width: 16, height: 16, marginRight: 6 },
  infoLarge: { width: 20, height: 20, marginRight: 8 },
  infoText: { fontSize: 15, fontWeight: "600" },

  vehicle: {
    position: "absolute",
    resizeMode: "contain",
  },
  vehicleSmall: {
    width: wp(34),
    height: hp(10),
  },
  vehicleLarge: {
    width: wp(42),
    height: hp(14),
  },
});
