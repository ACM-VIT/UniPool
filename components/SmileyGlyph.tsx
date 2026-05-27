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
  // forest-disc + lime-strokes pairing — sleepy-smile with cheek
  // dots, the brand's friendly empty-state mascot. Dark mode would
  // re-read those same elements as a creepy mask: a nearly invisible
  // disc on the charcoal canvas, with cheek dots that become "extra
  // eyes" and closed-eye arcs that read like stitches. So in dark we
  // redraw the face with a clearly-elevated disc + simple dot eyes
  // and drop the cheek dots, which gives a calm "open-eyed smile"
  // that still feels welcoming.
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";

  if (isDark) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          {/* Soft cream halo at low alpha — replaces the lime halo
              from light mode so the disc reads as raised on the
              canvas without the brand splash. */}
          <Circle cx={50} cy={50} r={48} fill={colors.textPrimary} opacity={0.04} />
          {/* Disc — bumped to surfaceElevated so it sits clearly
              above the canvas instead of disappearing into it. */}
          <Circle cx={50} cy={50} r={36} fill={colors.surfaceElevated} />
          {/* Hairline border to ground the disc against the canvas. */}
          <Circle
            cx={50}
            cy={50}
            r={36}
            stroke={colors.textPrimary}
            strokeOpacity={0.10}
            strokeWidth={1}
            fill="none"
          />
          {/* Simple open eyes — no closed-arc stitches, no cheek
              dots — friendly, unambiguous. */}
          <Circle cx={40} cy={46} r={3.2} fill={colors.textPrimary} />
          <Circle cx={60} cy={46} r={3.2} fill={colors.textPrimary} />
          {/* Smile — same curve as light mode, in cream. */}
          <Path
            d="M38 60 Q50 70 62 60"
            stroke={colors.textPrimary}
            strokeWidth={3.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Circle cx={50} cy={50} r={48} fill={AppColors.primaryLightGreen} opacity={0.55} />
        <Circle cx={50} cy={50} r={36} fill={AppColors.secondaryDarkGreen} />
        <Circle cx={32} cy={58} r={4} fill={AppColors.primaryLightGreen} opacity={0.35} />
        <Circle cx={68} cy={58} r={4} fill={AppColors.primaryLightGreen} opacity={0.35} />
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
