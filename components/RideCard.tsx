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
import {
  MapPin,
  Navigation,
  Clock,
  CreditCard,
  Users,
} from "lucide-react-native";
import AppColors from "../design_systems/colors";

const { width, height } = Dimensions.get("window");

interface RideCardProps {
  id: string;
  origin?: string;
  destination?: string;
  time?: string;
  price?: number;
  isSelected?: boolean;
  seatsAvailable?: string;
  onSelect?: (id: string) => void;
  pricePerPerson?: boolean;
}

const RideCard: React.FC<RideCardProps> = ({
  id = "01",
  origin = "VIT Vellore",
  destination = "Chennai Airport",
  time = "1700 hrs",
  price = 500,
  isSelected = false,
  seatsAvailable = "1/2",
  onSelect = () => {},
  pricePerPerson = false,
}) => {
  const handleSelect = () => {
    onSelect(id);
  };

  // Extract the first number from seats available to determine vehicle type
  const totalSeats = parseInt(seatsAvailable.split("/")[1]) || 0;

  // Get vehicle icon based on seat capacity
  const getVehicleIcon = (): ImageSourcePropType => {
    if (totalSeats <= 2) {
      return require("../assets/motorcycle.png");
    } else if (totalSeats <= 4) {
      return require("../assets/racer.png");
    } else if (totalSeats <= 6) {
      return require("../assets/wagon.png");
    } else {
      return require("../assets/foodvan.png");
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isSelected
            ? AppColors.secondaryDarkGreen
            : AppColors.basicWhite,
        },
      ]}
      onPress={handleSelect}
    >
      <View style={styles.topContainer}>
        <View style={styles.routeContainer}>
          <View style={styles.locationContainer}>
            <MapPin
              size={20}
              color={
                isSelected
                  ? AppColors.primaryLightGreen
                  : AppColors.secondaryDarkGreen
              }
              style={styles.icon}
            />
            <Text
              style={[
                styles.locationText,
                isSelected ? styles.selectedText : styles.unselectedText,
              ]}
            >
              {origin}
            </Text>
          </View>

          {isSelected ? (
            <Image
              source={require("../assets/dotted_line_green.png")}
              style={styles.verticalLine}
            />
          ) : (
            <Image
              source={require("../assets/dotted_line.png")}
              style={styles.verticalLine}
            />
          )}

          <View style={styles.locationContainer}>
            <Navigation
              size={20}
              color={
                isSelected
                  ? AppColors.primaryLightGreen
                  : AppColors.secondaryDarkGreen
              }
              style={styles.icon}
            />
            <Text
              style={[
                styles.locationText,
                isSelected ? styles.selectedText : styles.unselectedText,
              ]}
            >
              {destination}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.timeContainer}>
            <Clock
              size={16}
              color={
                isSelected
                  ? AppColors.primaryLightGreen
                  : AppColors.secondaryDarkGreen
              }
              style={styles.timeIcon}
            />
            <Text
              style={[
                styles.detailText,
                isSelected
                  ? styles.selectedDetailText
                  : styles.unselectedDetailText,
              ]}
            >
              {time}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <CreditCard
              size={16}
              color={
                isSelected
                  ? AppColors.primaryLightGreen
                  : AppColors.secondaryDarkGreen
              }
              style={styles.priceIcon}
            />
            <Text
              style={[
                styles.detailText,
                isSelected
                  ? styles.selectedDetailText
                  : styles.unselectedDetailText,
              ]}
            >
              {price} pp
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.seatsContainer}>
        <Users
          size={18}
          color={
            isSelected
              ? AppColors.primaryLightGreen
              : AppColors.secondaryDarkGreen
          }
          style={styles.smallIcon}
        />
        <Text
          style={[
            styles.seatsText,
            isSelected ? styles.selectedText : styles.unselectedText,
          ]}
        >
          {seatsAvailable} seat
          {parseInt(seatsAvailable.split("/")[0]) !== 1 ? "s" : ""} available
        </Text>
      </View>

      <View style={styles.vehicleImageContainer}>
        <Image
          source={getVehicleIcon()}
          style={styles.vehicleImage}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
};

// Define TypeScript types for styles
interface Styles {
  card: ViewStyle;
  topContainer: ViewStyle;
  selectedCard: ViewStyle;
  unselectedCard: ViewStyle;
  routeContainer: ViewStyle;
  locationContainer: ViewStyle;
  verticalLine: ImageStyle;
  icon: ViewStyle;
  locationText: TextStyle;
  selectedText: TextStyle;
  unselectedText: TextStyle;
  seatsContainer: ViewStyle;
  smallIcon: ViewStyle;
  seatsText: TextStyle;
  detailsContainer: ViewStyle;
  timeContainer: ViewStyle;
  priceContainer: ViewStyle;
  timeIcon: ViewStyle;
  priceIcon: ViewStyle;
  detailText: TextStyle;
  selectedDetailText: TextStyle;
  unselectedDetailText: TextStyle;
  vehicleImageContainer: ViewStyle;
  vehicleImage: ImageStyle;
}

const styles = StyleSheet.create<Styles>({
  card: {
    height: height * 0.22,
    width: "100%",
    borderRadius: 12,
    padding: 16,
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
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  verticalLine: {
    width: 2,
    height: "25%",
    left: "6.5%",
    marginTop: 8,
  },
  icon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "bold",
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
  },
  smallIcon: {
    marginRight: 6,
  },
  seatsText: {
    fontSize: 14,
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
    fontWeight: "500",
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
    bottom: 0,
    width: "40%",
    height: "100%",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
});

export default RideCard;
