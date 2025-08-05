import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ImageSourcePropType,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";
const locationPinIcon = require("../assets/location-pin.png");
const navigationIcon = require("../assets/navigation-2.png");
const clockIcon = require("../assets/clock.png");
const walletIcon = require("../assets/wallet.png");
const sofaIcon = require("../assets/sofa.png");
import AppColors from "../design_systems/colors";

const { width, height } = Dimensions.get("window");

const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const isLargeDevice = width >= 400;

const wp = (percentage: number) => (width * percentage) / 100;
const hp = (percentage: number) => (height * percentage) / 100;

const getFontSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

const getIconSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

interface RideCardProps {
  id: string;
  origin?: string;
  destination?: string;
  time?: string;
  price?: number;
  isSelected?: boolean;
  seatsAvailable?: string;
  totalSeats?: number;
  onSelect?: (id: string) => void;
  pricePerPerson?: boolean;
  variant?: "upcoming" | "inprogress";
  date?: string;
}

// Format time to add colon between hours (e.g., '1700 hrs' -> '17:00 hrs')
const formatTime = (rawTime: string) => {
  // Match '1700 hrs', '0900 hrs', etc.
  const match = rawTime.match(/^(\d{2})(\d{2})\s*hrs$/);
  if (match) {
    return `${match[1]}:${match[2]} hrs`;
  }
  return rawTime;
};

