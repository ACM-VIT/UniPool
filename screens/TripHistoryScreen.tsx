import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import BrandInfo from "../components/BrandInfo";
import ChevronBack from "../components/ChevronBack";
import profileStyles from "./ProfileScreen/ProfileScreen.styles";
import { useTabletContentStyle } from "../utils/responsive";
import { displayRideLocation } from "../utils/LocationService";

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
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const insets = useSafeAreaInsets();
  const { apiUtil } = useApi();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const ridesResp = await apiUtil.getUncached<Ride[]>("/user/rides?scope=past");
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
      void load(true);
    }, [load]),
  );

  const pastRides = useMemo(() => {
    const seen = new Set<string>();
    const out: Ride[] = [];
    for (const r of rides) {
      const id = r.ride_id || r.id;
      if (!id || seen.has(id)) continue;
      const isPast =
        r.viewer_state === "past" ||
        new Date(r.start_time).getTime() < Date.now() - 60 * 60 * 1000;
      if (!isPast) continue;
      seen.add(id);
      out.push(r);
    }
    out.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
    return out;
  }, [rides]);

  return (
    <View style={[profileStyles.container, tabletContentStyle]}>
      <View style={profileStyles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={profileStyles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={profileStyles.headerTitle}>Trip history</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} accessibilityLabel="Loading" />
        </View>
      ) : error ? (
        <View style={[styles.center, { flex: 1, paddingHorizontal: 24 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : pastRides.length === 0 ? (
        <EmptyState
          image={require("../assets/no-rides-emoji.png")}
          imageSize={140}
          title="No past trips yet"
          body="Your completed rides will land here once you've taken one."
          ctaLabel="Find a ride"
          onPressCta={() => router.navigate(appHref("HomeScreen"))}
          topAlign
        />
      ) : (
        <FlatList
          data={pastRides}
          keyExtractor={(item) => item.ride_id || item.id || Math.random().toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          renderItem={({ item }) => {
            const id = item.ride_id || item.id || "";
            const needsRating = item.actions?.can_rate === true;
            return (
              <View style={styles.row}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.rowMain}
                  onPress={() =>
                    router.navigate(appHref("RideDetailsScreen", { rideId: id }))
                  }
                >
                  <Text style={styles.route} numberOfLines={2}>
                    {displayRideLocation(item.start_location)} → {displayRideLocation(item.end_location)}
                  </Text>
                  <Text style={styles.meta}>
                    {formatWhen(item.start_time)} ·{" "}
                    {item.is_user_host || item.viewer_state === "host"
                      ? "You hosted"
                      : "Rode along"}
                    {item.total_price ? ` · ₹${item.total_price}` : ""}
                  </Text>
                </TouchableOpacity>
                {needsRating ? (
                  <TouchableOpacity
                    style={styles.rateBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.navigate(
                        appHref("PostTripRatingScreen", { rideId: id }),
                      )
                    }
                  >
                    <Text style={styles.rateBtnText}>Rate</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={AppColors.secondaryDarkGreen}
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
    return d.toLocaleDateString("en-GB", {
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
