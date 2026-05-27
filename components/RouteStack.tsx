import React from "react";
import { View, Text, Image, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { useThemeColors } from "../contexts/ThemeContext";
import { displayRideLocation } from "../utils/LocationService";

const titleCaseLocation = (s: string): string =>
  s.replace(/(^|[\s,.'\-/(])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

// Every ride card, trip-card, history row, and chat-anchored route
// preview pipes through this component, so swallowing the legacy
// "Current location" string here is the cheapest place to fix it
// once for all of them. displayRideLocation maps the literal string
// to "Pickup point" before title-casing; everything else passes
// through untouched.
const displayLocation = (value: string | null | undefined, fallback: string) => {
  const cleaned = displayRideLocation(value);
  const label = cleaned.trim();
  return titleCaseLocation(label || fallback);
};


export type RouteStackProps = {
  start?: string | null;
  end?: string | null;
  tone?: "onForest" | "onLime";
  accentColor?: string;
  textColor?: string;
  numberOfLines?: number;
  compact?: boolean;
  startAccessory?: React.ReactNode;
  endAccessory?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle | TextStyle[];
};

const RouteStack: React.FC<RouteStackProps> = ({
  start,
  end,
  tone = "onForest",
  accentColor,
  textColor,
  numberOfLines = 1,
  compact = false,
  startAccessory,
  endAccessory,
  style,
  textStyle,
}) => {
  const colors = useThemeColors();
  // tone="onLime" — caller is painting onto the canvas / cream card.
  // tone="onForest" — caller is painting onto a dark/forest card
  // surface (the legacy selected RideCard fill, ActiveTripCard,
  // RideDetailsScreen forest panel). The forest surface stays dark
  // in BOTH themes, so the text/accent need to read as light text
  // on a dark fill regardless of mode.
  //
  // Accent (origin dot + destination arrow) used to default to lime
  // for the onForest tone — that pulled bright green into every
  // dark-mode trip card and read as "brand on dark" rather than
  // calm dark mode. In dark mode it now defaults to the same cream
  // text colour as the route text, so the icons and labels read as
  // one tonal family. Light mode is unchanged (still lime on
  // forest, matching history).
  const isOnForest = tone === "onForest";
  const resolvedAccent =
    accentColor ?? (isOnForest
      ? (colors.mode === "dark" ? "#FFFDF4" : colors.primary)
      : colors.textPrimary);
  const resolvedText =
    textColor ?? (tone === "onLime" ? colors.textPrimary : "#FFFDF4");

  const dashCount = compact ? 2 : 3;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <View
          style={[styles.startDot, { backgroundColor: resolvedAccent }]}
          accessibilityElementsHidden
        />
        <Text
          style={[styles.text, { color: resolvedText }, textStyle]}
          numberOfLines={numberOfLines}
          ellipsizeMode="tail"
        >
          {displayLocation(start, "Pickup not set")}
        </Text>
        {startAccessory ? <View style={styles.accessory}>{startAccessory}</View> : null}
      </View>

      <View style={[styles.connector, compact && styles.connectorCompact]}>
        {Array.from({ length: dashCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.connectorPill,
              { backgroundColor: resolvedAccent },
              compact && styles.connectorPillCompact,
            ]}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Image
          source={require("../assets/navigation-2.png")}
          style={[styles.arrow, { tintColor: resolvedAccent }]}
          resizeMode="contain"
        />
        <Text
          style={[styles.text, { color: resolvedText }, textStyle]}
          numberOfLines={numberOfLines}
          ellipsizeMode="tail"
        >
          {displayLocation(end, "Destination not set")}
        </Text>
        {endAccessory ? <View style={styles.accessory}>{endAccessory}</View> : null}
      </View>
    </View>
  );
};

export default RouteStack;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  arrow: {
    width: 18,
    height: 18,
    marginRight: 12,
  },
  connector: {
    // Left-align the dashed column under the centre of the start dot
    // (5 = (12 dot − 2 dash) / 2). Larger vertical margin so the
    // dashes have room to breathe between the start row and the end
    // row — the previous 6pt clamp made the connector read as a
    // single short smudge.
    marginLeft: 5,
    marginVertical: 10,
    alignItems: "flex-start",
  },
  connectorCompact: {
    marginVertical: 6,
  },
  connectorPill: {
    // Taller pills + bigger gap so the dashed pattern is actually
    // visible at glanceable size. Two-tone opacity (the colour is
    // resolved inline) keeps the accent grounded without screaming.
    width: 2.4,
    height: 6,
    borderRadius: 1.2,
    marginBottom: 4,
    opacity: 0.7,
  },
  connectorPillCompact: {
    height: 4,
    marginBottom: 3,
  },
  text: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15.5,
    letterSpacing: -0.15,
  },
  accessory: {
    marginLeft: 8,
  },
});
