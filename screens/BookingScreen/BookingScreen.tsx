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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabletContentStyle } from "../../utils/responsive";
import { seatsAvailableLabel } from "../../utils/seatMath";
import { createDateTimeFormatter } from "../../utils/rideTime";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import RideCardSkeleton from "../../components/RideCardSkeleton";
import RideCard from "../../components/RideCard";
import EmptyState from "../../components/EmptyState";
import PressableScale from "../../components/PressableScale";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthGate } from "../../contexts/AuthGate";
import { useThemeColors } from "../../contexts/ThemeContext";
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
  // Server-computed relationship between the current viewer and this ride.
  viewer_state?:
    | "host"
    | "confirmed_passenger"
    | "pending_passenger"
    | "rejected_passenger"
    | "available"
    | "full"
    | "past";
  actions?: {
    can_request_seat?: boolean;
    can_cancel_booking?: boolean;
    can_cancel_ride?: boolean;
    can_accept_passengers?: boolean;
    can_open_chat?: boolean;
    can_rate?: boolean;
  };
  viewer_booking_id?: string;
}

type TabKey = "upcoming" | "hosting" | "past";
type RideRow = RideData & {
  rideId: string;
  startTimeMs: number;
  timeLabel: string;
  dateLabel: string;
  seatsAvailableLabel: string;
  hasPendingRating: boolean;
};

const bookingDateFormatter = createDateTimeFormatter("en-GB", {
  day: "2-digit",
  month: "short",
});

