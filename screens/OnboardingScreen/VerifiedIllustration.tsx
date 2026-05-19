import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import AppColors from "../../design_systems/colors";

type Props = {
  size: number;
};

/**
 * "Verified, every trip" hero. A simple stamped seal — forest outline
 * shield with a chunky lime check inside, sitting on a soft brand halo.
 *
 * Reads instantly as "verified" without leaning on ratings or any
 * other feature we don't ship today. No animation — the slide is
 * declarative, not playful, so keeping it still feels more confident.
 */
const VerifiedIllustration: React.FC<Props> = ({ size }) => {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <LinearGradient id="halo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={AppColors.primaryLightGreen} stopOpacity={0.45} />
            <Stop offset="1" stopColor={AppColors.primaryLightGreen} stopOpacity={0.10} />
          </LinearGradient>
        </Defs>

        {/* Soft halo behind the seal — anchors it on the white slide
            without a hard rim. */}
        <Circle cx={120} cy={120} r={110} fill="url(#halo)" />

        {/* Forest seal — classic shield silhouette. Slightly rounded
            corners for a contemporary feel; chunky stroke instead of a
            fill so it reads as a "stamp" outline. */}
        <Path
          d="
            M 120 38
            C 152 38 178 48 198 56
            L 198 116
            C 198 168 168 196 120 210
            C 72 196 42 168 42 116
            L 42 56
            C 62 48 88 38 120 38
            Z
          "
          fill={AppColors.secondaryDarkGreen}
        />

        {/* Inner shape — slightly inset, lime, gives the seal a
            two-tone "outline" effect without the SVG actually being
            stroked. */}
        <Path
          d="
            M 120 56
            C 148 56 170 64 188 70
            L 188 116
            C 188 162 162 184 120 196
            C 78 184 52 162 52 116
            L 52 70
            C 70 64 92 56 120 56
            Z
          "
          fill={AppColors.primaryLightGreen}
        />

        {/* Forest checkmark — the entire meaning of the illustration
            in one stroke. Heavy weight + round caps so it lands as a
            confident mark, not a tick on a checklist. */}
        <Path
          d="M 78 120 L 108 150 L 168 88"
          stroke={AppColors.secondaryDarkGreen}
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default VerifiedIllustration;
