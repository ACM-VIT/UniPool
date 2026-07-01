// Full-width ride card for the list-first search results. A cream surface
// floating on the lime canvas — the same relationship the mobile app uses —
// leading with the route and a lime price pill (the app's ₹ pill), with a
// playful little vehicle tucked in the corner (mirrors the mobile ride cards
// and the unipool-webapp reference).
import React, { useRef } from "react";
import { View, Text, Image, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { WEB, RADIUS, FONT, cardFloat } from "./theme";

// Vehicle-by-seats + the wheel-clip trick are copied from the mobile
// RideCard (components/RideCard.tsx): the PNGs are 255×271 with ~28%
// transparent padding top/bottom, so the image is rendered larger than
// its wrapper and pushed below it; the card's overflow:hidden clips the
// bottom strip so the wheels rest flush on the card's bottom edge.
const getVehicle = (seats: number) => {
  if (seats <= 2) return require("../../assets/motorcycle.png");
  if (seats === 3) return require("../../assets/Taxi.png");
  if (seats === 4) return require("../../assets/racer.png");
  if (seats < 8) return require("../../assets/wagon.png");
  if (seats < 11) return require("../../assets/foodvan.png");
  return require("../../assets/Bus.png");
};

type Props = {
  origin: string;
  destination: string;
  dateLabel: string;
  timeLabel: string;
  seatsLabel: string;
  price?: number;
  hostName?: string;
  hostPhoto?: string | null;
  seats?: number;
  onPress?: () => void;
};

const RideResultCard: React.FC<Props> = ({ origin, destination, dateLabel, timeLabel, seatsLabel, price, hostName, hostPhoto, seats = 4, onPress }) => {
  const lift = useRef(new Animated.Value(0)).current;
  const animate = (to: number) =>
    Animated.timing(lift, { toValue: to, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  const host = (hostName || "").trim();
  const vehicle = getVehicle(seats);

  return (
    <Animated.View
      style={[
        styles.shadow,
        { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => animate(1)}
        onHoverOut={() => animate(0)}
        style={({ hovered }: any) => [styles.card, hovered && styles.cardHover]}
        accessibilityRole="button"
      >
        <View style={styles.vehicleWrap} pointerEvents="none">
          <Image source={vehicle} style={styles.vehicleImg} resizeMode="contain" />
        </View>

        <View style={styles.top}>
          <Text style={styles.when}>{dateLabel} {"·"} {timeLabel}</Text>
          <View style={styles.priceCol}>
            {typeof price === "number" ? (
              <View style={styles.pricePill}>
                <Text style={styles.priceCurrency}>{"₹"}</Text>
                <Text style={styles.price}>{price}</Text>
                <Text style={styles.per}>/seat</Text>
              </View>
            ) : (
              // External rides carry no set fare (you arrange it with the host),
              // so fill the price slot with a muted chip rather than leaving the
              // card's top-right empty and unbalanced.
              <View style={styles.askPill}>
                <Text style={styles.askText}>Ask host</Text>
              </View>
            )}
            <Text style={styles.seats}>{seatsLabel}</Text>
          </View>
        </View>

        <View style={styles.route}>
          {/* Connecting line sits behind, between the two markers. */}
          <View style={styles.routeLine} />
          <View style={styles.routeStop}>
            <View style={styles.markerCol}><View style={styles.dot} /></View>
            <Text style={styles.stop} numberOfLines={1}>{origin}</Text>
          </View>
          <View style={[styles.routeStop, styles.routeStopBottom]}>
            <View style={styles.markerCol}><View style={styles.square} /></View>
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
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadow: { borderRadius: RADIUS.card, ...cardFloat },
  card: {
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 20,
    borderWidth: 1,
    borderColor: WEB.hairline,
    overflow: "hidden",
  },
  cardHover: { borderColor: "rgba(38,59,51,0.18)" },

  vehicleWrap: { position: "absolute", right: 2, bottom: 0, width: 138, height: 74, overflow: "hidden" },
  vehicleImg: { position: "absolute", right: 0, bottom: -42, width: 138, height: 146 },

  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  when: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.inkMuted, paddingTop: 5 },
  priceCol: { alignItems: "flex-end", gap: 5 },
  pricePill: { flexDirection: "row", alignItems: "baseline", backgroundColor: WEB.lime, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 6 },
  priceCurrency: { fontFamily: FONT.black, fontSize: 13, color: WEB.forest, marginRight: 1 },
  price: { fontFamily: FONT.black, fontSize: 18, color: WEB.forest, letterSpacing: -0.3 },
  per: { fontFamily: FONT.bold, fontSize: 11.5, color: WEB.forest, opacity: 0.7, marginLeft: 2 },
  // Muted counterpart to the lime price pill, for rides with no set fare.
  askPill: { backgroundColor: WEB.inkSubtle, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 7 },
  askText: { fontFamily: FONT.bold, fontSize: 13, color: WEB.inkStrong, letterSpacing: -0.1 },
  seats: { fontFamily: FONT.bold, fontSize: 12.5, color: WEB.midOlive },

  route: { position: "relative" },
  // Vertical connector pinned to the marker column, between the two markers.
  routeLine: { position: "absolute", left: 5, top: 17, bottom: 17, width: 2, backgroundColor: WEB.inkLine },
  routeStop: { flexDirection: "row", alignItems: "center", gap: 14 },
  routeStopBottom: { marginTop: 16 },
  markerCol: { width: 12, alignItems: "center" },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: WEB.forest },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: WEB.forest },
  stop: { flex: 1, fontFamily: FONT.bold, fontSize: 16, lineHeight: 22, color: WEB.forest, letterSpacing: -0.2 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: WEB.hairline },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1, minWidth: 0 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: FONT.black, fontSize: 12, color: WEB.lime },
  hostName: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkStrong, flexShrink: 1 },
});

export default RideResultCard;
