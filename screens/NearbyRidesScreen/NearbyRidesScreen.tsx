import React, { useCallback, useEffect, useState } from "react";
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
import { MAIN_NAV_BAR_TOP_OFFSET } from "../../components/MainNavBar";
import { appHref } from "../../navigation/routes";
import { useApi } from "../../utils/ApiUtil";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const sizeFor = (s: number, m: number, l: number) =>
  isSmallDevice ? s : isMediumDevice ? m : l;

const clockIcon = require("../../assets/clock.png");

type NearbyRide = {
  id: string;
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

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} hrs`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
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
  const { requireAuth } = useAuthGate();
  const { apiUtil } = useApi();
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<NearbyRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Distinct flag for the "permission needed" empty state — keeps the
  // generic `error` strictly for fetch failures so the two surfaces
  // don't share copy ("We hit a snag" doesn't fit a permission gate).
  const [needsLocation, setNeedsLocation] = useState(false);

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
      const { coords: c } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: c.latitude, longitude: c.longitude });

      const endpoint = `/rides/nearby?lat=${c.latitude.toFixed(4)}&lng=${c.longitude.toFixed(4)}&radius=10000&limit=60`;
      const json = forceNetwork
        ? await apiUtil.getUncached<{ rides?: NearbyRide[] }>(endpoint)
        : await apiUtil.get<{ rides?: NearbyRide[] }>(endpoint);
      const list: NearbyRide[] = Array.isArray(json?.rides) ? json.rides : [];
      // Sort by distance from the user, then by start_time within ties.
      list.sort((a, b) => {
        const da = haversineKm(c.latitude, c.longitude, a.start_latitude, a.start_longitude);
        const db = haversineKm(c.latitude, c.longitude, b.start_latitude, b.start_longitude);
        if (Math.abs(da - db) > 0.05) return da - db;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
      setRides(list);
    } catch (e: any) {
      console.warn("[NearbyRides] fetch failed", e);
      setError("Couldn't load rides. Pull down to try again.");
      setRides([]);
    }
  }, [apiUtil]);

  // Reload on every focus so coming back from LocationPermissionScreen
  // (after the user granted permission) actually refreshes the list
  // instead of leaving them stuck on the "Allow location" empty state.
  // Initial mount also fires this.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const openRide = (ride: NearbyRide) => {
    router.navigate(appHref("AvailableRidesSelectedScreen", { ride } as any));
  };

  const renderRide = ({ item }: { item: NearbyRide }) => {
    const distanceKm = coords
      ? haversineKm(coords.latitude, coords.longitude, item.start_latitude, item.start_longitude)
      : null;
    const seatsLeft = Math.max(0, item.total_seats - item.booked_seats);

    return (
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
            <View style={styles.routeRow}>
              <View style={styles.dotOutline} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.start_location}
              </Text>
            </View>
            <View style={styles.routeConnector}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.routeConnectorDash} />
              ))}
            </View>
            <View style={styles.routeRow}>
              <View style={styles.dotFilled} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.end_location}
              </Text>
            </View>
          </View>

          <View style={styles.right}>
            <View style={styles.timeRow}>
              <Image source={clockIcon} style={styles.timeIcon} resizeMode="contain" />
              <Text style={styles.timeText}>{formatTime(item.start_time)}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.metaText}>
            {distanceKm !== null ? `${distanceKm.toFixed(1)} km away · ` : ""}
            {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
          </Text>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>₹{item.total_price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const headerCount = !loading && rides.length > 0
    ? `${rides.length} carpool${rides.length === 1 ? "" : "s"} within 10 km`
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
        <EmptyState
          image={require("../../assets/happy-emoji.png")}
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
      ) : rides.length === 0 ? (
        <EmptyState
          image={require("../../assets/no-rides.png")}
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
          data={rides}
          keyExtractor={(it) => it.id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
