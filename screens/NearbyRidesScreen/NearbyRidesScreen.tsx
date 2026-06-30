import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthGate } from "../../contexts/AuthGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";
import ChevronBack from "../../components/ChevronBack/ChevronBack";
import LoadingComponent from "../../components/LoadingComponent";
import EmptyState from "../../components/EmptyState";
import RouteStack from "../../components/RouteStack";
import SmileyGlyph from "../../components/SmileyGlyph";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../../components/MainNavBar.constants";
import { appHref } from "../../navigation/routes";
import { useApi } from "../../utils/ApiUtil";
import { useUser } from "../../contexts/UserContext";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../../utils/responsive";
import { isRideUpcomingAt } from "../../utils/rideTime";
import { hasSeatsLeft, seatsAvailableLabel } from "../../utils/seatMath";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const sizeFor = (s: number, m: number, l: number) =>
  isSmallDevice ? s : isMediumDevice ? m : l;

const clockIcon = require("../../assets/clock.png");
const NEARBY_LOCATION_CACHE_MS = 60_000;
const NEARBY_LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;

let nearbyLocationCache:
  | { latitude: number; longitude: number; cachedAtMs: number }
  | null = null;

type NearbyRide = {
  id: string;
  // Used to filter out rides hosted by the current viewer.
  host_user_id?: string;
  start_location: string;
  end_location: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
};

type NearbyRideWithComputed = NearbyRide & {
  distanceKm: number;
  startTimeMs: number;
};

type NearbyRideRow = Omit<NearbyRideWithComputed, "distanceKm"> & {
  dateLabel: string;
  timeLabel: string;
  distanceKm: number | null;
  seatAvailability: string;
};

let nearbyDateFormatter: Intl.DateTimeFormat | null = null;
  try {
    nearbyDateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    nearbyDateFormatter = null;
  }

