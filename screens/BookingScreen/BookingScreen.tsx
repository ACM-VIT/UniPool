import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import LoadingComponent from "../../components/LoadingComponent";
import RideCard from "../../components/RideCard";

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
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("upcoming");
  // Backend UUID for the current user — NOT the Firebase uid.
  // `host_user_id` on a ride comes from the backend's `users.id`
  // column; the Firebase uid is unrelated. Comparing the two
  // (the old behaviour) meant "Hosting" never matched any ride.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { apiUtil } = useApi();
  const navigation = require("@react-navigation/native").useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = require("@react-native-firebase/auth").getAuth();
        if (!auth.currentUser) {
          setError("Please sign in to view your trips");
          return;
        }
        // Resolve the backend user id + the user's rides in parallel
        // so the Hosting / Upcoming bucketing has the right key to
        // compare against `host_user_id`.
        const [details, ridesData] = await Promise.all([
          apiUtil.get<any>("/user/details").catch(() => null),
          apiUtil.get<any>("/user/rides"),
        ]);
        const myId: string | undefined = details?.user?.id ?? details?.id;
        if (myId) setCurrentUserId(myId);
        setRides(Array.isArray(ridesData) ? ridesData : []);
      } catch (err: any) {
        if (err.message === "AUTHENTICATION_REDIRECT") return;
        setError(err.message || "Failed to fetch trips");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [apiUtil]);

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

  const openRide = (rideId: string) => {
    if (!rideId) return;
    navigation.navigate("RideDetailsScreen", { rideId });
  };

  // Empty-state copy is intentionally terse. Mobbin pattern across
  // Uber / Bolt / inDrive: one line + one CTA, nothing else.
  const renderEmpty = () => {
    const copy =
      tab === "upcoming"
        ? { title: "Nothing booked yet", cta: { label: "Find a ride", to: "HomeScreen" as const } }
        : tab === "hosting"
        ? { title: "Not hosting yet", cta: { label: "Post a ride", to: "CreateRide" as const } }
        : { title: "No past trips", cta: { label: "Find a ride", to: "HomeScreen" as const } };

    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>{copy.title}</Text>
        <TouchableOpacity
          style={styles.primaryCta}
          activeOpacity={0.85}
          onPress={() => (navigation as any).navigate(copy.cta.to)}
        >
          <Text style={styles.primaryCtaText}>{copy.cta.label}</Text>
        </TouchableOpacity>
      </View>
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
        <View style={styles.airplaneWrap} pointerEvents="none">
          <Image
            source={require("../../assets/airplane.png")}
            style={styles.airplaneImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

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
              onPress={() => setTab(key)}
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
        <LoadingComponent />
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const rideId = item.ride_id || item.id || "";
            const remaining = `${item.booked_seats}/${item.total_seats}`;
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
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

export default BookingScreen;
