import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import type { Palette } from "../design_systems/palettes";

/**
 * Theme-aware sad-face glyph used in place of the baked lime-tile
 * PNGs (no-rides-emoji, sad, etc.) when dark mode is active.
 * The PNGs carry a hardcoded lime background that shouts on the
 * dark canvas; this SVG paints into whichever palette is active so
 * the empty state stays a calm brand reference instead of a
 * bright lime square.
 */
export const DarkEmptyGlyph: React.FC<{ size: number; colors: Palette }> = ({ size, colors }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Subtle backdrop circle in the active surface tone — sits
          quietly on the canvas instead of competing with it. */}
      <Circle cx={50} cy={50} r={46} fill={colors.surface} />
      {/* Outline ring + face strokes in the active primary text
          colour so the glyph carries the palette voice without
          re-introducing lime as a fill. */}
      <Circle cx={50} cy={50} r={42} stroke={colors.textPrimary} strokeWidth={3.5} />
      {/* Eyes — small dots that read across the smile/sad family. */}
      <Circle cx={36} cy={42} r={3.2} fill={colors.textPrimary} />
      <Circle cx={64} cy={42} r={3.2} fill={colors.textPrimary} />
      {/* Frown — single arc, gentle dip. */}
      <Path
        d="M34 68 Q50 56 66 68"
        stroke={colors.textPrimary}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  </View>
);

/**
 * Shared "no data" surface used wherever a list or section has
 * nothing to show. Three things make it land emotionally:
 *   1. A real illustration (asset) instead of a bare title.
 *   2. A short, human one-liner — not "No data" or an HTTP code.
 *   3. An optional CTA that points the user at the next useful action.
 *
 * Variants come from passing different `image` / `title` / `body` /
 * `ctaLabel` props. Keep it dumb — no fetching, no navigation glue;
 * the caller wires onPress to whatever makes sense.
 */
export type EmptyStateProps = {
  /** Illustration above the title. Use `no-rides`, `happy-emoji`,
   *  `cool-emoji`, `sad`, `airplane` from `assets/`. */
  image?: ImageSourcePropType;
  /** Inline node — preferred over `image` when present. Use an SVG
   *  glyph for surfaces where the raster asset would pixelate at
   *  larger sizes (e.g. SmileyGlyph for the co-riders empty state). */
  glyph?: React.ReactNode;
  title: string;
  body?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  /** Optional override for image size — defaults to 160×160. */
  imageSize?: number;
  /** Tighten vertical padding on smaller surfaces (e.g. when the
   *  state lives inside a card rather than full-screen). */
  compact?: boolean;
  /** When true, the content sits in the upper portion of the
   *  available space instead of vertical-centering. Use this when
   *  there's decoration below (e.g. the BookingScreen airplane). */
  topAlign?: boolean;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  image,
  glyph,
  title,
  body,
  ctaLabel,
  onPressCta,
  imageSize = 160,
  compact = false,
  topAlign = false,
}) => {
  // Theme-aware text + CTA so empty states are readable on both
  // the lime canvas (light) and the charcoal canvas (dark). Module-
  // scope styles still carry layout + typography; inline overrides
  // below swap the colour tokens to whichever palette is active.
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        topAlign && styles.wrapTopAlign,
      ]}
    >
      {glyph ? (
        <View style={{ marginBottom: 18 }}>{glyph}</View>
      ) : colors.mode === "dark" && image ? (
        // Dark mode swaps every lime-tile PNG (no-rides-emoji, sad,
        // happy-emoji, cool-emoji, smiling-emoji) for the
        // theme-aware DarkEmptyGlyph — the brand voice in dark mode
        // shouldn't be a bright lime square; this glyph reads as a
        // calm tonal echo of the canvas.
        <View style={{ marginBottom: 18 }}>
          <DarkEmptyGlyph size={imageSize} colors={colors} />
        </View>
      ) : image ? (
        <Image
          source={image}
          style={{ width: imageSize, height: imageSize, marginBottom: 18 }}
          resizeMode="contain"
        />
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
          {body}
        </Text>
      ) : null}
      {ctaLabel && onPressCta ? (
        <TouchableOpacity
          style={[
            styles.cta,
            // Light: forest pill + lime label (the historical brand
            // pairing — module-scope handles it). Dark: lime pill +
            // forest ink, mirroring the PassengerProfileSheet Accept
            // button so primary CTAs share one recognisable
            // affordance across the app. The previous navFill +
            // 45%-opacity cream label read as a near-invisible chip
            // on the charcoal canvas.
            colors.mode === "dark" && { backgroundColor: colors.primary },
          ]}
          onPress={onPressCta}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.ctaLabel,
              colors.mode === "dark" && { color: colors.textOnAccent },
            ]}
          >
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 36,
  },
  wrapCompact: {
    flex: 0,
    paddingTop: 32,
    paddingBottom: 24,
  },
  // Anchor content to the upper portion of the available space so
  // anything decorative below (e.g. the BookingScreen airplane) has
  // breathing room. Use this when there's something behind / below
  // the empty state that needs to stay visible.
  wrapTopAlign: {
    justifyContent: "flex-start",
    paddingTop: 56,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 20,
  },
  cta: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  ctaLabel: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default EmptyState;
