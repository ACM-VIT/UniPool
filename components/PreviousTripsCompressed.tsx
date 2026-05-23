import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import AppColors from "../design_systems/colors";
import RouteStack from "./RouteStack";

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
  // When provided, a small lime "open chat" chip appears in the
  // footer next to the price. Tapping it fires `onOpenChat` and the
  // outer card press is consumed by React Native's responder system
  // so the user doesn't also navigate to ride details. Omit the prop
  // to render the card without a chat shortcut.
  onOpenChat?: () => void;
}

const PreviousTripsCompressed: React.FC<PreviousTripsCompressedProps> = ({
  trip,
  onPress,
  onOpenChat,
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
      {/* Canonical RouteStack idiom — single source of truth for the
          start → end visual across every card surface in the app. */}
      <View style={styles.routeBlock}>
        <RouteStack
          tone="onForest"
          start={trip.start_location}
          end={trip.end_location}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <View style={styles.footerRight}>
          {onOpenChat ? (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={onOpenChat}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open chat for this trip"
            >
              <Image
                source={require("../assets/message-icon.png")}
                style={styles.chatIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : null}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>₹{trip.total_price}</Text>
          </View>
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
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    // Chat chip sits to the LEFT of the price so the price stays the
    // rightmost anchor — preserves the same visual rhythm as cards
    // that don't have a chat shortcut.
    gap: 8,
  },
  chatBtn: {
    // Ghost lime chip: lower visual weight than the solid price pill
    // so the price stays the headline. Same 28-ish height keeps both
    // chips baseline-aligned. Circular footprint (height = width)
    // because the icon doesn't need a label inside.
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(181,215,80,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatIcon: {
    width: 15,
    height: 15,
    tintColor: AppColors.primaryLightGreen,
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
