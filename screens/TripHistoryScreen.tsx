import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import { appHref } from "../navigation/routes";
import EmptyState from "../components/EmptyState";
import BrandInfo from "../components/BrandInfo/BrandInfo";
import ChevronBack from "../components/ChevronBack/ChevronBack";
import profileStyles from "./ProfileScreen/ProfileScreen.styles";
import { useTabletContentStyle } from "../utils/responsive";
import { displayRideLocation } from "../utils/LocationService";
import { useThemeColors } from "../contexts/ThemeContext";

type Ride = {
  ride_id?: string;
  id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  is_user_host?: boolean;
  viewer_state?:
    | "host"
    | "confirmed_passenger"
    | "pending_passenger"
    | "rejected_passenger"
    | "available"
    | "full"
    | "past";
  actions?: {
    can_rate?: boolean;
  };
};

type TripHistoryRow = Ride & {
  stableId: string;
  whenLabel: string;
  routeLabel: string;
  roleLabel: string;
  startTimeMs: number;
};

let tripHistoryDateFormatter: Intl.DateTimeFormat | null = null;
  try {
    tripHistoryDateFormatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    tripHistoryDateFormatter = null;
  }

/**
 * Trip history — a calmly-presented log of past rides under Profile.
 * Filters `/user/rides` to viewer_state == past and sorts most-
 * recent first. Each row carries a "Rate now" CTA when there's an
 * unrated counterpart for that trip (driven by actions.can_rate).
 *
 * Intentional cuts:
 *   - No fancy month grouping yet (KISS until usage signals demand)
 *   - No filter chips (host vs passenger vs cancelled) — single list
 *   - No stats summary on top — those are profile-level eventually,
 *     not screen-level
 */
const TripHistoryScreen: React.FC = () => {
  const { navigate, back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const insets = useSafeAreaInsets();
  const { apiUtil } = useApi();
  const colors = useThemeColors();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFocusedOnceRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const ridesResp = await apiUtil.get<Ride[]>("/user/rides?scope=past");
      const list = Array.isArray(ridesResp) ? ridesResp : [];
      setRides(list);
    } catch (err: any) {
      if (err?.message === "AUTHENTICATION_REDIRECT") return;
      setError(err?.response?.data?.message || "Couldn't load trip history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiUtil]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      void load(true);
      return undefined;
    }, [load]),
  );

  const pastRides = useMemo<TripHistoryRow[]>(() => {
    const seen = new Set<string>();
    const out: TripHistoryRow[] = [];
    const nowMs = Date.now();
    for (const r of rides) {
      const id = r.ride_id || r.id;
      if (!id || seen.has(id)) continue;
      const startTimeMs = new Date(r.start_time).getTime();
      const isPast =
        r.viewer_state === "past" ||
        startTimeMs < nowMs - 60 * 60 * 1000;
      if (!isPast) continue;
      seen.add(id);
      out.push({
        ...r,
        stableId: id,
        startTimeMs,
        whenLabel: formatWhen(r.start_time),
        routeLabel: `${displayRideLocation(r.start_location)} → ${displayRideLocation(r.end_location)}`,
        roleLabel: r.is_user_host || r.viewer_state === "host" ? "You hosted" : "Rode along",
      });
    }
    out.sort((a, b) => b.startTimeMs - a.startTimeMs);
    return out;
  }, [rides]);

  const renderTrip = useCallback(({ item }: { item: TripHistoryRow }) => {
    const needsRating = item.actions?.can_rate === true;
    return (
      <View style={[styles.row, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.rowMain}
          onPress={() =>
            navigate(appHref("RideDetailsScreen", { rideId: item.stableId }))
          }
        >
          <Text style={[styles.route, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.routeLabel}
          </Text>
          <Text style={[styles.meta, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
            {item.whenLabel} · {item.roleLabel}
            {item.total_price ? ` · ₹${item.total_price}` : ""}
          </Text>
        </TouchableOpacity>
        {needsRating ? (
          <TouchableOpacity
            style={[styles.rateBtn, colors.mode === "dark" && { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() =>
              navigate(
                appHref("PostTripRatingScreen", { rideId: item.stableId }),
              )
            }
          >
            <Text style={[styles.rateBtnText, colors.mode === "dark" && { color: colors.textOnAccent }]}>Rate</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [navigate, colors]);

  return (
    <View style={[profileStyles.container, tabletContentStyle, { backgroundColor: colors.background }]}>
      <View style={profileStyles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={profileStyles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[profileStyles.headerTitle, { color: colors.textPrimary }]}>Trip history</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="small" color={colors.textPrimary} accessibilityLabel="Loading" />
        </View>
      ) : error ? (
        <View style={[styles.center, { flex: 1, paddingHorizontal: 24 }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary, opacity: 1 }]}>{error}</Text>
        </View>
      ) : pastRides.length === 0 ? (
        <EmptyState
          image={require("../assets/no-rides-emoji.png")}
          imageSize={140}
          title="No past trips yet"
          body="Your completed rides will land here once you've taken one."
          ctaLabel="Find a ride"
          onPressCta={() => navigate(appHref("HomeScreen"))}
          topAlign
        />
      ) : (
        <FlatList
          data={pastRides}
          keyExtractor={(item) => item.stableId}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          renderItem={renderTrip}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={colors.textPrimary}
            />
          }
        />
      )}
    </View>
  );
};

export default TripHistoryScreen;

const formatWhen = (iso: string): string => {
  try {
    const d = new Date(iso);
    return tripHistoryDateFormatter?.format(d) ?? d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  errorText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AppColors.basicWhite,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  rowMain: { flex: 1 },
  route: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  meta: {
    marginTop: 4,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
  },
  rateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  rateBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },
});
