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
 * Onboarding hero illustrations. All three share one design
 * language: lime, forest, white only, 320x320 viewBox so they slot
 * into identical containers across slides, and a soft lime halo
 * behind the focal element so each hero reads "stamped" against the
 * forest dark surface without a hard rim.
 *
 * Important: every `d` is kept on a single line. Some
 * react-native-svg builds choke on multi-line `d` strings with
 * blank whitespace, and crashes in path parsing surface as
 * native render errors that bubble up as a screen crash. Single
 * line strings sidestep that entire class of bug.
 */

const LIME = AppColors.primaryLightGreen;
const FOREST = AppColors.secondaryDarkGreen;
const WHITE = AppColors.basicWhite;
const FOREST_DEEP = "#1B2C26";

type IllustrationProps = { size: number };

/* -----------------------------------------------------------------
 * Slide 1: route. Outlined origin pin, dotted arc, filled
 * destination pin with a small lime car cruising at the arc's
 * apex.
 * --------------------------------------------------------------- */
export const RouteHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320">
      <Defs>
        <LinearGradient id="haloRoute" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.22" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="160" cy="170" r="138" fill="url(#haloRoute)" />

      {/* Dotted arc connecting origin to destination */}
      <Path
        d="M 70 230 Q 160 60 250 230"
        stroke={LIME}
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 12"
        fill="none"
      />

      {/* Origin: outlined route dot */}
      <Circle cx="70" cy="230" r="18" fill={FOREST_DEEP} />
      <Circle cx="70" cy="230" r="13" fill="none" stroke={LIME} strokeWidth="4" />

      {/* Destination: filled lime teardrop pin */}
      <Path
        d="M 250 198 Q 274 198 274 222 Q 274 240 250 268 Q 226 240 226 222 Q 226 198 250 198 Z"
        fill={LIME}
      />
      <Circle cx="250" cy="222" r="8" fill={FOREST} />

      {/* Travelling car at the apex of the arc */}
      <G>
        {/* Body */}
        <Rect x="118" y="100" width="84" height="36" rx="12" fill={LIME} />
        {/* Cabin */}
        <Path d="M 134 100 L 146 78 L 178 78 L 192 100 Z" fill={LIME} />
        {/* Windows */}
        <Path d="M 140 100 L 150 84 L 162 84 L 162 100 Z" fill={WHITE} opacity="0.55" />
        <Path d="M 166 84 L 176 84 L 184 100 L 166 100 Z" fill={WHITE} opacity="0.55" />
        {/* Wheels */}
        <Circle cx="138" cy="138" r="10" fill={FOREST} />
        <Circle cx="138" cy="138" r="4" fill={LIME} />
        <Circle cx="182" cy="138" r="10" fill={FOREST} />
        <Circle cx="182" cy="138" r="4" fill={LIME} />
      </G>
    </Svg>
  </View>
);

/* -----------------------------------------------------------------
 * Slide 2: fair price. Forest receipt card with a per-seat row and
 * a total row, plus a circular UPI badge with a wave glyph sitting
 * off the top-right corner. Rounded bottom instead of the previous
 * zigzag torn-edge so the path is short and robust.
 * --------------------------------------------------------------- */
export const FairPriceHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320">
      <Defs>
        <LinearGradient id="haloFair" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.22" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="160" cy="160" r="140" fill="url(#haloFair)" />

      {/* Receipt body. Rounded all four corners (rx=20). */}
      <Rect x="64" y="76" width="192" height="158" rx="20" fill={FOREST} />

      {/* Top brand strip. Square rect on top of the rounded body
          will show a few pixels of square corner past the parent's
          rounded edge; at hero size that's invisible and keeps the
          SVG simple. */}
      <Rect x="68" y="80" width="184" height="32" rx="16" fill={LIME} />
      {/* A second rect covers the bottom-rounded portion of the
          strip so it reads as a band, not a pill. */}
      <Rect x="68" y="96" width="184" height="14" fill={LIME} />

      {/* Seat row 1 */}
      <Rect x="84" y="124" width="16" height="14" rx="3" fill={LIME} />
      <Rect x="84" y="136" width="22" height="6" rx="2" fill={LIME} />
      <Rect x="116" y="130" width="68" height="6" rx="3" fill={WHITE} opacity="0.85" />
      <Rect x="198" y="122" width="44" height="20" rx="10" fill={LIME} />
      <Rect x="204" y="129" width="32" height="6" rx="2" fill={FOREST} />

      {/* Seat row 2 (muted) */}
      <Rect x="84" y="160" width="16" height="14" rx="3" fill={LIME} opacity="0.55" />
      <Rect x="84" y="172" width="22" height="6" rx="2" fill={LIME} opacity="0.55" />
      <Rect x="116" y="166" width="68" height="6" rx="3" fill={WHITE} opacity="0.45" />
      <Rect x="198" y="158" width="44" height="20" rx="10" fill={LIME} opacity="0.45" />
      <Rect x="204" y="165" width="32" height="6" rx="2" fill={FOREST} opacity="0.6" />

      {/* Divider before total */}
      <Path
        d="M 84 196 L 236 196"
        stroke={LIME}
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        fill="none"
      />

      {/* Total label + pill */}
      <Rect x="84" y="206" width="62" height="8" rx="3" fill={WHITE} opacity="0.7" />
      <Rect x="180" y="202" width="62" height="16" rx="8" fill={LIME} />
      <Rect x="190" y="208" width="42" height="4" rx="2" fill={FOREST} />

      {/* UPI badge (top-right, sitting on the corner) */}
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
    </Svg>
  </View>
);

/* -----------------------------------------------------------------
 * Slide 3: campus verified. Forest ID card with an avatar circle,
 * institute lines, a verified row at the bottom, and a corner-
 * clipped lime check badge floating off the top-right.
 * --------------------------------------------------------------- */
export const CampusVerifiedHero: React.FC<IllustrationProps> = ({ size }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 320 320">
      <Defs>
        <LinearGradient id="haloTrust" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.24" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="160" cy="160" r="138" fill="url(#haloTrust)" />

      {/* Card body */}
      <Rect x="56" y="92" width="208" height="148" rx="20" fill={FOREST} />
      {/* Lime header band */}
      <Rect x="56" y="92" width="208" height="34" fill={LIME} />
      <Rect x="56" y="112" width="208" height="14" fill={LIME} />

      {/* Header text bars */}
      <Rect x="78" y="106" width="80" height="6" rx="3" fill={FOREST} opacity="0.85" />
      <Rect x="78" y="116" width="56" height="4" rx="2" fill={FOREST} opacity="0.55" />

      {/* Avatar */}
      <Circle cx="104" cy="172" r="26" fill={LIME} />
      <Circle cx="104" cy="166" r="10" fill={FOREST} />
      <Path
        d="M 86 188 Q 104 172 122 188 L 122 196 Q 104 202 86 196 Z"
        fill={FOREST}
      />

      {/* Name / institute lines */}
      <Rect x="142" y="158" width="98" height="9" rx="4" fill={WHITE} opacity="0.95" />
      <Rect x="142" y="172" width="74" height="6" rx="3" fill={LIME} opacity="0.85" />
      <Rect x="142" y="186" width="86" height="5" rx="2" fill={WHITE} opacity="0.35" />

      {/* Divider + verified row */}
      <Path
        d="M 78 214 L 240 214"
        stroke={LIME}
        strokeOpacity="0.25"
        strokeWidth="1.4"
        fill="none"
      />
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

      {/* Corner-clipped verified seal */}
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
    </Svg>
  </View>
);
