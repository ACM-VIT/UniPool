import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Path,
  Rect,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Ellipse,
} from "react-native-svg";
import AppColors from "../../design_systems/colors";

const LIME = AppColors.primaryLightGreen;
const FOREST = AppColors.secondaryDarkGreen;
const WHITE = AppColors.basicWhite;

export const SaveMoneyIllustration: React.FC<{ size: number }> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="halo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.16" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="160" cy="170" r="130" fill="url(#halo)" />

      {/* Road */}
      <Path
        d="M30 250 L 290 250"
        stroke={WHITE}
        strokeOpacity="0.28"
        strokeWidth="2"
        strokeDasharray="6 10"
        fill="none"
      />

      {/* Car body */}
      <G>
        <Rect x="78" y="148" width="164" height="62" rx="18" fill={LIME} />
        <Path d="M104 148 L 124 116 H 216 L 236 148 Z" fill={LIME} />
        {/* Window separator strut */}
        <Path d="M168 116 V 148" stroke={FOREST} strokeWidth="2.2" opacity="0.25" />
        {/* Windows */}
        <Path d="M128 122 H 164 L 162 144 H 130 Z" fill={WHITE} opacity="0.55" />
        <Path d="M174 122 H 210 L 212 144 H 174 Z" fill={WHITE} opacity="0.55" />
        {/* Door line */}
        <Path d="M160 150 V 210" stroke={FOREST} strokeWidth="1.6" opacity="0.25" />
        {/* Wheels */}
        <Circle cx="118" cy="218" r="20" fill={FOREST} />
        <Circle cx="118" cy="218" r="8" fill={LIME} />
        <Circle cx="222" cy="218" r="20" fill={FOREST} />
        <Circle cx="222" cy="218" r="8" fill={LIME} />
        {/* Headlight */}
        <Rect x="234" y="172" width="8" height="10" rx="2" fill={WHITE} opacity="0.7" />
      </G>

      {/* Rupee coin (top-left) */}
      <G>
        <Circle cx="74" cy="92" r="26" fill={LIME} />
        <Circle cx="74" cy="92" r="26" fill="none" stroke={FOREST} strokeWidth="2" opacity="0.18" />
        {/* ₹ glyph constructed from three strokes + diagonal */}
        <Path
          d="M64 80 H 86 M64 88 H 86 M64 80 Q 82 80 82 90 Q 82 100 70 100 H 66 L 84 110"
          stroke={FOREST}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>

      {/* Small coins floating */}
      <G>
        <Circle cx="252" cy="78" r="13" fill={WHITE} opacity="0.92" />
        <Circle cx="252" cy="78" r="13" fill="none" stroke={FOREST} strokeWidth="1.5" opacity="0.25" />
        <Path d="M248 73 H 256 M248 78 H 256 M250 73 Q 256 73 256 79 Q 256 84 251 84 L 256 88" stroke={FOREST} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </G>
      <G>
        <Circle cx="276" cy="132" r="9" fill={WHITE} opacity="0.85" />
        <Path d="M273 129 H 279 M273 132 H 279 M274 129 Q 279 129 279 133 Q 279 136 275 136 L 279 139" stroke={FOREST} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </G>
    </Svg>
  </View>
);

export const CommunityIllustration: React.FC<{ size: number }> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="halo2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.15" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="160" cy="170" r="130" fill="url(#halo2)" />
      <Path
        d="M64 230 Q 160 110, 256 230"
        stroke={LIME}
        strokeOpacity="0.6"
        strokeWidth="2.5"
        strokeDasharray="6 10"
        fill="none"
      />
      <G>
        <Circle cx="64" cy="230" r="38" fill={LIME} />
        <Circle cx="64" cy="216" r="11" fill={FOREST} />
        <Path d="M44 244 Q 64 226, 84 244 V 252 Q 64 260, 44 252 Z" fill={FOREST} />
      </G>
      <G>
        <Circle cx="160" cy="110" r="44" fill={WHITE} />
        <Circle cx="160" cy="94" r="13" fill={FOREST} />
        <Path d="M136 126 Q 160 104, 184 126 V 136 Q 160 146, 136 136 Z" fill={FOREST} />
      </G>
      <G>
        <Circle cx="256" cy="230" r="38" fill={LIME} />
        <Circle cx="256" cy="216" r="11" fill={FOREST} />
        <Path d="M236 244 Q 256 226, 276 244 V 252 Q 256 260, 236 252 Z" fill={FOREST} />
      </G>
      <Circle cx="64" cy="230" r="46" fill="none" stroke={WHITE} strokeOpacity="0.18" strokeWidth="2" />
      <Circle cx="160" cy="110" r="52" fill="none" stroke={WHITE} strokeOpacity="0.18" strokeWidth="2" />
      <Circle cx="256" cy="230" r="46" fill="none" stroke={WHITE} strokeOpacity="0.18" strokeWidth="2" />
    </Svg>
  </View>
);

export const TrustIllustration: React.FC<{ size: number }> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="halo3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.22" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx="160" cy="160" r="140" fill="url(#halo3)" />
      <G>
        <Rect x="56" y="110" width="208" height="130" rx="18" fill={FOREST} />
        <Rect x="56" y="110" width="208" height="32" rx="18" fill={LIME} />
        <Rect x="56" y="124" width="208" height="18" fill={LIME} />
        <Circle cx="100" cy="180" r="22" fill={LIME} />
        <Circle cx="100" cy="174" r="7" fill={FOREST} />
        <Path d="M86 192 Q 100 180, 114 192 V 198 Q 100 204, 86 198 Z" fill={FOREST} />
        <Rect x="138" y="166" width="100" height="8" rx="4" fill={WHITE} opacity="0.85" />
        <Rect x="138" y="182" width="74" height="6" rx="3" fill={WHITE} opacity="0.45" />
        <Rect x="138" y="196" width="86" height="6" rx="3" fill={WHITE} opacity="0.45" />
      </G>
      <G>
        <Circle cx="232" cy="100" r="34" fill={LIME} />
        <Circle cx="232" cy="100" r="34" fill="none" stroke={WHITE} strokeWidth="3" />
        <Path
          d="M218 102 L 228 112 L 248 90"
          stroke={FOREST}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
      <G>
        {[0, 1, 2, 3, 4].map((i) => (
          <Path
            key={i}
            d={`M${112 + i * 22} 268 l3.6 7.4 l8.2 1.2 l-5.9 5.8 l1.4 8.2 l-7.3 -3.8 l-7.3 3.8 l1.4 -8.2 l-5.9 -5.8 l8.2 -1.2 z`}
            fill={LIME}
          />
        ))}
      </G>
    </Svg>
  </View>
);