const formatHHMM = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")} hrs`;
  } catch {
    return "";
  }
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return bookingDateFormatter?.format(d) ?? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const BookingScreen: React.FC = () => {
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  // Keep the list mounted during pull-to-refresh; `loading` is only for the
  // initial empty mount.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("upcoming");
  // Once the user picks a tab, refetches should not auto-switch it.
  const userPickedTabRef = useRef(false);
  const hasFocusedOnceRef = useRef(false);
  const { apiUtil } = useApi();
  const { navigate, replace } = useRouter();
  const { requireAuth } = useAuthGate();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  // iPad-only centered column; phones keep the default full-width layout.
  const tabletContentStyle = useTabletContentStyle();
  // Keep the decorative airplane aligned with the centered nav on rotation.
  const liveWindow = useWindowDimensions();
  const airplaneRightOffset =
    liveWindow.width >= 768
      ? (liveWindow.width - 540) / 2 - 23
      : undefined;

  const fetchAll = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
      // Full-screen loading is only for the first fetch; refreshes use the
      // FlatList refresh control while current rows stay visible.
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
        // `/user/rides` includes viewer_state and actions, so no extra
        // profile request is needed to infer host/passenger state.
        const ridesData = await apiUtil.get<any>("/user/rides");
        setRides(Array.isArray(ridesData) ? ridesData : []);
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
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      fetchAll({ refresh: true });
    }, [fetchAll]),
  );

  // Bucket rides by the server-computed viewer_state.
  const buckets = useMemo(() => {
    const upcoming: RideRow[] = [];
    const hosting: RideRow[] = [];
    const past: RideRow[] = [];
    const seen = new Set<string>();
    const nowMs = Date.now();
    for (const ride of rides) {
      const rid = ride.ride_id || ride.id;
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);
      const startMs = new Date(ride.start_time).getTime();
      if (Number.isNaN(startMs)) continue;

      // Keep a legacy fallback for older API responses without viewer_state.
      const state =
        ride.viewer_state ??
        (ride.is_user_host
          ? "host"
          : startMs < nowMs - 24 * 60 * 60 * 1000
          ? "past"
          : "available");
      const row: RideRow = {
        ...ride,
        rideId: rid,
        startTimeMs: startMs,
        timeLabel: formatHHMM(ride.start_time),
        dateLabel: formatDate(ride.start_time),
        seatsAvailableLabel: seatsAvailableLabel(ride.total_seats || 0, ride.booked_seats || 0),
        hasPendingRating: ride.actions?.can_rate === true,
      };

      switch (state) {
        case "past":
          past.push(row);
          break;
        case "host":
          hosting.push(row);
          break;
        case "confirmed_passenger":
        case "pending_passenger":
        case "rejected_passenger":
        case "available":
        case "full":
        default:
          upcoming.push(row);
          break;
      }
    }
    upcoming.sort((a, b) => a.startTimeMs - b.startTimeMs);
    hosting.sort((a, b) => a.startTimeMs - b.startTimeMs);
    past.sort((a, b) => b.startTimeMs - a.startTimeMs);
    return { upcoming, hosting, past };
  }, [rides]);

  const tabRides = buckets[tab];
  const counts = {
    upcoming: buckets.upcoming.length,
    hosting: buckets.hosting.length,
    past: buckets.past.length,
  };

  // First load opens the first non-empty tab, then preserves manual tab choice.
  useEffect(() => {
    if (userPickedTabRef.current || loading) return;
    const order: TabKey[] = ["upcoming", "hosting", "past"];
    const winner = order.find((k) => counts[k] > 0);
    if (winner && winner !== tab) {
      setTab(winner);
    }
  }, [counts.upcoming, counts.hosting, counts.past, loading, tab]);

  const openRide = useCallback((rideId: string) => {
    if (!rideId) return;
    navigate(appHref("RideDetailsScreen", { rideId }));
  }, [navigate]);

  const renderTrip = useCallback(({ item }: { item: RideRow }) => (
    <View style={styles.cardSlot}>
      <RideCard
        id={item.rideId}
        origin={item.start_location}
        destination={item.end_location}
        time={item.timeLabel}
        price={item.total_price}
        seatsAvailable={item.seatsAvailableLabel}
        totalSeats={item.total_seats}
        variant={item.is_ongoing === 1 ? "inprogress" : "upcoming"}
        date={item.dateLabel}
        isPending={
          item.viewer_state === "pending_passenger" ||
          item.request_status === "pending"
        }
        onSelect={() => openRide(item.rideId)}
        shareable
        startTimeIso={item.start_time}
      />
      {tab === "past" && item.hasPendingRating ? (
        <PressableScale
          onPress={() =>
            navigate(
              appHref("PostTripRatingScreen", { rideId: item.rideId }),
            )
          }
          accessibilityLabel="Rate this trip"
          style={styles.ratePill}
        >
          <Text style={styles.ratePillStar}>★</Text>
          <Text style={styles.ratePillText}>Rate this trip</Text>
          <Text style={styles.ratePillArrow}>↗</Text>
        </PressableScale>
      ) : null}
    </View>
  ), [openRide, navigate, tab]);

  // Empty-state copy stays terse: one line plus one CTA.
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
        replace(appHref(copy.cta.to));
        return;
      }
      // CreateRide path — posting needs an account, so prompt for
      // sign-in before sending the user into the form. Same gate is
      // duplicated at submit time as a safety net.
      if (copy.cta.to === "CreateRide") {
        if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
      }
      navigate(appHref(copy.cta.to));
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.statusBarBackground}
        barStyle={colors.statusBarStyle}
      />

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
      {/* Header is title-only; tabs explain the buckets. */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Your trips</Text>
      </View>

      {/* Tab pills — three buckets with counts. */}
      <View style={styles.tabsRow}>
        {(["upcoming", "hosting", "past"] as const).map((key) => {
          const active = tab === key;
          const label = key === "upcoming" ? "Upcoming" : key === "hosting" ? "Hosting" : "Past";
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabBtn,
                // Inactive pill: faint hairline tint. Light mode
                // resolves to the historical rgba(38,59,51,0.08)
                // (forest at 8% on the lime canvas — barely there);
                // dark mode resolves to the white-ish inkSubtle for
                // the same "barely there" feel against charcoal.
                !active && { backgroundColor: colors.inkSubtle },
                active && styles.tabBtnActive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                // Mark the user as having explicitly chosen a tab so
                // the smart-default effect stops nudging them.
                userPickedTabRef.current = true;
                setTab(key);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  !active && { color: colors.textPrimary },
                  active && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
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
          keyExtractor={(item) => item.rideId}
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
          renderItem={renderTrip}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={48}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}
      </View>
    </View>
  );
};

export default BookingScreen;
