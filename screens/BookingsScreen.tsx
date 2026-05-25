import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import styles from "./ProfileScreen/ProfileScreen.styles";
import { useApi } from "../utils/ApiUtil";
import BrandInfo from "../components/BrandInfo";
import ChevronBack from "../components/ChevronBack";
import RideCard from "../components/RideCard";
import UpNextCard from "../components/UpNextCard";
import AppColors from "../design_systems/colors";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthGate } from "../contexts/AuthGate";
import { useUser } from "../contexts/UserContext";
import LoadingComponent from "../components/LoadingComponent";
import { appHref } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";

interface RawRide {
  id?: string;
  ride_id?: string;
  start_location?: string;
  end_location?: string;
  start_time?: string;
  total_seats?: number;
  booked_seats?: number;
  total_price?: number;
  request_status?: "pending" | "accepted" | "rejected";
  host_user_name?: string;
  host_user_profile_picture_url?: string | null;
  // Hosted-ride payload from /user/rides flattens fields differently
  is_user_host?: boolean;
  [key: string]: any;
}

type Status = "confirmed" | "pending" | "hosting" | "past" | "cancelled";

interface TripItem {
  id: string;
  rideId?: string;
  origin: string;
  destination: string;
  startAt: Date;
  price?: number;
  totalSeats?: number;
  bookedSeats?: number;
  hostName?: string;
  hostAvatarUrl?: string | null;
  /** "Confirmed" / "Pending" / "Hosting" / "Past" / "Cancelled" */
  status: Status;
  /** Where this trip belongs in the tab structure. */
  bucket: "upcoming" | "hosting" | "past";
  dateLabel: string;
  timeLabel: string;
  startTimeIso?: string;
}

type Tab = "upcoming" | "hosting" | "past";
type TripBuckets = Record<Tab, TripItem[]>;

const tripDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
})();

const tripTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
})();

const tripLabels = (date: Date) => {
  if (!date || date.getTime() === 0 || Number.isNaN(date.getTime())) {
    return { dateLabel: "", timeLabel: "", startTimeIso: undefined };
  }
  return {
    dateLabel:
      tripDateFormatter?.format(date) ??
      date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
    timeLabel:
      tripTimeFormatter?.format(date) ??
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    startTimeIso: date.toISOString(),
  };
};

