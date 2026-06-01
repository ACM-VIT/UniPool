import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import AppColors from "../design_systems/colors";

/**
 * MatchInsightsShelf — the under-card chip strip that surfaces why a
 * ride ranked where it did in the search results.
 *
 * Visually, it slots BENEATH the RideCard with a small negative top
 * margin so the card's bottom shadow falls onto its surface — the
 * effect is a stacked tray: the card on top, the shelf peeking out
 * below.
 *
 * Restraint is the design — most signals duplicate information that
 * is ALREADY visible on the card (the distance row already says
 * "1.2km from pickup", the time slot already shows "Tomorrow",
 * etc.). Showing chips for those just clutters the list. So the
 * shelf renders only signals from {@link USEFUL_SIGNAL_KINDS} —
 * ones that add information the surrounding card cannot — and caps
 * at {@link VISIBLE_LIMIT} pills per card. When no signal qualifies
 * the shelf returns null entirely; many cards will not have one,
 * and the visual rhythm benefits from the variance.
 *
 * Each chip is a single line: bold label + a quiet middot + faint
 * detail inline. No multi-line pills, no detail sub-row — pills
 * should fit the height of the row beneath them.
 *
 * Entry animation: each chip fades + lifts in on a 60ms stagger from
 * the left. Plays once per card mount.
 */

// Allow-list of signals the shelf actually surfaces. Everything else
// (near_pickup / multiple_seats / today / great_price / etc.) is
// suppressed because the same datum is already visible on the card
// or on the host/distance subrow underneath. Keeps the shelf
// reserved for signals that justify ranking, not facts.
const USEFUL_SIGNAL_KINDS = new Set<string>([
  "exact_time",
  "close_time",
  "selected_date",
  "repeat_route",
  "on_the_way",
  "exact_destination",
  "exact_pickup",
  "top_host",
  "trusted_host",
  "just_listed",
  "leaving_soon",
  "last_seat",
]);

export type MatchSignalKind =
  | "exact_time"
  | "close_time"
  | "flexible_time"
  | "selected_date"
  | "next_day"
  | "previous_day"
  | "repeat_route"
  | "on_the_way"
  | "exact_destination"
  | "near_destination"
  | "nearby_destination"
  | "same_area_destination"
  | "exact_pickup"
  | "near_pickup"
  | "nearby_pickup"
  | "top_host"
  | "trusted_host"
  | "just_listed"
  | "leaving_soon"
  | "today"
  | "tomorrow"
  | "this_week"
  | "fits_group"
  | "multiple_seats"
  | "last_seat"
  | "great_price"
  | "within_budget";

export type MatchSignalTone =
  | "primary"
  | "route"
  | "spatial"
  | "social"
  | "fresh"
  | "time"
  | "capacity"
  | "value";

export interface MatchSignal {
  kind: MatchSignalKind | string;
  label: string;
  detail?: string;
  tone: MatchSignalTone | string;
}

interface MatchInsightsShelfProps {
  signals: MatchSignal[];
  /**
   * Optional accent — when the card carries the "Best match" overlay
   * pill, the shelf paints its first chip in solid lime regardless
   * of tone so the visual hierarchy stays consistent.
   */
  isBestMatch?: boolean;
}

const VISIBLE_LIMIT = 2;

