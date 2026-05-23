import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import { useRouter } from "expo-router";
import { appHref } from "../navigation/routes";
import { haptic } from "./PressableScale";
import { displayRideLocation } from "../utils/LocationService";

type Match = {
  id: string;
  host_user_id: string;
  host_user_name?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  start_distance_m: number;
  end_distance_m: number;
};

type Props = {
  /** When either coord is null, the suggestion stays dormant. The
   *  hook only fires once both ends are concrete. */
  fromCoords: { latitude: number; longitude: number } | null;
  toCoords: { latitude: number; longitude: number } | null;
  /** Departure time the user has selected. Optional — the backend
   *  defaults to "now + 1h" and a ±4h window, so an undefined date
   *  still gives useful matches for "imminent" trips. */
  date?: Date | null;
};

/**
 * Soft suggestion card that appears at the top of CreateRide when
 * GET /ride/matching-create returns one or more rides already going
 * the user's route + time. The point is to nudge people toward
 * joining an existing ride instead of fragmenting the supply by
 * posting a duplicate one.
 *
 * Renders nothing when:
 *   - either coord is missing (no signal yet)
 *   - the fetch returned no matches
 *   - the user explicitly dismissed (per-mount; we don't persist
 *     because the user might change their route and want a fresh
 *     suggestion).
 *
 * Top match is rendered inline as a quick-glance card; secondary
 * matches collapse behind a "+N more" expander. Tapping any match
 * opens its booking flow in RideDetailsScreen.
 */
const MatchingRidesSuggestion: React.FC<Props> = ({ fromCoords, toCoords, date }) => {
  const { apiUtil } = useApi();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Soft fade + slide-down so the card lands like a notification
  // when matches resolve, instead of slamming the layout.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  // Debounce the fetch — selecting a destination via picker can
  // briefly emit two coord updates back-to-back; 350ms keeps the
  // backend round-trip count honest without feeling laggy.
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    // Tear down any pending debounced fetch when inputs change.
    if (fetchTimer.current) clearTimeout(fetchTimer.current);

    if (!fromCoords || !toCoords) {
      setMatches([]);
      return;
    }

    fetchTimer.current = setTimeout(async () => {
      const id = ++reqIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          start_lat: String(fromCoords.latitude),
          start_lon: String(fromCoords.longitude),
          end_lat: String(toCoords.latitude),
          end_lon: String(toCoords.longitude),
          radius_m: "1000",
          window_hours: "4",
          limit: "5",
        });
        if (date) {
          params.set("start_time", date.toISOString());
        }
        const resp = await apiUtil.getUncached<{ matches: Match[] }>(
          `/ride/matching-create?${params.toString()}`,
        );
        if (id !== reqIdRef.current) return;
        setMatches(Array.isArray(resp?.matches) ? resp.matches : []);
      } catch {
        if (id !== reqIdRef.current) return;
        setMatches([]);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, 350);

    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [fromCoords?.latitude, fromCoords?.longitude, toCoords?.latitude, toCoords?.longitude, date, apiUtil]);

  // Animate in / out as match presence flips.
  useEffect(() => {
    const visible = !dismissed && matches.length > 0;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -8,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [matches.length, dismissed, opacity, translateY]);

  if (!fromCoords || !toCoords) return null;
  if (dismissed) return null;
  if (!loading && matches.length === 0) return null;

  // Loading state stays subtle — a tiny inline spinner row, no
  // skeleton card. Most fetches resolve under 100ms; flashing a
  // skeleton in that window would look glitchy.
  if (loading && matches.length === 0) {
    return null;
  }

  const top = matches[0];
  const rest = matches.slice(1);
  const visible = expanded ? matches : [top];

  const open = (m: Match) => {
    haptic("light");
    router.navigate(
      appHref("RideDetailsScreen", { rideId: m.id } as any),
    );
  };

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerEmoji}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>Already going there</Text>
            <Text style={styles.headerTitle}>
              {matches.length === 1
                ? `${top.host_user_name || "Someone"} is heading your way`
                : `${matches.length} hosts are heading your way`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              haptic("selection");
              setDismissed(true);
            }}
            style={styles.dismissBtn}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            accessibilityLabel="Dismiss suggestion"
          >
            <Text style={styles.dismissGlyph}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          // Inline list — small enough to fit in a vertical stack
          // without needing real scrolling, but a ScrollView gives
          // us nicer overflow handling than a bare View if the
          // expanded mode goes past 4 rows.
          scrollEnabled={expanded && rest.length > 2}
          style={{ maxHeight: expanded ? 320 : undefined }}
        >
          {visible.map((m, idx) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.85}
              style={[styles.matchRow, idx > 0 && styles.matchRowDivider]}
              onPress={() => open(m)}
              accessibilityLabel={`Open ride from ${displayRideLocation(m.start_location)} to ${displayRideLocation(m.end_location)}`}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.matchRoute} numberOfLines={1}>
                  {displayRideLocation(m.start_location)} → {displayRideLocation(m.end_location)}
                </Text>
                <Text style={styles.matchMeta} numberOfLines={1}>
                  {formatTime(m.start_time)} · ₹{m.total_price} · {seatsLabel(m)}
                </Text>
                <Text style={styles.matchDistance} numberOfLines={1}>
                  {formatDistance(m.start_distance_m)} from your pickup ·{" "}
                  {formatDistance(m.end_distance_m)} from your drop
                </Text>
              </View>
              <Text style={styles.matchChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {rest.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              haptic("selection");
              setExpanded((v) => !v);
            }}
            style={styles.expandBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.expandBtnText}>
              {expanded ? "Show less" : `Show ${rest.length} more`}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.footnote}>
          Or post your own below if none of these fit.
        </Text>
      </View>
    </Animated.View>
  );
};

// --- helpers --------------------------------------------------------

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return time;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${time}`;
}

function formatDistance(metres: number): string {
  if (metres < 100) return `${Math.round(metres)}m`;
  if (metres < 1000) return `${Math.round(metres / 10) * 10}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}

function seatsLabel(m: Match): string {
  const open = Math.max(0, m.total_seats - m.booked_seats);
  return open === 1 ? "1 seat open" : `${open} seats open`;
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  card: {
    // Lime card with soft forest border — sits on the lime canvas
    // distinctly but doesn't compete with the white form cards
    // below. Big enough rounded radius that it reads as a "soft
    // suggestion" rather than a hard alert.
    backgroundColor: AppColors.basicWhite,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  headerEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerKicker: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textTransform: "uppercase",
  },
  headerTitle: {
    marginTop: 2,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(38,59,51,0.06)",
  },
  dismissGlyph: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: "NunitoSans_700Bold",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  matchRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(38,59,51,0.10)",
  },
  matchRoute: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.15,
  },
  matchMeta: {
    marginTop: 3,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
  },
  matchDistance: {
    marginTop: 2,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
  },
  matchChevron: {
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    paddingLeft: 4,
  },
  expandBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginTop: 4,
  },
  expandBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.1,
  },
  footnote: {
    marginTop: 10,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.5,
    textAlign: "center",
  },
});

// Suppress unused-import warning if ActivityIndicator goes unused in
// future revisions (kept around for the "loading inline" branch we
// commented out — surfaces real fast on slow networks).
export const __keepActivityIndicator = ActivityIndicator;

export default MatchingRidesSuggestion;
