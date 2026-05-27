import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

type Props = {
  size?: number;
};

const SmileyGlyph: React.FC<Props> = ({ size = 140 }) => {
  // Theme-aware glyph. Light mode keeps the historical lime-halo +
  // forest-disc + lime-strokes pairing. Dark mode drops the lime
  // halo (which read as "green brand on dark") and paints the face
  // in neutral cream strokes on a calm raised-charcoal disc — so
  // the empty-state SmileyGlyph fits the dark palette the same way
  // the DarkEmptyGlyph fits empty-state lists.
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";
  const haloFill = isDark ? colors.surface : AppColors.primaryLightGreen;
  const haloOpacity = isDark ? 0.0 : 0.55; // halo hidden in dark
  const faceFill = isDark ? colors.surface : AppColors.secondaryDarkGreen;
  const featureColor = isDark ? colors.textPrimary : AppColors.primaryLightGreen;
  const cheekOpacity = isDark ? 0.5 : 0.35;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill={haloFill}
          opacity={haloOpacity}
        />
        <Circle cx={50} cy={50} r={36} fill={faceFill} />
        <Circle cx={32} cy={58} r={4} fill={featureColor} opacity={cheekOpacity} />
        <Circle cx={68} cy={58} r={4} fill={featureColor} opacity={cheekOpacity} />
        <Path
          d="M36 44 Q40 48 44 44"
          stroke={featureColor}
          strokeWidth={3.4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M56 44 Q60 48 64 44"
          stroke={featureColor}
          strokeWidth={3.4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M38 60 Q50 70 62 60"
          stroke={featureColor}
          strokeWidth={3.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default SmileyGlyph;
