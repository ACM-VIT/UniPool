import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import styles from "./ProfileScreen/ProfileScreen.styles";
import { useApi } from "../utils/ApiUtil";
import BrandInfo from "../components/BrandInfo";
import ChevronBack from "../components/ChevronBack";
import RideCard from "../components/RideCard";
import UpNextCard from "../components/UpNextCard";
import AppColors from "../design_systems/colors";
import { useRouter } from "expo-router";
import { useAuthGate } from "../contexts/AuthGate";
import LoadingComponent from "../components/LoadingComponent";
import { appHref } from "../navigation/routes";

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

interface RawBooking {
  id: string;
  ride_id?: string;
  request_status?: "pending" | "accepted" | "rejected";
  ride_details?: RawRide;
  ride?: RawRide;
  [key: string]: any;
}

interface BookingsResponse {
  bookings: RawBooking[];
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
}

type Tab = "upcoming" | "hosting" | "past";

const BookingsScreen: React.FC = () => {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const { apiUtil } = useApi();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

  const fetchAllUserRides = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const auth = require("@react-native-firebase/auth").getAuth();
      if (!auth.currentUser) {
        setError("Sign in to see your trips.");
        return;
      }

      const [bookingsRes, hostedRes] = await Promise.allSettled([
        apiUtil.get<BookingsResponse>("/booking/list"),
        apiUtil.get<RawRide[]>("/user/rides"),
      ]);

      const now = new Date();
      const collected: TripItem[] = [];

      // 1. Passenger bookings
      if (bookingsRes.status === "fulfilled" && bookingsRes.value?.bookings) {
        for (const b of bookingsRes.value.bookings) {
          const details = b.ride_details || b.ride || {};
          const startAt = details.start_time ? new Date(details.start_time) : new Date(0);
          const isPast = startAt.getTime() < now.getTime();
          const status: Status =
            b.request_status === "rejected"
              ? "cancelled"
              : b.request_status === "pending"
              ? isPast ? "past" : "pending"
              : isPast
              ? "past"
              : "confirmed";
          collected.push({
            id: b.id,
            rideId: b.ride_id || details.ride_id || details.id,
            origin: details.start_location || "Unknown",
            destination: details.end_location || "Unknown",
            startAt,
            price: details.total_price !== undefined ? Number(details.total_price) : undefined,
            totalSeats: details.total_seats,
            bookedSeats: details.booked_seats,
            hostName: details.host_user_name,
            hostAvatarUrl: details.host_user_profile_picture_url ?? null,
            status,
            bucket: isPast ? "past" : "upcoming",
          });
        }
      }

      // 2. Hosted rides
      if (hostedRes.status === "fulfilled" && Array.isArray(hostedRes.value)) {
        for (const r of hostedRes.value) {
          if (r.is_user_host === false) continue;
          const startAt = r.start_time ? new Date(r.start_time) : new Date(0);
          const isPast = startAt.getTime() < now.getTime();
          collected.push({
            id: `host-${r.ride_id || r.id || Math.random()}`,
            rideId: r.ride_id || r.id,
            origin: r.start_location || "Unknown",
            destination: r.end_location || "Unknown",
            startAt,
            price: r.total_price,
            totalSeats: r.total_seats,
            bookedSeats: r.booked_seats,
            status: isPast ? "past" : "hosting",
            bucket: isPast ? "past" : "hosting",
          });
        }
      }

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
  };

  useEffect(() => {
    fetchAllUserRides();
  }, [apiUtil]);

  // Soonest upcoming ride for the "Up next" hero. Must start within 24h to
  // earn the slot — otherwise the hero would always be the next future
  // event, even weeks out, which feels untruthful.
  const upNext = useMemo<TripItem | null>(() => {
    const candidates = trips
      .filter((t) => (t.bucket === "upcoming" || t.bucket === "hosting") && t.status !== "cancelled")
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    if (!candidates.length) return null;
    const first = candidates[0];
    const diffMs = first.startAt.getTime() - Date.now();
    if (diffMs > 24 * 60 * 60 * 1000) return null;
    return first;
  }, [trips]);

  const tabbed = useMemo(() => {
    const filtered = trips.filter((t) => t.bucket === tab);
    return filtered.sort((a, b) =>
      tab === "past"
        ? b.startAt.getTime() - a.startAt.getTime()
        : a.startAt.getTime() - b.startAt.getTime()
    );
  }, [trips, tab]);

  const counts = useMemo(() => {
    return {
      upcoming: trips.filter((t) => t.bucket === "upcoming").length,
      hosting: trips.filter((t) => t.bucket === "hosting").length,
      past: trips.filter((t) => t.bucket === "past").length,
    };
  }, [trips]);

  const navigateToRide = (rideId?: string) => {
    if (!rideId) return;
    router.navigate(appHref("RideDetailsScreen", { rideId: String(rideId) }));
  };

  const navigateToChat = (rideId?: string, route?: string, destination?: string) => {
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
      // No subtitle — date metadata doesn't belong under the chat
      // title, matches the rest of the entry points.
      isGroupChat: true,
    }));
  };

  const renderTrip: ListRenderItem<TripItem> = ({ item }) => {
    const seats =
      item.totalSeats !== undefined && item.bookedSeats !== undefined
        ? `${item.bookedSeats}/${item.totalSeats}`
        : "0/0";
    const date = item.startAt
      ? item.startAt.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })
      : "";
    const time = item.startAt
      ? item.startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return (
      <RideCard
        id={item.rideId || item.id}
        origin={item.origin}
        destination={item.destination}
        time={time}
        price={item.price}
        seatsAvailable={seats}
        totalSeats={item.totalSeats}
        date={date}
        status={item.status}
        onSelect={() => navigateToRide(item.rideId)}
        variant="upcoming"
        shareable
        startTimeIso={item.startAt ? item.startAt.toISOString() : undefined}
      />
    );
  };

  const renderEmpty = () => {
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
            body: "Have a regular commute? Post it once and let classmates jump in.",
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
          source={require("../assets/no-rides.png")}
          style={{ width: 160, height: 180, marginBottom: 16 }}
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
  };

  const renderTab = (key: Tab, label: string, count: number) => {
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
  };

  if (loading) {
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

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAllUserRides(true)} />
        }
      >
        {/* Up Next hero — only when something's starting in 24h */}
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

        {/* Tab bar */}
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

        {tabbed.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            scrollEnabled={false}
            data={tabbed}
            keyExtractor={(t) => t.id}
            renderItem={renderTrip}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default BookingsScreen;
