import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import AppColors from "../design_systems/colors";

type Props = {
  size?: number;
};

const SmileyGlyph: React.FC<Props> = ({ size = 140 }) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill={AppColors.primaryLightGreen}
          opacity={0.55}
        />
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