const RideCard: React.FC<RideCardProps> = ({
  id = "01",
  origin = "VIT Vellore",
  destination = "Chennai Airport",
  time = "1700 hrs",
  price = 500,
  isSelected = false,
  seatsAvailable = "1/2",
  totalSeats,
  onSelect = () => {},
  pricePerPerson = false,
  variant = "upcoming",
  date = "",
}) => {
  const handleSelect = () => {
    onSelect(id);
  };

  const maxSeats = typeof totalSeats === "number" ? totalSeats : parseInt(seatsAvailable.split("/")[1]) || 0;
  const getVehicleIcon = (): ImageSourcePropType => {
    if (maxSeats < 3) return require("../assets/motorcycle.png");
    if (maxSeats === 3) return require("../assets/Taxi.png");
    if (maxSeats === 4) return require("../assets/racer.png");
    if (maxSeats < 8) return require("../assets/wagon.png");
    if (maxSeats < 11) return require("../assets/foodvan.png");
    if (maxSeats < 20) return require("../assets/Bus.png");
    return require("../assets/UFO.png");
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isSelected ? AppColors.secondaryDarkGreen : AppColors.basicWhite }]}
      onPress={handleSelect}
    >
      <View style={styles.topContainer}>
        <View style={styles.routeContainer}>
          <View style={styles.locationContainer}>
            <Image
              source={locationPinIcon}
              style={[
                styles.icon,
                {
                  tintColor: isSelected ? AppColors.primaryLightGreen : AppColors.secondaryDarkGreen,
                  width: getIconSize(16, 18, 20),
                  height: getIconSize(16, 18, 20),
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[styles.locationText, isSelected ? styles.selectedText : styles.unselectedText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {origin}
            </Text>
          </View>
          {isSelected ? (
            <Image source={require("../assets/dotted_line_green.png")} style={styles.verticalLine} />
          ) : (
            <Image source={require("../assets/dotted_line.png")} style={styles.verticalLine} />
          )}
          <View style={styles.locationContainer}>
            <Image
              source={navigationIcon}
              style={[
                styles.icon,
                {
                  tintColor: isSelected ? AppColors.primaryLightGreen : AppColors.secondaryDarkGreen,
                  width: getIconSize(16, 18, 20),
                  height: getIconSize(16, 18, 20),
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[styles.locationText, isSelected ? styles.selectedText : styles.unselectedText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {destination}
            </Text>
          </View>
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.timeContainer}>
            <Image
              source={clockIcon}
              style={[
                styles.timeIcon,
                {
                  tintColor: isSelected ? AppColors.primaryLightGreen : AppColors.secondaryDarkGreen,
                  width: getIconSize(14, 16, 16),
                  height: getIconSize(14, 16, 16),
                },
              ]}
              resizeMode="contain"
            />
            <Text style={[styles.detailText, isSelected ? styles.selectedDetailText : styles.unselectedDetailText]}>
              {formatTime(time)}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Image
              source={walletIcon}
              style={[
                styles.priceIcon,
                {
                  tintColor: isSelected ? AppColors.primaryLightGreen : AppColors.secondaryDarkGreen,
                  width: getIconSize(14, 16, 16),
                  height: getIconSize(14, 16, 16),
                },
              ]}
              resizeMode="contain"
            />
            <Text style={[styles.detailText, isSelected ? styles.selectedDetailText : styles.unselectedDetailText]}>
              {price} pp
            </Text>
          </View>
        </View>
      </View>
      {variant === "upcoming" ? (
        <View style={styles.seatsContainer}>
          <Text style={[styles.seatsText, isSelected ? styles.selectedText : styles.unselectedText]}>
            {date}
          </Text>
        </View>
      ) : (
        <View style={styles.seatsContainer}>
          <Image
            source={sofaIcon}
            style={[
              styles.smallIcon,
              {
                tintColor: isSelected ? AppColors.primaryLightGreen : AppColors.secondaryDarkGreen,
                width: getIconSize(16, 18, 18),
                height: getIconSize(16, 18, 18),
              },
            ]}
            resizeMode="contain"
          />
          <Text style={[styles.seatsText, isSelected ? styles.selectedText : styles.unselectedText]}>
            {seatsAvailable} seat{parseInt(seatsAvailable.split("/")[0]) !== 1 ? "s" : ""} available
          </Text>
        </View>
      )}
      <View style={styles.vehicleImageContainer}>
        <Image source={getVehicleIcon()} style={styles.vehicleImage} resizeMode="contain" />
      </View>
    </TouchableOpacity>
  );
};

interface Styles {
  card: ViewStyle;
  topContainer: ViewStyle;
  selectedCard: ViewStyle;
  unselectedCard: ViewStyle;
  routeContainer: ViewStyle;
  locationContainer: ViewStyle;
  verticalLine: ImageStyle;
  icon: ImageStyle;
  locationText: TextStyle;
  selectedText: TextStyle;
  unselectedText: TextStyle;
  seatsContainer: ViewStyle;
  smallIcon: ImageStyle;
  seatsText: TextStyle;
  detailsContainer: ViewStyle;
  timeContainer: ViewStyle;
  priceContainer: ViewStyle;
  timeIcon: ImageStyle;
  priceIcon: ImageStyle;
  detailText: TextStyle;
  selectedDetailText: TextStyle;
  unselectedDetailText: TextStyle;
  vehicleImageContainer: ViewStyle;
  vehicleImage: ImageStyle;
}

const styles = StyleSheet.create<Styles>({
  card: {
    height: hp(22),
    width: "100%",
    borderRadius: wp(3),
    padding: wp(4),
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: "2%",
  },
  topContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedCard: {
    backgroundColor: "#1e4620",
  },
  unselectedCard: {
    backgroundColor: "#ffffff",
  },
  routeContainer: {
    marginBottom: 0,
    flex: 1,
    marginRight: wp(2),
    minHeight: hp(12),
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: hp(5),
    paddingVertical: hp(0.5),
  },
  verticalLine: {
    width: 2,
    height: hp(3),
    left: wp(2.5),
    marginTop: hp(0.5),
    marginBottom: hp(0.5),
  },
  icon: {
    marginRight: wp(2),
  },
  locationText: {
    fontSize: getFontSize(14, 16, 18),
    fontFamily: "NunitoSans_400Regular",
    flex: 1,
    lineHeight: getFontSize(18, 20, 22),
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  selectedText: {
    color: AppColors.basicWhite,
  },
  unselectedText: {
    color: AppColors.basicBlack,
  },
  seatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: hp(4),
    paddingVertical: hp(0.5),
  },
  smallIcon: {
    marginRight: wp(1.5),
  },
  seatsText: {
    fontSize: getFontSize(12, 14, 16),
    fontFamily: "NunitoSans_400Regular",
    lineHeight: getFontSize(16, 18, 20),
  },
  detailsContainer: {
    flexDirection: "column",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    gap: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeIcon: {
    marginRight: 4,
  },
  priceIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
  },
  selectedDetailText: {
    color: AppColors.basicWhite,
  },
  unselectedDetailText: {
    color: AppColors.basicBlack,
  },
  vehicleImageContainer: {
    position: "absolute",
    right: 0,
    bottom: 3,
    top: -1,
    width: "40%",
    height: "100%",
  },
  vehicleImage: {
    width: "100%",
  },
});

export default RideCard;
