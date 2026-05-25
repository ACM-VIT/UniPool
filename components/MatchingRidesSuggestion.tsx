import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
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

type MatchView = {
  match: Match;
  routeLabel: string;
  metaLabel: string;
  distanceLabel: string;
  accessibilityLabel: string;
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
  const dateMs = date?.getTime() ?? null;
  const dateIso = useMemo(
    () => (dateMs !== null && Number.isFinite(dateMs) ? new Date(dateMs).toISOString() : ""),
    [dateMs],
  );

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
        if (dateIso) {
          params.set("start_time", dateIso);
        }
        const resp = await apiUtil.get<{ matches: Match[] }>(
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
  }, [
    fromCoords?.latitude,
    fromCoords?.longitude,
    toCoords?.latitude,
    toCoords?.longitude,
    dateIso,
    apiUtil,
  ]);

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

  const matchViews = useMemo<MatchView[]>(
    () =>
      matches.map((m) => {
        const start = displayRideLocation(m.start_location);
        const end = displayRideLocation(m.end_location);
        return {
          match: m,
          routeLabel: `${start} → ${end}`,
          metaLabel: `${formatTime(m.start_time)} · ₹${m.total_price} · ${seatsLabel(m)}`,
          distanceLabel: `${formatDistance(m.start_distance_m)} from your pickup · ${formatDistance(m.end_distance_m)} from your drop`,
          accessibilityLabel: `Open ride from ${start} to ${end}`,
        };
      }),
    [matches],
  );
  const top = matches[0];
  const restCount = Math.max(0, matches.length - 1);
  const visible = expanded ? matchViews : matchViews.slice(0, 1);
  const headerTitle = useMemo(
    () =>
      matches.length === 1
        ? `${top?.host_user_name || "Someone"} is heading your way`
        : `${matches.length} hosts are heading your way`,
    [matches.length, top?.host_user_name],
  );
  const animatedStyle = useMemo(
    () => [styles.wrap, { opacity, transform: [{ translateY }] }],
    [opacity, translateY],
  );

  const open = useCallback((m: Match) => {
    haptic("light");
    router.navigate(
      appHref("RideDetailsScreen", { rideId: m.id } as any),
    );
  }, [router]);
  const dismiss = useCallback(() => {
    haptic("selection");
    setDismissed(true);
  }, []);
  const toggleExpanded = useCallback(() => {
    haptic("selection");
    setExpanded((v) => !v);
  }, []);

  if (!fromCoords || !toCoords) return null;
  if (dismissed) return null;
  if (!loading && matches.length === 0) return null;

  // Loading state stays subtle — a tiny inline spinner row, no
  // skeleton card. Most fetches resolve under 100ms; flashing a
  // skeleton in that window would look glitchy.
  if (loading && matches.length === 0) {
    return null;
  }

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerEmoji}>💡</Text>
          <View style={styles.headerText}>
            <Text style={styles.headerKicker}>Already going there</Text>
            <Text style={styles.headerTitle}>
              {headerTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={dismiss}
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
          scrollEnabled={expanded && restCount > 2}
          style={expanded ? styles.matchListExpanded : undefined}
        >
          {visible.map((item, idx) => (
            <TouchableOpacity
              key={item.match.id}
              activeOpacity={0.85}
              style={idx > 0 ? styles.matchRowWithDivider : styles.matchRow}
              onPress={() => open(item.match)}
              accessibilityLabel={item.accessibilityLabel}
            >
              <View style={styles.matchTextColumn}>
                <Text style={styles.matchRoute} numberOfLines={1}>
                  {item.routeLabel}
                </Text>
                <Text style={styles.matchMeta} numberOfLines={1}>
                  {item.metaLabel}
                </Text>
                <Text style={styles.matchDistance} numberOfLines={1}>
                  {item.distanceLabel}
                </Text>
              </View>
              <Text style={styles.matchChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {restCount > 0 ? (
          <TouchableOpacity
            onPress={toggleExpanded}
            style={styles.expandBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.expandBtnText}>
              {expanded ? "Show less" : `Show ${restCount} more`}
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

const matchTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
})();

const matchDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
})();

function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = matchTimeFormatter
    ? matchTimeFormatter.format(d)
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const todayKey = dayKey(today);
  if (dayKey(d) === todayKey) return time;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(d) === dayKey(tomorrow)) return `Tomorrow ${time}`;
  const date = matchDateFormatter
    ? matchDateFormatter.format(d)
    : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${date} ${time}`;
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
  headerText: {
    flex: 1,
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
  matchRowWithDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(38,59,51,0.10)",
  },
  matchListExpanded: {
    maxHeight: 320,
  },
  matchTextColumn: {
    flex: 1,
    minWidth: 0,
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

function coordsEqual(
  a: Props["fromCoords"],
  b: Props["fromCoords"],
): boolean {
  return a?.latitude === b?.latitude && a?.longitude === b?.longitude;
}

function suggestionPropsEqual(prev: Props, next: Props): boolean {
  return (
    coordsEqual(prev.fromCoords, next.fromCoords) &&
    coordsEqual(prev.toCoords, next.toCoords) &&
    (prev.date?.getTime() ?? null) === (next.date?.getTime() ?? null)
  );
}

export default memo(MatchingRidesSuggestion, suggestionPropsEqual);
