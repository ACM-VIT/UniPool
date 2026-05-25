import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthGate } from "../../contexts/AuthGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../../design_systems/colors";
import ChevronBack from "../../components/ChevronBack";
import LoadingComponent from "../../components/LoadingComponent";
import EmptyState from "../../components/EmptyState";
import RouteStack from "../../components/RouteStack";
import SmileyGlyph from "../../components/SmileyGlyph";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../../components/MainNavBar";
import { appHref } from "../../navigation/routes";
import { useApi } from "../../utils/ApiUtil";
import { useUser } from "../../contexts/UserContext";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../../utils/responsive";
import { isRideUpcomingAt } from "../../utils/rideTime";

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
  // host_user_id powers the viewer-self filter — without it we'd
  // surface the viewer's own rides as nearby suggestions, which
  // they can't book anyway (server-side gate). The backend already
  // skips them when we pass `exclude_host_user_id`; this is the
  // belt-and-suspenders client check that runs even on stale
  // responses.
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
  seatsLeft: number;
};

const nearbyDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return null;
  }
})();

const nearbyTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return null;
  }
})();

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
 * "Rides around you" — fetches the public `/rides/nearby` endpoint
 * (no auth required) and renders the results as a list of route
 * cards. Each card uses the same dotted-line route idiom + clock-and-
 * price layout as the booking RideCard so the catalogue feels like
 * the same product the user sees everywhere else.
 *
 * Built specifically for guest browse — the only place in the app
 * where someone who isn't signed in can scroll a real catalogue of
 * trips. Tapping a card opens AvailableRidesSelectedScreen, which
 * already handles the sign-in gate when they try to request a seat.
 */
const NearbyRidesScreen: React.FC = () => {
  const router = useRouter();
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
  // Distinct flag for the "permission needed" empty state — keeps the
  // generic `error` strictly for fetch failures so the two surfaces
  // don't share copy ("We hit a snag" doesn't fit a permission gate).
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
      // Use the device's current location to centre the query.
      // If permission isn't granted, surface a dedicated empty state
      // with a working "Allow location" CTA — don't fall through to
      // the generic error path.
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setNeedsLocation(true);
        setRides([]);
        return;
      }
      const c = await getCurrentCoords(forceNetwork);
      setCoords(c);

      // Pass the viewer's user id so the backend drops the viewer's
      // own rides server-side — the surrounding client filter at
      // visibleRides below is the belt-and-suspenders for races and
      // stale-cache responses.
      const excludeParam = viewerUserId
        ? `&exclude_host_user_id=${encodeURIComponent(viewerUserId)}`
        : "";
      const endpoint = `/rides/nearby?lat=${c.latitude.toFixed(4)}&lng=${c.longitude.toFixed(4)}&radius=10000&limit=60${excludeParam}`;
      const json = forceNetwork
        ? await apiUtil.getUncached<{ rides?: NearbyRide[] }>(endpoint)
        : await apiUtil.get<{ rides?: NearbyRide[] }>(endpoint);
      const nowMs = Date.now();
      const list: NearbyRideWithComputed[] = (Array.isArray(json?.rides) ? json.rides : [])
        .filter((r) => isRideUpcomingAt(r.start_time, nowMs))
        .filter((r) => !viewerUserId || r.host_user_id !== viewerUserId)
        .map((r) => ({
          ...r,
          distanceKm: haversineKm(c.latitude, c.longitude, r.start_latitude, r.start_longitude),
          startTimeMs: new Date(r.start_time).getTime(),
        }));
      // Sort by distance from the user, then by start_time within ties.
      // Distance and timestamps are precomputed once per row. The
      // previous comparator recalculated haversine twice per
      // comparison, then visibleRides calculated it all over again.
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

  // Reload on every focus so coming back from LocationPermissionScreen
  // (after the user granted permission) actually refreshes the list
  // instead of leaving them stuck on the "Allow location" empty state.
  // Initial mount also fires this.
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
      rides
        .filter((r) => isRideUpcomingAt(r.start_time, nowTick))
        // Belt-and-suspenders: also drop viewer-hosted rides here so
        // that a cached response from before the user logged in (or
        // an /rides/nearby that landed pre-context) never leaks the
        // viewer's own pins into the list.
        .filter((r) => !viewerUserId || r.host_user_id !== viewerUserId)
        .map((r) => ({
          ...r,
          dateLabel: formatDate(r.start_time),
          timeLabel: formatTime(r.start_time),
          distanceKm: coords ? r.distanceKm : null,
          seatsLeft: Math.max(0, r.total_seats - r.booked_seats),
        })),
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
      seatsLeft: _seatsLeft,
      ...ridePayload
    } = ride;
    router.navigate(appHref("AvailableRidesSelectedScreen", { ride: ridePayload } as any));
  }, [router]);

  const renderRide = useCallback(({ item }: { item: NearbyRideRow }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => openRide(item)}
      >
        <View style={styles.cardTop}>
          {/* Route block — outlined origin dot → dotted connector →
              filled destination dot. Same vocabulary as RideCard,
              PreviousTripsCompressed, and the chat list. */}
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
            {item.seatsLeft} {item.seatsLeft === 1 ? "seat" : "seats"} left
          </Text>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>₹{item.total_price}</Text>
          </View>
        </View>
      </TouchableOpacity>
  ), [openRide]);

  const headerCount = !loading && visibleRides.length > 0
    ? `${visibleRides.length} carpool${visibleRides.length === 1 ? "" : "s"} within 10 km`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rides around you</Text>
        </View>
        {headerCount ? (
          <Text style={styles.headerSubtitle}>{headerCount}</Text>
        ) : null}
      </View>

      {loading ? (
        <LoadingComponent />
      ) : needsLocation ? (
        // Dedicated permission-gate state. Sends the user through
        // LocationPermissionScreen (with the radar + reasoning) and
        // brings them back here after they decide. Same flow we use
        // on first launch.
        //
        // SVG glyph instead of the happy-emoji.png raster — that
        // asset is 38×37 native and rendered at 160px here, which
        // pixelated hard. SmileyGlyph is the canonical crisp
        // replacement already used by EmptyState surfaces elsewhere
        // for the same reason.
        <EmptyState
          glyph={<SmileyGlyph />}
          title="Allow location"
          body="So we can show carpools heading your way on the map."
          ctaLabel="Allow location"
          onPressCta={() =>
            router.navigate(
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
          // Caption-less variant — the full no-rides.png has "Uh Oh!
          // No Rides Available" baked into the artwork, which doubled
          // up with the EmptyState's own title + body. The
          // -emoji.png crop is the canonical empty-state asset across
          // TripsListScreen, PassengerInfo, etc.
          image={require("../../assets/no-rides-emoji.png")}
          title="No carpools near you"
          body="Be the first to post one going your way — your co-riders will roll in."
          ctaLabel="Post a ride"
          onPressCta={() => {
            // Posting requires auth — show the AuthSheet first if the
            // user is a guest, then navigate after sign-in.
            if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
            router.navigate(appHref("CreateRide"));
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
    // Clear the floating bottom nav so the last card has air below
    // it. MAIN_NAV_BAR_TOP_OFFSET = distance from screen bottom to
    // the *top* of the floating nav; +24 gives breathing room.
    paddingBottom: MAIN_NAV_BAR_TOP_OFFSET + 24,
  },
  rideSeparator: {
    height: 12,
  },

  // Forest dark card, same vocabulary as RideCard + the chat list row.
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