const BookingsScreen: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const { requireAuth } = useAuthGate();
  const { user: viewerUser } = useUser();
  const { apiUtil } = useApi();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const hasFocusedOnceRef = useRef(false);

  const fetchAllUserRides = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const auth = require("@react-native-firebase/auth").getAuth();
      if (!auth.currentUser) {
        setError("Sign in to see your trips.");
        return;
      }

      const ridesData = await apiUtil.get<RawRide[]>("/user/rides");
      const now = new Date();
      const collected: TripItem[] = Array.isArray(ridesData)
        ? ridesData.map((r) => {
            const startAt = r.start_time ? new Date(r.start_time) : new Date(0);
            const isPast = startAt.getTime() < now.getTime();
            const labels = tripLabels(startAt);
            const rideId =
              r.ride_id ||
              r.id ||
              `${r.start_location || "unknown"}-${r.end_location || "unknown"}-${r.start_time || "unknown"}`;
            const viewerState = r.viewer_state;
            const status: Status =
              viewerState === "host" || r.is_user_host
                ? isPast ? "past" : "hosting"
                : viewerState === "rejected_passenger" || r.request_status === "rejected"
                ? "cancelled"
                : viewerState === "pending_passenger" || r.request_status === "pending"
                ? isPast ? "past" : "pending"
                : isPast || viewerState === "past"
                ? "past"
                : "confirmed";
            const bucket: TripItem["bucket"] =
              isPast || status === "past"
                ? "past"
                : status === "hosting"
                ? "hosting"
                : "upcoming";

            return {
              id: `${status === "hosting" ? "host" : "trip"}-${rideId}`,
              rideId,
              origin: r.start_location || "Unknown",
              destination: r.end_location || "Unknown",
              startAt,
              price: r.total_price !== undefined ? Number(r.total_price) : undefined,
              totalSeats: r.total_seats,
              bookedSeats: r.booked_seats,
              hostName: r.host_user_name,
              hostAvatarUrl: r.host_user_profile_picture_url ?? null,
              status,
              bucket,
              ...labels,
            };
          })
        : [];

      // De-dupe by rideId (same ride could appear in both lists)
      const seen = new Set<string>();
      const deduped = collected.filter((t) => {
        const key = `${t.rideId || t.id}-${t.bucket}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTrips(deduped);
    } catch (e: any) {
      if (e?.message === "AUTHENTICATION_REDIRECT") return;
      console.error("Trips fetch failed:", e);
      setError("We couldn't load your trips. Pull to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiUtil]);

  useEffect(() => {
    fetchAllUserRides();
  }, [fetchAllUserRides]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      fetchAllUserRides(true);
    }, [fetchAllUserRides]),
  );

  const tripPresentation = useMemo(() => {
    const buckets: TripBuckets = {
      upcoming: [],
      hosting: [],
      past: [],
    };
    let soonestCandidate: TripItem | null = null;

    for (const trip of trips) {
      buckets[trip.bucket].push(trip);
      if (
        trip.status !== "cancelled" &&
        (trip.bucket === "upcoming" || trip.bucket === "hosting") &&
        (!soonestCandidate || trip.startAt.getTime() < soonestCandidate.startAt.getTime())
      ) {
        soonestCandidate = trip;
      }
    }

    buckets.upcoming.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    buckets.hosting.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    buckets.past.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

    let upNext: TripItem | null = null;
    if (soonestCandidate) {
      const diffMs = soonestCandidate.startAt.getTime() - Date.now();
      upNext = diffMs <= 24 * 60 * 60 * 1000 ? soonestCandidate : null;
    }

    return {
      buckets,
      counts: {
        upcoming: buckets.upcoming.length,
        hosting: buckets.hosting.length,
        past: buckets.past.length,
      },
      upNext,
    };
  }, [trips]);

  const upNext = tripPresentation.upNext;
  const tabbed = tripPresentation.buckets[tab];
  const counts = tripPresentation.counts;

  const navigateToRide = useCallback((rideId?: string) => {
    if (!rideId) return;
    router.navigate(appHref("RideDetailsScreen", { rideId: String(rideId) }));
  }, [router]);

  const navigateToChat = useCallback((rideId?: string, route?: string, destination?: string) => {
    if (!rideId) return;
    // Prefer the short "Trip to <destination>" title — consistent
    // with TripInfo openChat. Falls back to the full route string
    // if the caller hasn't passed a destination separately.
    const shortDest = (destination || "").split(",")[0].trim();
    const title = shortDest
      ? `Trip to ${shortDest}`
      : (route || "Ride chat");
    router.navigate(appHref("ChatMessages", {
      chatId: String(rideId),
      chatTitle: title,
      userId: viewerUser?.id,
      // No subtitle — date metadata doesn't belong under the chat
      // title, matches the rest of the entry points.
      isGroupChat: true,
    }));
  }, [router, viewerUser?.id]);

  const renderTrip = useCallback<ListRenderItem<TripItem>>(({ item }) => {
    const seats =
      item.totalSeats !== undefined && item.bookedSeats !== undefined
        ? `${item.bookedSeats}/${item.totalSeats}`
        : "0/0";
    return (
      <RideCard
        id={item.rideId || item.id}
        origin={item.origin}
        destination={item.destination}
        time={item.timeLabel}
        price={item.price}
        seatsAvailable={seats}
        totalSeats={item.totalSeats}
        date={item.dateLabel}
        status={item.status}
        onSelect={() => navigateToRide(item.rideId)}
        variant="upcoming"
        shareable
        startTimeIso={item.startTimeIso}
      />
    );
  }, [navigateToRide]);

  const refreshTrips = useCallback(() => {
    void fetchAllUserRides(true);
  }, [fetchAllUserRides]);

  const renderEmpty = useCallback(() => {
    const cfg =
      tab === "upcoming"
        ? {
            title: "No upcoming trips",
            body: "Browse rides on your route or post your own. Anything you book will land here.",
            ctaLabel: "Find a ride",
            onPress: () => router.navigate(appHref("HomeScreen")),
          }
        : tab === "hosting"
        ? {
            title: "Not hosting yet",
            body: "Have a regular commute? Post it once and let riders jump in.",
            ctaLabel: "Post a ride",
            onPress: () => {
              if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) return;
              router.navigate(appHref("CreateRide"));
            },
          }
        : {
            title: "No past trips",
            body: "Once you complete a ride it'll show up here so you can re-book or rate it.",
            ctaLabel: "Find a ride",
            onPress: () => router.navigate(appHref("HomeScreen")),
          };
    return (
      <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 24 }}>
        <Image
          // Caption-less variant. no-rides.png has "Uh Oh! No Rides
          // Available" burned into the artwork which collides with
          // the cfg.title + cfg.body the surrounding code prints
          // directly underneath. Same swap we made on the Rides
          // around you / Trips empty states.
          source={require("../assets/no-rides-emoji.png")}
          style={{ width: 140, height: 140, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 20,
            color: AppColors.secondaryDarkGreen,
            fontFamily: "NunitoSans_800ExtraBold",
            letterSpacing: -0.3,
            marginBottom: 6,
          }}
        >
          {cfg.title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 21,
            color: AppColors.secondaryDarkGreen,
            opacity: 0.65,
            textAlign: "center",
            fontFamily: "NunitoSans_400Regular",
            marginBottom: 20,
          }}
        >
          {cfg.body}
        </Text>
        <TouchableOpacity
          onPress={cfg.onPress}
          activeOpacity={0.85}
          style={{
            backgroundColor: AppColors.primaryLightGreen,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: AppColors.secondaryDarkGreen,
              fontFamily: "NunitoSans_700Bold",
              fontSize: 14,
            }}
          >
            {cfg.ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [requireAuth, router, tab]);

  const renderTab = useCallback((key: Tab, label: string, count: number) => {
    const active = tab === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setTab(key)}
        activeOpacity={0.7}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          // Active tab = forest pill on the lime canvas (inverse for
          // strong contrast). Inactive tabs sit transparent.
          backgroundColor: active ? AppColors.secondaryDarkGreen : "transparent",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "NunitoSans_700Bold",
            fontSize: 14,
            color: active ? AppColors.primaryLightGreen : AppColors.inkStrong,
            letterSpacing: -0.1,
          }}
        >
          {label}
        </Text>
        {count > 0 ? (
          <View
            style={{
              marginLeft: 6,
              paddingHorizontal: 7,
              paddingVertical: 1,
              borderRadius: 999,
              backgroundColor: active ? AppColors.primaryLightGreen : AppColors.cardSurface,
            }}
          >
            <Text
              style={{
                fontFamily: "NunitoSans_700Bold",
                fontSize: 11,
                color: AppColors.secondaryDarkGreen,
              }}
            >
              {count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }, [requireAuth, router, tab]);

  const listHeader = useMemo(() => (
    <>
      {upNext ? (
        <UpNextCard
          origin={upNext.origin}
          destination={upNext.destination}
          startTime={upNext.startAt}
          hostName={upNext.hostName}
          hostAvatarUrl={upNext.hostAvatarUrl}
          isHost={upNext.status === "hosting"}
          onChat={() => navigateToChat(upNext.rideId, `${upNext.origin} → ${upNext.destination}`, upNext.destination)}
          onOpen={() => navigateToRide(upNext.rideId)}
        />
      ) : null}

      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginBottom: 16,
          paddingVertical: 4,
        }}
      >
        {renderTab("upcoming", "Upcoming", counts.upcoming)}
        {renderTab("hosting", "Hosting", counts.hosting)}
        {renderTab("past", "Past", counts.past)}
      </View>

      {error ? (
        <View
          style={{
            backgroundColor: AppColors.cardSurface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: AppColors.basicRed,
              fontFamily: "NunitoSans_600SemiBold",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </>
  ), [counts.hosting, counts.past, counts.upcoming, error, navigateToChat, navigateToRide, renderTab, upNext]);

  if (loading) {
    return (
      <View style={[styles.container, tabletContentStyle]}>
        <View style={styles.brandInfoHeaderRow}>
          <BrandInfo />
        </View>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronBack />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your trips</Text>
          </View>
        </View>
        <LoadingComponent label="Pulling your trips…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your trips</Text>
        </View>
      </View>

      <FlatList
        data={tabbed}
        keyExtractor={(t) => t.id}
        renderItem={renderTrip}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={48}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshTrips} />
        }
      />
    </View>
  );
};

export default BookingsScreen;