let nearbyTimeFormatter: Intl.DateTimeFormat | null = null;
  try {
    nearbyTimeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    nearbyTimeFormatter = null;
  }

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${nearbyTimeFormatter?.format(d) ?? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`} hrs`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return nearbyDateFormatter?.format(d) ?? d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/**
 * Public nearby-rides list for signed-in and guest users.
 * Requesting a seat is still gated by AvailableRidesSelectedScreen.
 */
const NearbyRidesScreen: React.FC = () => {
  const { navigate, back } = useRouter();
  const colors = useThemeColors();
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const { requireAuth } = useAuthGate();
  const { apiUtil } = useApi();
  const { user: viewerUser } = useUser();
  const viewerUserId = viewerUser?.id ?? "";
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<NearbyRideWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Permission-gate state is separate from network failures.
  const [needsLocation, setNeedsLocation] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const getCurrentCoords = useCallback(async (forceFresh: boolean) => {
    const cached = nearbyLocationCache;
    if (!forceFresh && cached && Date.now() - cached.cachedAtMs < NEARBY_LOCATION_CACHE_MS) {
      return { latitude: cached.latitude, longitude: cached.longitude };
    }

    if (!forceFresh) {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && Date.now() - lastKnown.timestamp < NEARBY_LAST_KNOWN_MAX_AGE_MS) {
          nearbyLocationCache = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            cachedAtMs: Date.now(),
          };
          return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        }
      } catch (e) {
        console.warn("[NearbyRides] last-known location unavailable", e);
      }
    }

    const { coords: c } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    nearbyLocationCache = {
      latitude: c.latitude,
      longitude: c.longitude,
      cachedAtMs: Date.now(),
    };
    return { latitude: c.latitude, longitude: c.longitude };
  }, []);

  const load = useCallback(async (forceNetwork = false) => {
    setError(null);
    setNeedsLocation(false);
    try {
      // Permission denial renders a dedicated CTA instead of a fetch error.
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setNeedsLocation(true);
        setRides([]);
        return;
      }
      const c = await getCurrentCoords(forceNetwork);
      setCoords(c);

      // Ask the backend to exclude rides hosted by the viewer.
      const excludeParam = viewerUserId
        ? `&exclude_host_user_id=${encodeURIComponent(viewerUserId)}`
        : "";
      const endpoint = `/rides/nearby?lat=${c.latitude.toFixed(4)}&lng=${c.longitude.toFixed(4)}&radius=10000&limit=60${excludeParam}`;
      const json = forceNetwork
        ? await apiUtil.getUncached<{ rides?: NearbyRide[] }>(endpoint)
        : await apiUtil.get<{ rides?: NearbyRide[] }>(endpoint);
      const nowMs = Date.now();
      const list: NearbyRideWithComputed[] = [];
      for (const r of Array.isArray(json?.rides) ? json.rides : []) {
        if (!isRideUpcomingAt(r.start_time, nowMs)) continue;
        if (viewerUserId && r.host_user_id === viewerUserId) continue;
        list.push({
          ...r,
          distanceKm: haversineKm(c.latitude, c.longitude, r.start_latitude, r.start_longitude),
          startTimeMs: new Date(r.start_time).getTime(),
        });
      }
      // Sort by distance first, then departure time for near ties.
      list.sort((a, b) => {
        if (Math.abs(a.distanceKm - b.distanceKm) > 0.05) return a.distanceKm - b.distanceKm;
        return a.startTimeMs - b.startTimeMs;
      });
      setRides(list);
    } catch (e: any) {
      console.warn("[NearbyRides] fetch failed", e);
      setError("Couldn't load rides. Pull down to try again.");
      setRides([]);
    }
  }, [apiUtil, getCurrentCoords, viewerUserId]);

  // Refocus reload catches permission changes from LocationPermissionScreen.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setNowTick(Date.now());
      const tick = setInterval(() => setNowTick(Date.now()), 30_000);
      (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
        clearInterval(tick);
      };
    }, [load]),
  );

  const visibleRides = useMemo<NearbyRideRow[]>(
    () =>
      rides.flatMap((r) => {
        if (!isRideUpcomingAt(r.start_time, nowTick)) return [];
        // Client-side guard for cached responses that predate viewer context.
        if (viewerUserId && r.host_user_id === viewerUserId) return [];
        if (!hasSeatsLeft(r.total_seats, r.booked_seats)) return [];
        return [{
          ...r,
          dateLabel: formatDate(r.start_time),
          timeLabel: formatTime(r.start_time),
          distanceKm: coords ? r.distanceKm : null,
          seatAvailability: seatsAvailableLabel(r.total_seats, r.booked_seats),
        }];
      }),
    [coords, rides, nowTick, viewerUserId],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const openRide = useCallback((ride: NearbyRideRow) => {
    const nowMs = Date.now();
    if (!isRideUpcomingAt(ride.start_time, nowMs)) {
      setRides((current) =>
        current.filter((r) => isRideUpcomingAt(r.start_time, nowMs)),
      );
      return;
    }
    const {
      distanceKm: _distanceKm,
      startTimeMs: _startTimeMs,
      dateLabel: _dateLabel,
      timeLabel: _timeLabel,
      seatAvailability: _seatAvailability,
      ...ridePayload
    } = ride;
    navigate(appHref("AvailableRidesSelectedScreen", { ride: ridePayload } as any));
  }, [navigate]);

  const renderRide = useCallback(({ item }: { item: NearbyRideRow }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.navFill }]}
        onPress={() => openRide(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.routeBlock}>
            <RouteStack
              tone="onForest"
              start={item.start_location}
              end={item.end_location}
              numberOfLines={1}
            />
          </View>

          <View style={styles.right}>
            <View style={styles.timeRow}>
              <Image source={clockIcon} style={styles.timeIcon} resizeMode="contain" />
              <Text style={styles.timeText}>{item.timeLabel}</Text>
            </View>
            <Text style={styles.dateText}>{item.dateLabel}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.metaText}>
            {item.distanceKm !== null ? `${item.distanceKm.toFixed(1)} km away · ` : ""}
            {item.seatAvailability} seats available
          </Text>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>₹{item.total_price}</Text>
          </View>
        </View>
      </TouchableOpacity>
  ), [openRide, colors]);

  const headerCount = !loading && visibleRides.length > 0
    ? `${visibleRides.length} carpool${visibleRides.length === 1 ? "" : "s"} within 10 km`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.statusBarBackground} barStyle={colors.statusBarStyle} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10, backgroundColor: colors.background }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Rides around you</Text>
        </View>
        {headerCount ? (
          <Text style={[styles.headerSubtitle, colors.mode === "dark" && { color: colors.textSecondary }]}>{headerCount}</Text>
        ) : null}
      </View>

      {loading ? (
        <LoadingComponent />
      ) : needsLocation ? (
        // LocationPermissionScreen returns here after the user decides.
        <EmptyState
          glyph={<SmileyGlyph />}
          title="Allow location"
          body="So we can show carpools heading your way on the map."
          ctaLabel="Allow location"
          onPressCta={() =>
            navigate(
              appHref("LocationPermissionScreen", {
                returnTo: { screen: "NearbyRidesScreen" },
              } as any),
            )
          }
        />
      ) : error ? (
        <EmptyState
          image={require("../../assets/sad.png")}
          title="We hit a snag"
          body={error}
          ctaLabel="Try again"
          onPressCta={onRefresh}
        />
      ) : visibleRides.length === 0 ? (
        <EmptyState
          // Use the caption-less asset so EmptyState owns the copy.
          image={require("../../assets/no-rides-emoji.png")}
          title="No carpools near you"
          body="Be the first to post one going your way — your co-riders will roll in."
          ctaLabel="Post a ride"
          onPressCta={() => {
            // Posting requires auth; AuthSheet resumes this intent after sign-in.
            if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
            navigate(appHref("CreateRide"));
          }}
        />
      ) : (
        <FlatList
          data={visibleRides}
          keyExtractor={(it) => it.id}
          renderItem={renderRide}
          contentContainerStyle={[styles.listContent, tabletScrollContentStyle]}
          ItemSeparatorComponent={NearbyRideSeparator}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppColors.secondaryDarkGreen}
            />
          }
        />
      )}
    </View>
  );
};

