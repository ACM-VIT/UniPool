import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ImageStyle,
} from "react-native";
import PressableScale from "./PressableScale";
import RouteStack from "./RouteStack";
import { useThemeColors } from "../contexts/ThemeContext";
import type { ExternalRide } from "../utils/ExternalRideService";
import { dialPhone } from "../utils/ExternalRideService";

const clockIcon = require("../assets/clock.png");
const calendarIcon = require("../assets/calendar.png");

const { width } = Dimensions.get("window");
const wp = (pct: number) => (width * pct) / 100;

const formatDeparture = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: "", date: "" };
  return {
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
  };
};

interface Props {
  ride: ExternalRide;
}

const ExternalRideCard: React.FC<Props> = ({ ride }) => {
  const colors = useThemeColors();
  const { time, date } = useMemo(() => formatDeparture(ride.departure_time), [ride.departure_time]);
  const hasPhone = !!ride.host_phone;
  const displayName = ride.host_name.replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "");

  const cardBg = colors.mode === "dark" ? colors.surface : "#FFFFFF";
  const textColor = colors.textPrimary;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.inkSoft }]}>
      <View style={styles.topRow}>
        <View style={styles.routeArea}>
          <RouteStack
            tone="onLime"
            start={ride.pickup_point}
            end={ride.destination}
            compact
          />
        </View>

        <View style={styles.detailCol}>
          <View style={styles.detailRow}>
            <Image
              source={clockIcon}
              style={[styles.icon, { tintColor: textColor }]}
              resizeMode="contain"
            />
            <Text style={[styles.detailText, { color: textColor }]}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Image
              source={calendarIcon}
              style={[styles.icon, { tintColor: textColor }]}
              resizeMode="contain"
            />
            <Text style={[styles.detailText, { color: textColor }]}>{date}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {ride.vehicle_type}
        </Text>
        <Text style={[styles.metaDot, { color: colors.textDisabled }]}>&middot;</Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {ride.available_seats} seat{ride.available_seats !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.hostInfo}>
          <Text style={[styles.hostName, { color: textColor }]} numberOfLines={1}>
            Hosted by {displayName}
          </Text>
        </View>

        {hasPhone ? (
          <PressableScale
            style={[styles.callButton, { backgroundColor: colors.secondary }]}
            onPress={() => dialPhone(ride.host_phone)}
            haptic="medium"
          >
            <Text style={[styles.callButtonText, { color: colors.mode === "dark" ? colors.textOnAccent : colors.textOnDark }]}>Call</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
};

export default React.memo(ExternalRideCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: wp(3),
    padding: wp(4),
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  routeArea: {
    flex: 1,
    marginRight: wp(2),
  },
  detailCol: {
    flexDirection: "column",
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    width: 14,
    height: 14,
  } as ImageStyle,
  detailText: {
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
  },
  metaDot: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostInfo: {
    flex: 1,
    marginRight: 12,
  },
  hostName: {
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.1,
  },
  callButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callButtonText: {
    fontSize: 14,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },
});
