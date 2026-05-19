import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import AppColors from "../design_systems/colors";

type Props = {
  origin: string;
  destination: string;
  startTime: Date;
  hostName?: string;
  hostAvatarUrl?: string | null;
  isHost?: boolean;
  /** Open the ride's group chat. */
  onChat?: () => void;
  /** Open the ride detail screen — usually wired to navigation. */
  onOpen?: () => void;
};

/**
 * "Up next" hero card shown at the top of the Trips screen when the user
 * has a confirmed booking or hosted ride starting within the next ~6 hours.
 *
 * Lifted from the Uber Activity / Freenow "In progress" pattern but
 * styled to match UniPool's warm-illustrative brand.
 */
const UpNextCard: React.FC<Props> = ({
  origin,
  destination,
  startTime,
  hostName,
  isHost,
  onChat,
  onOpen,
}) => {
  const countdown = humanCountdown(startTime);
  const dateLabel = formatDateLabel(startTime);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onOpen} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.label}>
          <View style={styles.pulse} />
          <Text style={styles.labelText}>UP NEXT</Text>
        </View>
        <Text style={styles.countdownText}>{countdown}</Text>
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { borderColor: AppColors.primaryLightGreen }]} />
          <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">
            {origin}
          </Text>
        </View>
        <View style={styles.connector}>
          <View style={styles.connectorDot} />
          <View style={styles.connectorDot} />
          <View style={styles.connectorDot} />
        </View>
        <View style={styles.routeRow}>
          <View style={[styles.routeDotFilled, { backgroundColor: AppColors.primaryLightGreen }]} />
          <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">
            {destination}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{dateLabel}</Text>
        {hostName ? (
          <Text style={styles.metaText}>
            {isHost ? "You're hosting" : `Hosted by ${firstName(hostName)}`}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnGhost]}
          activeOpacity={0.85}
          onPress={onChat}
        >
          <Text style={styles.actionBtnGhostText}>Open chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFilled]}
          activeOpacity={0.85}
          onPress={onOpen}
        >
          <Text style={styles.actionBtnFilledText}>View ride</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const firstName = (full: string) => (full ? full.split(" ")[0] : "");

const humanCountdown = (target: Date): string => {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Started";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `In ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 24) {
    return rest > 0 ? `In ${hours}h ${rest}m` : `In ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
};

const formatDateLabel = (d: Date): string => {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today · ${timeStr}`;
  if (isTomorrow) return `Tomorrow · ${timeStr}`;
  const dayStr = d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  return `${dayStr} · ${timeStr}`;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  label: { flexDirection: "row", alignItems: "center" },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 8,
  },
  labelText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: AppColors.primaryLightGreen,
  },
  countdownText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: AppColors.basicWhite,
    letterSpacing: -0.2,
  },
  routeBlock: { marginBottom: 14 },
  routeRow: { flexDirection: "row", alignItems: "center" },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginRight: 12,
    backgroundColor: "transparent",
  },
  routeDotFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  connector: {
    paddingLeft: 4,
    paddingVertical: 4,
  },
  connectorDot: {
    width: 2,
    height: 3,
    marginVertical: 1,
    borderRadius: 1,
    backgroundColor: "rgba(181,215,80,0.55)",
    marginLeft: 0,
  },
  routeText: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: AppColors.basicWhite,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnGhost: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  actionBtnGhostText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.basicWhite,
    letterSpacing: 0.1,
  },
  actionBtnFilled: {
    backgroundColor: AppColors.primaryLightGreen,
  },
  actionBtnFilledText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.1,
  },
});

export default UpNextCard;
