import React from "react";
import { View, Text, Image, StyleSheet, TextStyle, ViewStyle } from "react-native";
import AppColors from "../design_systems/colors";

/**
 * Cap the first letter of every word, leaving already-capitalised
 * letters alone. The geocoder sometimes returns secondary segments
 * lowercased ("VIT University, vellore", "Kempegowda Airport,
 * bangalore"), and this fixes the casing at the display layer
 * without touching "VIT", "ACM", or other intentionally-uppercase
 * tokens already in the string. Word boundary is start-of-string
 * or any of [whitespace , . ' - / (], which is broad enough to
 * handle place names with punctuation like "St. Peter's" or "Port-
 * au-Prince" without mangling.
 */
const titleCaseLocation = (s: string): string =>
  s.replace(/(^|[\s,.'\-/(])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

/**
 * Canonical start → end route block used wherever the app shows
 * a from / to pair: trip cards, chat list rows, post-trip cards,
 * the ride-details hero, pending-DM headers, etc. Replaces the
 * mishmash of one-off implementations (outlined/filled twin dots,
 * horizontal pip-pip-pip connectors, lone arrow icons) that were
 * drifting independently across the codebase.
 *
 * Visual idiom (matches the polished RideDetailsScreen card):
 *   • Start: small filled circle in `accentColor`
 *   • Connector: vertical dashed line — three small pills in
 *     `accentColor` at 55% opacity, stacked
 *   • End:    navigation arrow glyph (assets/navigation-2.png)
 *             tinted in `accentColor`
 *
 * Two visual variants ship out of the box via `tone`:
 *   • "onForest" → lime icons + white text (use on dark / forest
 *     surfaces like the ride card)
 *   • "onLime"   → forest icons + forest text (use on the lime
 *     canvas or any cream / white surface)
 *
 * Override either color individually with `accentColor` /
 * `textColor` if you need something custom (e.g. coral on a
 * pending-request peach card).
 */
export type RouteStackProps = {
  start: string;
  end: string;
  /** Pre-baked color pair. Defaults to onForest. */
  tone?: "onForest" | "onLime";
  /** Override the icon + connector hue (otherwise derived from tone). */
  accentColor?: string;
  /** Override the location text colour (otherwise derived from tone). */
  textColor?: string;
  /** Cap each row at this many lines. Default 1. */
  numberOfLines?: number;
  /** Tighten the connector for compact rows (chat list, etc). */
  compact?: boolean;
  /** Slot extra content next to the start row (e.g. a chip). */
  startAccessory?: React.ReactNode;
  /** Slot extra content next to the end row (e.g. an ETA chip). */
  endAccessory?: React.ReactNode;
  style?: ViewStyle;
  /** Override the location text style entirely (e.g. smaller font on chat cards). */
  textStyle?: TextStyle;
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
  const resolvedAccent =
    accentColor ?? (tone === "onLime" ? AppColors.secondaryDarkGreen : AppColors.primaryLightGreen);
  const resolvedText =
    textColor ?? (tone === "onLime" ? AppColors.secondaryDarkGreen : AppColors.basicWhite);

  // Connector pills — small rounded rectangles stacked vertically
  // for a clean dashed look at any density (RN's native dashed
  // border + Polyline pattern aren't great inside View hierarchies).
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
          {titleCaseLocation(start)}
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
          {titleCaseLocation(end)}
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
