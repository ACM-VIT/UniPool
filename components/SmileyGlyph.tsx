import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AppColors from "../design_systems/colors";

/**
 * Crisp inline-SVG smiley used by EmptyState surfaces ("No co-riders
 * yet", post-trip rating success, etc.). Replaces the old
 * `happy-emoji.png` raster, which pixelated hard on @3x screens. The
 * face uses the brand lime + forest pair; the soft outer halo lifts
 * it off the lime canvas without needing a card or shadow.
 */
type Props = {
  size?: number;
};

const SmileyGlyph: React.FC<Props> = ({ size = 140 }) => {
  // ViewBox is normalized to 100×100; the inner geometry never has
  // to change when the consumer picks a different size.
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Soft outer halo — same hue as the brand canvas but slightly
            warmer, lifts the face off the lime without a hard border. */}
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill={AppColors.primaryLightGreen}
          opacity={0.55}
        />
        {/* Forest face token — disc that hosts the features. */}
        <Circle cx={50} cy={50} r={36} fill={AppColors.secondaryDarkGreen} />
        {/* Cheek blush — subtle lime warmth, makes the face read
            friendly instead of stoic. */}
        <Circle cx={32} cy={58} r={4} fill={AppColors.primaryLightGreen} opacity={0.35} />
        <Circle cx={68} cy={58} r={4} fill={AppColors.primaryLightGreen} opacity={0.35} />
        {/* Closed eyes — two crescents arcing downward. Reads "smiling
            eyes" the way ^_^ does, fits the happy-emoji vibe. */}
        <Path
          d="M36 44 Q40 48 44 44"
          stroke={AppColors.primaryLightGreen}
          strokeWidth={3.4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M56 44 Q60 48 64 44"
          stroke={AppColors.primaryLightGreen}
          strokeWidth={3.4}
          strokeLinecap="round"
          fill="none"
        />
        {/* Mouth — gentle upward arc, not a goofy grin. */}
        <Path
          d="M38 60 Q50 70 62 60"
          stroke={AppColors.primaryLightGreen}
          strokeWidth={3.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default SmileyGlyph;
