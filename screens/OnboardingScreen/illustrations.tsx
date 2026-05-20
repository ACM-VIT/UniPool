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
} from "react-native-svg";
import AppColors from "../../design_systems/colors";

/**
 * Onboarding hero illustrations. All three share one design language:
 *   - Lime + forest + white palette only.
 *   - 320×320 viewBox so they slot into identical containers on every
 *     slide and the parallax / fade animations stay symmetric.
 *   - A soft lime radial halo behind the focal element so the hero
 *     reads "stamped" against the forest dark slide surface without a
 *     hard edge.
 *   - The route-dot vocabulary (outlined → filled with a dotted
 *     connector) used everywhere else in the app, so the panels feel
 *     like part of the product, not stock imagery.
 *
 * Build new ones by mirroring `paneFrame` + the halo + a single
 * focal element. Anything more crowded and the slide reads busy.
 */

const LIME = AppColors.primaryLightGreen;
const FOREST = AppColors.secondaryDarkGreen;
const WHITE = AppColors.basicWhite;
const FOREST_DEEP = "#1B2C26";

type IllustrationProps = { size: number };

/* -------------------------------------------------------------------
 * Slide 1 — "Carpools going your way."
 * A route: outlined origin pin + filled destination pin connected by
 * a dotted lime arc, with a small lime car silhouette traveling
 * along it. Uses the same route-dot idiom as RideCard.
 * ----------------------------------------------------------------- */
export const RouteHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="haloRoute" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.22" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft brand halo */}
      <Circle cx="160" cy="170" r="138" fill="url(#haloRoute)" />

      {/* Dotted route arc connecting origin → destination */}
      <Path
        d="M 70 230 Q 160 60, 250 230"
        stroke={LIME}
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 12"
        fill="none"
      />

      {/* Origin — outlined route dot, lime ring on dark */}
      <Circle cx="70" cy="230" r="18" fill={FOREST_DEEP} />
      <Circle
        cx="70"
        cy="230"
        r="13"
        fill="none"
        stroke={LIME}
        strokeWidth="4"
      />

      {/* Destination — filled lime pin with classic teardrop tail */}
      <Path
        d="M 250 198 Q 274 198, 274 222 Q 274 240, 250 268 Q 226 240, 226 222 Q 226 198, 250 198 Z"
        fill={LIME}
      />
      <Circle cx="250" cy="222" r="8" fill={FOREST} />

      {/* Travelling car — sits at the apex of the arc, lime body */}
      <G>
        {/* Soft shadow */}
        <Path
          d="M 116 132 H 204 V 142 H 116 Z"
          fill={FOREST_DEEP}
          opacity="0.4"
        />
        {/* Body */}
        <Rect x="118" y="100" width="84" height="36" rx="12" fill={LIME} />
        {/* Cabin */}
        <Path d="M 134 100 L 146 78 H 178 L 192 100 Z" fill={LIME} />
        {/* Windshield + window */}
        <Path d="M 140 100 L 150 84 H 162 V 100 Z" fill={WHITE} opacity="0.55" />
        <Path d="M 166 84 H 176 L 184 100 H 166 Z" fill={WHITE} opacity="0.55" />
        {/* Wheels */}
        <Circle cx="138" cy="138" r="10" fill={FOREST} />
        <Circle cx="138" cy="138" r="4" fill={LIME} />
        <Circle cx="182" cy="138" r="10" fill={FOREST} />
        <Circle cx="182" cy="138" r="4" fill={LIME} />
      </G>
    </Svg>
  </View>
);

/* -------------------------------------------------------------------
 * Slide 2 — "Pay your share. Simply."
 * Two seat tiles + a single rupee glyph (the per-seat fare) sitting
 * inside a forest-dark "receipt" card with a torn-edge bottom. Reads
 * as: posted price, split per seat, paid simply via UPI.
 * ----------------------------------------------------------------- */
