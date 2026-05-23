import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabletContentStyle } from "../../utils/responsive";
import { seatsAvailableLabel } from "../../utils/seatMath";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import RideCardSkeleton from "../../components/RideCardSkeleton";
import RideCard from "../../components/RideCard";
import EmptyState from "../../components/EmptyState";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthGate } from "../../contexts/AuthGate";
import { appHref } from "../../navigation/routes";

export interface RideData {
  id?: string;
  ride_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
  host_user_id?: string;
  is_user_host?: boolean;
  request_status?: string;
  // Server-computed UI state. New canonical source of truth for
  // "what's my relationship to this ride?" — see ResolveViewerState
  // in the backend.
  viewer_state?:
    | "host"
    | "confirmed_passenger"
    | "pending_passenger"
    | "rejected_passenger"
    | "available"
    | "full"
    | "past";
  viewer_booking_id?: string;
}

type TabKey = "upcoming" | "hosting" | "past";

const formatHHMM = (iso: string): string => {
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}${mm} hrs`;
  } catch {
    return "";
  }
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const BookingScreen: React.FC = () => {
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  // Separate flag for pull-to-refresh so the existing list stays
  // mounted (no "Loading…" full-screen state) while the user yanks
  // the FlatList down to re-fetch. `loading` is for the FIRST mount
  // when there's no data yet; `refreshing` is for everything after.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("upcoming");
  // Once the user manually picks a tab, the smart-default effect
  // stops nudging them — auto-defaulting on every refetch would
  // yank the user out of the bucket they were looking at.
  const userPickedTabRef = useRef(false);
  // Ride IDs that have unrated counterparts for the viewer, surfaced
  // as a "Rate ↗" pill on the corresponding past-tab row. Replaces
  // the old BrandedAlert popup on HomeScreen focus — the affordance
  // now lives in context next to the trip the rating belongs to.
  const [pendingRatingRideIds, setPendingRatingRideIds] = useState<Set<string>>(new Set());
  // Backend UUID for the current user — NOT the Firebase uid.
  // `host_user_id` on a ride comes from the backend's `users.id`
  // column; the Firebase uid is unrelated. Comparing the two
  // (the old behaviour) meant "Hosting" never matched any ride.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { apiUtil } = useApi();
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const insets = useSafeAreaInsets();
  // iPad-only: phone-shape centred column so the empty state and
  // tab pills sit in a digestible width instead of floating in
  // 1032pt of lime canvas. Hook returns null on phones — mobile
  // layout is untouched.
  const tabletContentStyle = useTabletContentStyle();
  // Live window dimensions for orientation-aware airplane
  // positioning. The static styles in BookingScreen.styles.ts
  // capture Dimensions.get() once at module load (always portrait
  // on iPad), so a landscape rotation leaves the airplane stranded
  // in the bottom-right corner instead of resting on the centred
  // navbar's right edge. Computing the right offset live here
  // restores the on-rail alignment in any orientation.
  const liveWindow = useWindowDimensions();
  const airplaneRightOffset =
    liveWindow.width >= 768
      ? (liveWindow.width - 540) / 2 - 23
      : undefined;

  const fetchAll = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
      // Only show the full-screen loading state on the first fetch.
      // Refreshes keep the list mounted and use the `refreshing` flag
      // so the user sees the existing rides while the new data arrives.
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const auth = require("@react-native-firebase/auth").getAuth();
        if (!auth.currentUser) {
          setError("Please sign in to view your trips");
          return;
        }
        // Resolve the backend user id + the user's rides + the
        // pending-ratings list in parallel. Pending-ratings used to
        // be a Home-screen popup; it now drives the "Rate ↗" pill
        // on past-trip rows so the affordance lives next to the
        // trip you'd actually rate.
        const [details, ridesData, ratingsResp] = await Promise.all([
          apiUtil.getUncached<any>("/user/details").catch(() => null),
          apiUtil.getUncached<any>("/user/rides"),
          apiUtil
            .getUncached<{ rides: { ride_id: string }[] }>("/user/pending-ratings")
            .catch(() => ({ rides: [] })),
        ]);
        const myId: string | undefined = details?.user?.id ?? details?.id;
        if (myId) setCurrentUserId(myId);
        setRides(Array.isArray(ridesData) ? ridesData : []);
        const pendingSet = new Set<string>();
        for (const r of ratingsResp?.rides ?? []) {
          if (r?.ride_id) pendingSet.add(r.ride_id);
        }
        setPendingRatingRideIds(pendingSet);
      } catch (err: any) {
        if (err.message === "AUTHENTICATION_REDIRECT") return;
        setError(err.message || "Failed to fetch trips");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [apiUtil]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  // Bucket rides into the three tabs by the server-computed
  // viewer_state. No more client-side "isHost && hasBooking" math —
  // the API tells us exactly what the user's relationship to each
  // ride is.
  const buckets = useMemo(() => {
    const upcoming: RideData[] = [];
    const hosting: RideData[] = [];
    const past: RideData[] = [];
    const seen = new Set<string>();
    for (const ride of rides) {
      const rid = ride.ride_id || ride.id;
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);
      const startMs = new Date(ride.start_time).getTime();
      if (Number.isNaN(startMs)) continue;

      // Prefer the server's viewer_state. Fall back to legacy
      // derivation only if the API hasn't been updated yet (e.g.
      // pre-migration clients hitting an older build).
      const state =
        ride.viewer_state ??
        (ride.is_user_host || ride.host_user_id === currentUserId
          ? "host"
          : startMs < Date.now() - 24 * 60 * 60 * 1000
          ? "past"
          : "available");

      switch (state) {
        case "past":
          past.push(ride);
          break;
        case "host":
          hosting.push(ride);
          break;
        case "confirmed_passenger":
        case "pending_passenger":
        case "rejected_passenger":
        case "available":
        case "full":
        default:
          upcoming.push(ride);
          break;
      }
    }
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    hosting.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    return { upcoming, hosting, past };
  }, [rides, currentUserId]);

  const tabRides = buckets[tab];
  const counts = {
    upcoming: buckets.upcoming.length,
    hosting: buckets.hosting.length,
    past: buckets.past.length,
  };

  // Smart default: on first load, jump to the first non-empty bucket
  // in [upcoming, hosting, past] order so a user who hosts but has
  // no upcoming bookings doesn't open the screen onto an empty pane
  // and assume the app is broken. Once the user explicitly taps a
  // tab, the auto-pick stops firing — refetches don't yank them
  // back to a bucket they navigated away from.
  useEffect(() => {
    if (userPickedTabRef.current || loading) return;
    const order: TabKey[] = ["upcoming", "hosting", "past"];
    const winner = order.find((k) => counts[k] > 0);
    if (winner && winner !== tab) {
      setTab(winner);
    }
  }, [counts.upcoming, counts.hosting, counts.past, loading, tab]);

  const openRide = (rideId: string) => {
    if (!rideId) return;
    router.navigate(appHref("RideDetailsScreen", { rideId }));
  };

  // Empty-state copy is intentionally terse. Mobbin pattern across
  // Uber / Bolt / inDrive: one line + one CTA, nothing else.
  const renderEmpty = () => {
    const copy =
      tab === "upcoming"
        ? {
            title: "Nothing booked yet",
            body: "When you grab a seat or post a ride, it'll show up here.",
            cta: { label: "Find a ride", to: "HomeScreen" as const },
          }
        : tab === "hosting"
        ? {
            title: "Not hosting yet",
            body: "Got a free seat next trip? Post it and split the fare.",
            cta: { label: "Post a ride", to: "CreateRide" as const },
          }
        : {
            title: "No past trips",
            body: "Your ride history shows up here once you've taken one.",
            cta: { label: "Find a ride", to: "HomeScreen" as const },
          };
    const handleEmptyCta = () => {
      if (copy.cta.to === "HomeScreen") {
        router.replace(appHref(copy.cta.to));
        return;
      }
      // CreateRide path — posting needs an account, so prompt for
      // sign-in before sending the user into the form. Same gate is
      // duplicated at submit time as a safety net.
      if (copy.cta.to === "CreateRide") {
        if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
      }
      router.navigate(appHref(copy.cta.to));
    };

    return (
      <EmptyState
        // Emoji-only crop of the no-rides illustration — the
        // original asset has "Uh Oh! No Rides Available" text baked
        // in, which collided with our own title + body below it.
        image={require("../../assets/no-rides-emoji.png")}
        imageSize={140}
        title={copy.title}
        body={copy.body}
        ctaLabel={copy.cta.label}
        onPressCta={handleEmptyCta}
        // Anchor the content to the top half of the screen so the
        // BookingScreen's airplane decoration at the bottom stays
        // visible without overlapping the CTA.
        topAlign
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      {/* Plane rendered first so it sits *behind* everything — list
          cards float over it. Wrapper's bottom edge = navbar's top
          edge; overflow:hidden clips the transparent padding under
          the wheels so they rest on the rail.
          Hidden once the list densifies past ~2 cards — beyond that
          the plane peeks between cards as visual noise instead of a
          friendly empty-state cue. The list scrolls naturally to
          show the rest. */}
      {tabRides.length <= 2 ? (
        <View
          style={[
            styles.airplaneWrap,
            airplaneRightOffset !== undefined && { right: airplaneRightOffset },
          ]}
          pointerEvents="none"
        >
          <Image
            source={require("../../assets/airplane.png")}
            style={styles.airplaneImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* Centred content column. The outer `container` keeps the
          full-width lime brand canvas (so the airplane has room to
          rest on the navbar rail), while everything user-facing
          inside this wrapper sits in a phone-shape column centred
          horizontally on iPad. On phone `tabletContentStyle` is
          null so this is just `flex: 1`. */}
      <View style={[{ flex: 1 }, tabletContentStyle]}>
      {/* Header — title only. Mobbin pattern across Uber, Bolt,
          inDrive: bold title, no help copy, tabs do the explaining. */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <Text style={styles.headerTitle}>Your trips</Text>
      </View>

      {/* Tab pills — three buckets with counts. */}
      <View style={styles.tabsRow}>
        {(["upcoming", "hosting", "past"] as const).map((key) => {
          const active = tab === key;
          const label = key === "upcoming" ? "Upcoming" : key === "hosting" ? "Hosting" : "Past";
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => {
                // Mark the user as having explicitly chosen a tab so
                // the smart-default effect stops nudging them.
                userPickedTabRef.current = true;
                setTab(key);
              }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              {counts[key] > 0 ? (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                    {counts[key]}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        // Skeleton list instead of a generic spinner. Three
        // `RideCardSkeleton` rows occupy the same vertical space
        // three real `RideCard`s would, so the swap to real data is
        // a content fade rather than a layout jump. Same `cardSlot`
        // wrapper the real list uses for inter-card spacing.
        <View style={styles.listContent}>
          {[0, 1, 2].map((i) => (
            <View key={`skeleton-${i}`} style={styles.cardSlot}>
              <RideCardSkeleton />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : tabRides.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={tabRides}
          keyExtractor={(item) => item.ride_id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          // Pull-to-refresh — yanks `/user/rides` again without
          // tearing down the list mid-fetch. Forest spinner on the
          // lime canvas to match the brand instead of the system
          // grey default.
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll({ refresh: true })}
              tintColor={AppColors.secondaryDarkGreen}
              colors={[AppColors.secondaryDarkGreen]}
            />
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const rideId = item.ride_id || item.id || "";
            // RideCard renders this string as "X seats available".
            // The pre-migration code passed `booked/total` which read
            // as "X booked", contradicting the label. Route through
            // utils/seatMath so the format matches the label
            // ("available out of passenger capacity") and stays
            // consistent with the available-rides / ride-details
            // screens.
            const remaining = seatsAvailableLabel(item.total_seats || 0, item.booked_seats || 0);
            const hasPendingRating = pendingRatingRideIds.has(rideId);
            return (
              <View style={styles.cardSlot}>
                <RideCard
                  id={rideId}
                  origin={item.start_location}
                  destination={item.end_location}
                  time={formatHHMM(item.start_time)}
                  price={item.total_price}
                  seatsAvailable={remaining}
                  totalSeats={item.total_seats}
                  variant={item.is_ongoing === 1 ? "inprogress" : "upcoming"}
                  date={formatDate(item.start_time)}
                  isPending={
                    item.viewer_state === "pending_passenger" ||
                    item.request_status === "pending"
                  }
                  onSelect={() => openRide(rideId)}
                  shareable
                  startTimeIso={item.start_time}
                />
                {/* Rating affordance — moved here from the old
                    HomeScreen popup. Sits as a soft pill beneath
                    the trip card. Only renders for past trips with
                    at least one unrated counterpart (driven by
                    /user/pending-ratings). Tapping routes into the
                    rating screen for this specific ride; the
                    BrandedAlert that used to interrupt every Home
                    focus is gone. */}
                {tab === "past" && hasPendingRating ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.navigate(
                        appHref("PostTripRatingScreen", { rideId }),
                      )
                    }
                    activeOpacity={0.85}
                    accessibilityLabel="Rate this trip"
                    style={{
                      marginTop: 10,
                      marginLeft: 4,
                      alignSelf: "flex-start",
                      backgroundColor: AppColors.primaryLightGreen,
                      borderWidth: 1.5,
                      borderColor: AppColors.secondaryDarkGreen,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, lineHeight: 14 }}>★</Text>
                    <Text
                      style={{
                        fontFamily: "NunitoSans_800ExtraBold",
                        fontSize: 12.5,
                        color: AppColors.secondaryDarkGreen,
                        letterSpacing: 0.2,
                      }}
                    >
                      Rate this trip
                    </Text>
                    <Text
                      style={{
                        fontFamily: "NunitoSans_800ExtraBold",
                        fontSize: 12,
                        color: AppColors.secondaryDarkGreen,
                        opacity: 0.55,
                        marginLeft: -2,
                      }}
                    >
                      ↗
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}
      </View>
    </View>
  );
};

export default BookingScreen;
