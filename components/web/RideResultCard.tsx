// Full-width ride card for the list-first search results. Carpool
// inventory is sparse, so the product is a readable LIST (BlaBlaCar /
// Booking / Uber "choose a ride"), not a map of pins. Each card leads
// with the route and price, with the time, host, and seats beneath.
import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { WEB, RADIUS, FONT } from "./theme";

type Props = {
  origin: string;
  destination: string;
  dateLabel: string;
  timeLabel: string;
  seatsLabel: string;
  price: number;
  hostName?: string;
  hostPhoto?: string | null;
  onPress?: () => void;
};

const RideResultCard: React.FC<Props> = ({ origin, destination, dateLabel, timeLabel, seatsLabel, price, hostName, hostPhoto, onPress }) => {
  const [hover, setHover] = useState(false);
  const host = (hostName || "").trim();
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={[styles.card, hover && styles.cardHover]}
      accessibilityRole="button"
    >
      <View style={styles.top}>
        <Text style={styles.when}>{dateLabel} {"·"} {timeLabel}</Text>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{"₹"}{price}</Text>
          <Text style={styles.per}>per seat</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.rail}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={styles.square} />
        </View>
        <View style={styles.labels}>
          <Text style={styles.stop} numberOfLines={1}>{origin}</Text>
          <Text style={styles.stop} numberOfLines={1}>{destination}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.hostRow}>
          {hostPhoto ? (
            <Image source={{ uri: hostPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{(host || "U").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {host ? <Text style={styles.hostName} numberOfLines={1}>{host}</Text> : <Text style={styles.hostName}>Student host</Text>}
        </View>
        <Text style={styles.seats}>{seatsLabel}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WEB.hairline,
  },
  cardHover: { borderColor: WEB.forest },

  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  when: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.inkMuted, paddingTop: 4 },
  priceCol: { alignItems: "flex-end" },
  price: { fontFamily: FONT.black, fontSize: 20, color: WEB.forest },
  per: { fontFamily: FONT.semibold, fontSize: 12, color: WEB.inkMuted, marginTop: 1 },

  routeRow: { flexDirection: "row", gap: 14 },
  rail: { alignItems: "center", paddingVertical: 5 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: WEB.forest },
  line: { width: 2, flex: 1, minHeight: 22, backgroundColor: WEB.inkLine, marginVertical: 4 },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: WEB.forest },
  labels: { flex: 1, justifyContent: "space-between", paddingVertical: 1 },
  stop: { fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, marginVertical: 4, letterSpacing: -0.2 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: WEB.hairline },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1, minWidth: 0 },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  avatarFallback: { width: 26, height: 26, borderRadius: 13, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: FONT.black, fontSize: 12, color: WEB.lime },
  hostName: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkStrong, flexShrink: 1 },
  seats: { fontFamily: FONT.bold, fontSize: 13, color: WEB.midOlive },
});

export default RideResultCard;