export const FairPriceHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="haloFair" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.22" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="160" cy="160" r="140" fill="url(#haloFair)" />

      {/* Receipt card with torn bottom edge */}
      <G>
        <Path
          d="
            M 64 76
            H 256
            V 226
            L 244 220 L 232 226 L 220 220 L 208 226
            L 196 220 L 184 226 L 172 220 L 160 226
            L 148 220 L 136 226 L 124 220 L 112 226
            L 100 220 L 88 226 L 76 220 L 64 226
            Z
          "
          fill={FOREST}
        />

        {/* Top stripe — lime brand band */}
        <Rect x="64" y="76" width="192" height="14" fill={LIME} />

        {/* Two seat-fare rows */}
        <G>
          {/* Seat icon row 1 */}
          <Rect x="84" y="112" width="16" height="14" rx="3" fill={LIME} />
          <Rect x="84" y="124" width="22" height="6" rx="2" fill={LIME} />
          <Rect x="116" y="118" width="68" height="6" rx="3" fill={WHITE} opacity="0.85" />
          {/* ₹ value pill */}
          <Rect x="200" y="110" width="42" height="20" rx="10" fill={LIME} />
          <Path
            d="M 209 116 H 232 M 209 121 H 232 M 211 116 Q 230 116 230 124 Q 230 130 222 130 L 234 138"
            stroke={FOREST}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </G>

        <G>
          <Rect x="84" y="152" width="16" height="14" rx="3" fill={LIME} />
          <Rect x="84" y="164" width="22" height="6" rx="2" fill={LIME} />
          <Rect x="116" y="158" width="68" height="6" rx="3" fill={WHITE} opacity="0.5" />
          <Rect x="200" y="150" width="42" height="20" rx="10" fill={LIME} opacity="0.5" />
        </G>

        {/* Divider before total */}
        <Path
          d="M 84 188 H 236"
          stroke={LIME}
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />

        {/* Total label + value */}
        <Rect x="84" y="196" width="62" height="8" rx="3" fill={WHITE} opacity="0.7" />
        <Rect x="180" y="194" width="62" height="14" rx="7" fill={LIME} />
        <Path
          d="M 192 198 H 226 M 192 202 H 226 M 195 198 Q 222 198 222 204 Q 222 209 213 209 L 226 215"
          stroke={FOREST}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </G>

      {/* UPI badge sitting outside the receipt — signals "pay via UPI" */}
      <G>
        <Circle cx="252" cy="60" r="30" fill={LIME} />
        <Circle cx="252" cy="60" r="30" fill="none" stroke={WHITE} strokeOpacity="0.4" strokeWidth="2" />
        <Path
          d="M 240 50 L 248 64 L 256 50 L 264 70"
          stroke={FOREST}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  </View>
);

/* -------------------------------------------------------------------
 * Slide 3 — "Made for your campus."
 * A student-ID card with a verified checkmark badge clipped over the
 * top-right corner. The card shows a face avatar + institute name +
 * verified row — visually carries "real students at your campus".
 * ----------------------------------------------------------------- */
export const CampusVerifiedHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
      <Defs>
        <LinearGradient id="haloTrust" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.24" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="160" cy="160" r="138" fill="url(#haloTrust)" />

      {/* ID card */}
      <G>
        {/* Card body */}
        <Rect x="56" y="92" width="208" height="148" rx="20" fill={FOREST} />
        {/* Lime header bar */}
        <Rect x="56" y="92" width="208" height="38" rx="20" fill={LIME} />
        <Rect x="56" y="108" width="208" height="22" fill={LIME} />

        {/* Header tagline (institute hint) */}
        <Rect x="78" y="106" width="80" height="6" rx="3" fill={FOREST} opacity="0.85" />
        <Rect x="78" y="117" width="56" height="4" rx="2" fill={FOREST} opacity="0.55" />

        {/* Avatar circle */}
        <Circle cx="104" cy="172" r="26" fill={LIME} />
        <Circle cx="104" cy="166" r="10" fill={FOREST} />
        <Path
          d="M 86 188 Q 104 172, 122 188 V 196 Q 104 202, 86 196 Z"
          fill={FOREST}
        />

        {/* Name + institute lines on the right of the avatar */}
        <Rect x="142" y="158" width="98" height="9" rx="4" fill={WHITE} opacity="0.95" />
        <Rect x="142" y="172" width="74" height="6" rx="3" fill={LIME} opacity="0.85" />
        <Rect x="142" y="186" width="86" height="5" rx="2" fill={WHITE} opacity="0.35" />

        {/* Bottom row — verified row + chip */}
        <Path d="M 78 214 H 240" stroke={LIME} strokeOpacity="0.25" strokeWidth="1.4" />
        <Rect x="78" y="220" width="80" height="6" rx="3" fill={WHITE} opacity="0.4" />
        <Rect x="200" y="216" width="40" height="14" rx="7" fill={LIME} />
        <Path
          d="M 208 222 L 214 228 L 232 212"
          stroke={FOREST}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>

      {/* Verified badge — clipped over the top-right corner of the card */}
      <G>
        <Circle cx="248" cy="92" r="32" fill={LIME} />
        <Circle cx="248" cy="92" r="32" fill="none" stroke={WHITE} strokeWidth="3" />
        <Path
          d="M 234 94 L 244 104 L 264 82"
          stroke={FOREST}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  </View>
);
