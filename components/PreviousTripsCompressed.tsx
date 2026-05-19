import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AppColors from "../design_systems/colors";

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
  onPress?: () => void;
}

const PreviousTripsCompressed: React.FC<PreviousTripsCompressedProps> = ({
  trip,
  onPress,
}) => {
  // Locations often contain commas (e.g. "Assam, India") which break the
  // old "FROM to TO" sentence-style format into mush. Render as a two-row
  // origin / destination block with the standard outline/filled dot
  // route idiom — mirrors RideDetailsSelector and RideCard.
  const dateLabel = new Date(trip.start_time).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={styles.dotOutline} />
          <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">
            {trip.start_location}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={styles.dotFilled} />
          <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">
            {trip.end_location}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>₹{trip.total_price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  routeBlock: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: "rgba(181,215,80,0.45)",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeText: {
    // City names softened from 16/Bold to 15/SemiBold — still clearly
    // the row's hero, but no longer "shouting" the way ExtraBold +
    // 16 does next to everything else on the home sheet.
    flex: 1,
    color: AppColors.basicWhite,
    fontSize: 15,
    letterSpacing: -0.15,
    fontFamily: "NunitoSans_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(181,215,80,0.18)",
    paddingTop: 10,
  },
  dateText: {
    // Dimmer + thinner so the date supports the route instead of
    // competing with it.
    color: AppColors.primaryLightGreen,
    fontSize: 11.5,
    letterSpacing: 0.5,
    fontFamily: "NunitoSans_600SemiBold",
    textTransform: "uppercase",
    opacity: 0.75,
  },
  pricePill: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priceText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 13,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.1,
  },
});

export default PreviousTripsCompressed;