function NearbyRideSeparator() {
  return <View style={styles.rideSeparator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.3,
    marginLeft: 6,
  },
  headerSubtitle: {
    marginTop: 8,
    marginLeft: 50,
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.62,
    fontFamily: "NunitoSans_600SemiBold",
  },

  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: 4,
    // Clear the floating bottom nav.
    paddingBottom: MAIN_NAV_BAR_TOP_OFFSET + 24,
  },
  rideSeparator: {
    height: 12,
  },

  // Card surface shared with ride-list rows.
  card: {
    width: "100%",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  routeBlock: {
    flex: 1,
    marginRight: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  routeConnector: {
    marginLeft: 4.5,
    marginVertical: 2,
    width: 2,
    alignItems: "center",
    justifyContent: "space-between",
    height: hp(2.2),
  },
  routeConnectorDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
    backgroundColor: "rgba(181,215,80,0.6)",
  },
  routeText: {
    flex: 1,
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: sizeFor(14, 15, 15.5),
    letterSpacing: -0.15,
  },

  right: {
    alignItems: "flex-end",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeIcon: {
    width: 13,
    height: 13,
    tintColor: AppColors.primaryLightGreen,
  },
  timeText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: sizeFor(12.5, 13, 13.5),
  },
  dateText: {
    marginTop: 4,
    color: AppColors.basicWhite,
    opacity: 0.6,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.2,
  },

  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(181,215,80,0.20)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: {
    color: AppColors.basicWhite,
    opacity: 0.7,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    letterSpacing: -0.05,
  },
  pricePill: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priceText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    letterSpacing: 0.1,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 26,
  },
  primaryCta: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryCtaText: {
    color: AppColors.primaryLightGreen,
    fontSize: 15,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },
});

export default NearbyRidesScreen;
