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
  status?: string;
  matchReason?: string;
  /**
   * Booking is awaiting the host's accept/reject. Card dims slightly
   * and surfaces a "Waiting for host approval" pill so the user knows
   * the trip is not yet confirmed without hiding it from the list.
   */
  isPending?: boolean;
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
  isPending = false,
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
      style={[
        styles.card,
        { backgroundColor: isSelected ? AppColors.secondaryDarkGreen : AppColors.basicWhite },
        // Pending booking: dim the whole card so it visually
        // recedes vs. confirmed trips, but keep it tappable.
        isPending && styles.cardPending,
      ]}
      onPress={handleSelect}
    >
      <View style={styles.topContainer}>
        <View style={styles.routeContainer}>
          {/* Route block — outlined dot for origin, filled dot for
              destination, vertical dotted connector between. Same
              idiom as RideDetailsSelector and PreviousTripsCompressed
              so the visual language stays consistent. Replaces the
              old pin / dashed-line / arrow PNG combo that read as
              mismatched icons. */}
          <View style={styles.locationContainer}>
            <View
              style={[
                styles.dotOutline,
                {
                  borderColor: isSelected
                    ? AppColors.primaryLightGreen
                    : AppColors.secondaryDarkGreen,
                },
              ]}
            />
            <Text
              style={[styles.locationText, isSelected ? styles.selectedText : styles.unselectedText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {origin}
            </Text>
          </View>
          <View style={styles.routeConnector}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.routeConnectorDash,
                  {
                    backgroundColor: isSelected
                      ? AppColors.primaryLightGreen
                      : AppColors.secondaryDarkGreen,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.locationContainer}>
            <View
              style={[
                styles.dotFilled,
                {
                  backgroundColor: isSelected
                    ? AppColors.primaryLightGreen
                    : AppColors.secondaryDarkGreen,
                },
              ]}
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
  cardPending: ViewStyle;
  pendingPill: ViewStyle;
  pendingDot: ViewStyle;
  pendingText: TextStyle;
  topContainer: ViewStyle;
  selectedCard: ViewStyle;
  unselectedCard: ViewStyle;
  routeContainer: ViewStyle;
  locationContainer: ViewStyle;
  dotOutline: ViewStyle;
  dotFilled: ViewStyle;
  routeConnector: ViewStyle;
  routeConnectorDash: ViewStyle;
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
  cardPending: {
    // Cool greyed-out state. No pill, no label, no dashed border —
    // just a calm shift in surface + opacity that reads as
    // "not-yet-active." Pure-grey background (instead of brand
    // lime or white) signals the pending state in the same way
    // iOS uses lighter weights for in-flight content.
    backgroundColor: "#EBECE5",
    opacity: 0.78,
    shadowOpacity: 0.04,
  },
  pendingPill: {
    // Unused — retained as an empty style to avoid breaking the
    // Styles interface; can be deleted once we're sure no other
    // screen pulled it in.
    display: "none",
  },
  pendingDot: { display: "none" },
  pendingText: { display: "none" },
  card: {
    // Slightly shorter + more refined: ~19% of screen height instead
    // of 22%. Compact list of trips, less aggressive vertical real
    // estate per row.
    height: hp(19),
    width: "100%",
    borderRadius: wp(3),
    padding: wp(4),
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    // overflow: hidden is what makes the vehicle wheel-clip trick
    // work — the image extends past the card's bottom edge and the
    // padding-below-the-wheels gets clipped off here.
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
  // Route dots + connector — same dimensions as the
  // PreviousTripsCompressed card so the route idiom is unified.
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: wp(2.5),
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: wp(2.5),
  },
  routeConnector: {
    // Vertical column of three 3pt-tall dashes between the two route
    // dots — gives the dotted-line feel without an image asset.
    marginLeft: 4.5,
    marginVertical: 2,
    width: 2,
    alignItems: "center",
    justifyContent: "space-between",
    height: hp(2.2),
  },
  routeConnectorDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
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
    // Self-clipping wrapper. Empirical PIL measurement of the vehicle
    // PNGs (255 × 271): opaque taxi pixels run y=75..195, leaving
    // ~28% transparent above and ~28% transparent below the wheels.
    // The wrapper ends at the card's bottom edge with overflow:hidden;
    // the image inside is taller than the wrapper AND positioned with
    // its bottom further below, so that bottom transparent strip
    // falls off the wrapper and is clipped. Wheels read as resting
    // on the card's bottom rail.
    position: "absolute",
    right: -wp(3),
    bottom: 0,
    width: "52%",
    height: hp(14),
    overflow: "hidden",
  },
  vehicleImage: {
    position: "absolute",
    right: 0,
    // Push the image's bottom edge ~28% of its rendered height below
    // the wrapper — same fraction as the transparent strip in the
    // PNG — so the wrapper's overflow:hidden clips the strip away
    // and the wheels land flush with the wrapper's (= card's) edge.
    bottom: -hp(4.5),
    width: "100%",
    height: hp(17),
  },
});

export default RideCard;
