import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import type { Palette } from "../design_systems/palettes";
import PressableScale from "./PressableScale";

/**
 * Theme-aware sad-face glyph used in place of fixed-background raster assets
 * when dark mode is active.
 */
export const DarkEmptyGlyph: React.FC<{ size: number; colors: Palette }> = ({ size, colors }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Backdrop circle in the active surface tone. */}
      <Circle cx={50} cy={50} r={46} fill={colors.surface} />
      {/* Ring and face strokes follow the active text color. */}
      <Circle cx={50} cy={50} r={42} stroke={colors.textPrimary} strokeWidth={3.5} />
      {/* Eyes. */}
      <Circle cx={36} cy={42} r={3.2} fill={colors.textPrimary} />
      <Circle cx={64} cy={42} r={3.2} fill={colors.textPrimary} />
      {/* Frown. */}
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
 * Shared empty-state surface for lists and sections. Callers provide the copy,
 * optional illustration, and CTA handler.
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
  // Theme-aware text and CTA colors; layout stays in the static stylesheet.
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
        // Dark mode avoids fixed-background PNGs.
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
        <PressableScale
          style={[
            styles.cta,
            // Dark mode uses the same primary CTA contrast as other sheets.
            colors.mode === "dark" && { backgroundColor: colors.primary },
          ]}
          onPress={onPressCta}
        >
          <Text
            style={[
              styles.ctaLabel,
              colors.mode === "dark" && { color: colors.textOnAccent },
            ]}
          >
            {ctaLabel}
          </Text>
        </PressableScale>
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
