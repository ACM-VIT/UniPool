import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import AppColors from "../design_systems/colors";

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
  title,
  body,
  ctaLabel,
  onPressCta,
  imageSize = 160,
  compact = false,
  topAlign = false,
}) => {
  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        topAlign && styles.wrapTopAlign,
      ]}
    >
      {image ? (
        <Image
          source={image}
          style={{ width: imageSize, height: imageSize, marginBottom: 18 }}
          resizeMode="contain"
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {ctaLabel && onPressCta ? (
        <TouchableOpacity
          style={styles.cta}
          onPress={onPressCta}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
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