const MatchInsightsShelf: React.FC<MatchInsightsShelfProps> = ({
  signals,
  isBestMatch,
}) => {
  // Filter to the allow-list, then cap. The backend already sorts by
  // priority high-first, so we never re-sort — the first two useful
  // signals win.
  const visible = useMemo(() => {
    if (!Array.isArray(signals) || signals.length === 0) return [];
    const filtered: MatchSignal[] = [];
    for (const s of signals) {
      if (!s || typeof s.kind !== "string") continue;
      if (!USEFUL_SIGNAL_KINDS.has(s.kind)) continue;
      filtered.push(s);
      if (filtered.length === VISIBLE_LIMIT) break;
    }
    return filtered;
  }, [signals]);

  // One Animated.Value per chip, allocated lazily so we don't pay for
  // animation state on cards that never render a shelf (no signals).
  // Recomputed only when the number of chips changes — content edits
  // shouldn't re-trigger the entry animation.
  const animations = useRef<Animated.Value[]>([]);
  if (animations.current.length !== visible.length) {
    animations.current = visible.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    if (visible.length === 0) return;
    const sequences = animations.current.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 280,
        delay: index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    Animated.stagger(0, sequences).start();
  }, [visible.length]);

  if (visible.length === 0) return null;

  return (
    <View style={styles.shelfWrap} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfRow}
        // Disable scroll bounce so users don't accidentally drag the
        // chip strip when they meant to scroll the page vertically.
        bounces={false}
        // Touch slop kept low — the strip mostly displays; vertical
        // gestures take priority via the ScrollView's responder.
        directionalLockEnabled
      >
        {visible.map((signal, index) => {
          const variant = resolveVariant(signal.tone, index === 0 && isBestMatch);
          const value = animations.current[index];
          const opacity = value;
          const translateX = value.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
          });

          return (
            <Animated.View
              key={`${signal.kind}-${index}`}
              style={[
                styles.chip,
                variant.chip,
                { opacity, transform: [{ translateX }] },
              ]}
            >
              <SignalIcon kind={signal.kind as MatchSignalKind} color={variant.iconColor} />
              <Text
                style={[styles.chipLabel, variant.chipLabel]}
                numberOfLines={1}
              >
                {signal.label}
                {signal.detail ? (
                  <Text style={[styles.chipDetail, variant.chipDetail]}>
                    {"  ·  " + signal.detail}
                  </Text>
                ) : null}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default MatchInsightsShelf;

// --- Tone → visual variant resolution ----------------------------------

interface ChipVariant {
  chip: ViewStyle;
  iconColor: string;
  chipLabel: TextStyle;
  chipDetail: TextStyle;
}

function resolveVariant(tone: string, force: boolean | undefined): ChipVariant {
  // "Best match" cards paint their first chip in the bordered lime
  // variant so the shelf's leading pill echoes the overlay pill
  // sitting on the card's top-right corner. Everything else maps to
  // the calmest variant that still carries its meaning.
  if (force) return variants.primaryAccent;
  switch (tone) {
    case "primary":
      return variants.primary;
    case "social":
      return variants.social;
    case "fresh":
      return variants.fresh;
    // route / spatial / time / capacity / value all fall through to
    // the muted cream chip — these tones existed in the API but
    // visually we don't want five different pill colours per card.
    default:
      return variants.subtle;
  }
}

const FOREST = AppColors.secondaryDarkGreen;
const LIME = AppColors.primaryLightGreen;
const CREAM = AppColors.cardSurface;
const ORANGE = AppColors.accentOrange;

const FOREST_18 = "rgba(38,59,51,0.18)";
const FOREST_70 = "rgba(38,59,51,0.70)";

// Visual palette per tone. Only strong signals use filled pills; secondary
// signals stay muted so the shelf supports the ride card.
const variants: Record<string, ChipVariant> = {
  primary: {
    chip: { backgroundColor: LIME },
    iconColor: FOREST,
    chipLabel: { color: FOREST },
    chipDetail: { color: FOREST_70 },
  },
  primaryAccent: {
    chip: { backgroundColor: LIME, borderWidth: 1.2, borderColor: FOREST },
    iconColor: FOREST,
    chipLabel: { color: FOREST },
    chipDetail: { color: FOREST_70 },
  },
  social: {
    chip: { backgroundColor: FOREST },
    iconColor: LIME,
    chipLabel: { color: LIME },
    chipDetail: { color: "rgba(255,253,244,0.72)" },
  },
  fresh: {
    chip: { backgroundColor: ORANGE },
    iconColor: "#FFFFFF",
    chipLabel: { color: "#FFFFFF" },
    chipDetail: { color: "rgba(255,255,255,0.80)" },
  },
  subtle: {
    chip: {
      backgroundColor: CREAM,
      borderWidth: 1,
      borderColor: FOREST_18,
    },
    iconColor: FOREST,
    chipLabel: { color: FOREST },
    chipDetail: { color: FOREST_70 },
  },
};

// --- Inline SVG icon set -----------------------------------------------

interface IconProps {
  color: string;
}

const SignalIcon: React.FC<{ kind: MatchSignalKind | string; color: string }> = ({
  kind,
  color,
}) => {
  const Icon = iconByKind[kind] ?? StarIcon;
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Icon color={color} />
    </Svg>
  );
};

// Each icon renders into a parent <Svg viewBox="0 0 24 24"/>.

const STROKE = 2.2;

const ClockIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={STROKE} />
    <Path d="M12 7v5l3 2.2" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </>
);

const TargetIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={STROKE} />
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={STROKE} />
    <Circle cx="12" cy="12" r="1.4" fill={color} />
  </>
);

const RouteIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Circle cx="6.2" cy="6.2" r="2" stroke={color} strokeWidth={STROKE} />
    <Circle cx="17.8" cy="17.8" r="2" stroke={color} strokeWidth={STROKE} />
    <Path
      d="M8.4 7.4c3 1.2 4.4 3 4.4 5.4 0 2.6 1.6 4 3.6 4.6"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

const PinIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M12 21c4.5-5.4 7-8.6 7-12a7 7 0 1 0-14 0c0 3.4 2.5 6.6 7 12Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="9.5" r="2.4" fill={color} />
  </>
);

const FlagIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M5 21V4"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
    <Path
      d="M5 4h11l-2 4 2 4H5"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
  </>
);

const RepeatIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M4 9a5 5 0 0 1 5-5h8l-3-3M20 15a5 5 0 0 1-5 5H7l3 3"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

const ShieldIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M12 3 4.5 6v6c0 4.4 3 7.6 7.5 9 4.5-1.4 7.5-4.6 7.5-9V6L12 3Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path
      d="m9 12 2.2 2.4L15.5 10"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

const StarIcon: React.FC<IconProps> = ({ color }) => (
  <Path
    d="m12 3 2.8 5.6 6.2.9-4.5 4.3 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.2-.9L12 3Z"
    stroke={color}
    strokeWidth={STROKE}
    strokeLinejoin="round"
  />
);

const SparkIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.7 2.7M15.8 15.8l2.7 2.7M5.5 18.5l2.7-2.7M15.8 8.2l2.7-2.7"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  </>
);

const CalendarIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M5 7h14v13H5zM5 7V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path d="M9 3v3M15 3v3M5 11h14" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </>
);

const BoltIcon: React.FC<IconProps> = ({ color }) => (
  <Path
    d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z"
    stroke={color}
    strokeWidth={STROKE}
    strokeLinejoin="round"
  />
);

const SeatIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M6 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path
      d="M4 11h12v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path d="M16 17v3M8 17v3" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </>
);

const RupeeIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M7 5h10M7 9h10M9 5c4 0 5.5 2 5.5 4.5S13 14 9 14c2.5 0 4.5 1.8 6.5 5"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

const TrophyIcon: React.FC<IconProps> = ({ color }) => (
  <>
    <Path
      d="M8 4h8v4a4 4 0 0 1-8 0V4Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path
      d="M5 5h3v3a3 3 0 0 1-3-3ZM19 5h-3v3a3 3 0 0 0 3-3Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <Path
      d="M12 12v4M9 20h6M10 16h4l-.5 4h-3L10 16Z"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

// Map each backend signal kind to its glyph. Anything missing falls
// through to a star — keeps the chip rendering even if the backend
// emits a new kind ahead of a client release.
const iconByKind: Record<string, React.FC<IconProps>> = {
  exact_time: TargetIcon,
  close_time: ClockIcon,
  flexible_time: ClockIcon,
  selected_date: CalendarIcon,
  next_day: CalendarIcon,
  previous_day: CalendarIcon,
  repeat_route: RepeatIcon,
  on_the_way: RouteIcon,
  exact_destination: FlagIcon,
  near_destination: FlagIcon,
  nearby_destination: PinIcon,
  same_area_destination: PinIcon,
  exact_pickup: PinIcon,
  near_pickup: PinIcon,
  nearby_pickup: PinIcon,
  top_host: TrophyIcon,
  trusted_host: ShieldIcon,
  just_listed: SparkIcon,
  leaving_soon: BoltIcon,
  today: CalendarIcon,
  tomorrow: CalendarIcon,
  this_week: CalendarIcon,
  fits_group: SeatIcon,
  multiple_seats: SeatIcon,
  last_seat: BoltIcon,
  great_price: RupeeIcon,
  within_budget: RupeeIcon,
};

// --- Styles -------------------------------------------------------------

const styles = StyleSheet.create({
  shelfWrap: {
    // Slot UP under the card so the card's bottom shadow falls onto
    // the shelf surface; just enough vertical room below for one
    // slim row of pills. Deliberately compact — the shelf is a
    // ranking-justification aside, not a content section.
    marginTop: -10,
    paddingTop: 12,
    paddingBottom: 2,
  },
  shelfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingRight: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    minHeight: 24,
    // No shadow — the shelf is a quiet supporting layer, not raised
    // chrome competing with the card. Tone variants carry all the
    // visual weight via fill / border.
  },
  chipLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  chipDetail: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.15,
    // Detail text uses the same line-height so it sits on the same
    // baseline as the label; the opacity differentiation comes from
    // each variant's chipDetail color override.
  },
});
