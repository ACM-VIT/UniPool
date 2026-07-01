// Web variant of Bookings. Lists the rides you have booked or are
// hosting from /user/rides, split into upcoming, hosting, and past with a
// status on each. A quiet white list with hairline-divided rows; tapping
// a row opens the ride.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import { titleCaseLocation } from "../components/web/format";
import { WEB, RADIUS, FONT, cardBorder } from "../components/web/theme";

type RawRide = {
  id?: string;
  ride_id?: string;
  start_location?: string;
  end_location?: string;
  start_time?: string;
  total_price?: number;
  request_status?: string;
  is_user_host?: boolean;
  viewer_state?: string;
};

type Bucket = "upcoming" | "hosting" | "past";
type Trip = {
  rideId: string;
  origin: string;
  destination: string;
  startAt: number;
  price?: number;
  status: string;
  bucket: Bucket;
};

const TABS: { key: Bucket; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "hosting", label: "Hosting" },
  { key: "past", label: "Past" },
];

const fmtMeta = (ms: number) => {
  try {
    const d = new Date(ms);
    return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  } catch {
    return "";
  }
};

const normalize = (r: RawRide, now: number): Trip | null => {
  const rideId = r.ride_id || r.id;
  if (!rideId) return null;
  const startAt = r.start_time ? new Date(r.start_time).getTime() : 0;
  const isHost = r.viewer_state === "host" || r.is_user_host;
  const isPast = r.viewer_state === "past" || (startAt && startAt < now);

  let bucket: Bucket = "upcoming";
  if (isHost) bucket = "hosting";
  else if (isPast) bucket = "past";

  let status = "Confirmed";
  if (isHost) status = "Hosting";
  else if (r.viewer_state === "pending_passenger" || r.request_status === "pending") status = "Requested";
  else if (r.viewer_state === "rejected_passenger" || r.request_status === "rejected") status = "Declined";
  else if (isPast) status = "Completed";

  return {
    rideId: String(rideId),
    origin: titleCaseLocation(r.start_location) || "Ride",
    destination: titleCaseLocation(r.end_location) || "",
    startAt,
    price: r.total_price,
    status,
    bucket,
  };
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const good = status === "Hosting" || status === "Confirmed";
  const bad = status === "Declined";
  return (
    <View style={[styles.statusPill, good && styles.statusGood, bad && styles.statusBad]}>
      <Text style={[styles.statusText, good && styles.statusTextGood]}>{status}</Text>
    </View>
  );
};

const BookingsScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest } = useAuthGate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Bucket>("upcoming");

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<RawRide[]>("/user/rides");
      const now = Date.now();
      const list = (Array.isArray(resp) ? resp : [])
        .map((r) => normalize(r, now))
        .filter((t): t is Trip => Boolean(t));
      setTrips(list);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [apiUtil]);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    void load();
  }, [isGuest, load]);

  const shown = useMemo(() => {
    const list = trips.filter((t) => t.bucket === tab);
    return list.sort((a, b) => (tab === "past" ? b.startAt - a.startAt : a.startAt - b.startAt));
  }, [trips, tab]);

  if (isGuest) {
    return (
      <WebShell active="TripsListScreen">
        <View style={styles.wrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sign in to see your bookings</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("AuthScreen"))}>
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell active="TripsListScreen">
      <View style={styles.wrap}>
        <Text style={styles.title}>Your rides</Text>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={WEB.forest} /></View>
        ) : shown.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>{tab === "hosting" ? "Post a ride to start hosting." : "Find a ride to get started."}</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref(tab === "hosting" ? "CreateRide" : "HomeScreen"))}>
              <Text style={styles.primaryBtnText}>{tab === "hosting" ? "Post a ride" : "Find a ride"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {shown.map((t, i) => (
              <Pressable
                key={t.rideId + t.bucket}
                style={[styles.row, i < shown.length - 1 && styles.rowBorder]}
                onPress={() => router.push(appHref("RideDetailsScreen", { rideId: t.rideId } as any))}
              >
                <View style={styles.rowBody}>
                  <View style={styles.routeLine}>
                    <Text style={styles.origin} numberOfLines={1}>{t.origin}</Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={styles.arrow}>
                      <Path d="M5 12 H19 M19 12 L13 6 M19 12 L13 18" stroke={WEB.inkLine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={styles.dest} numberOfLines={1}>{t.destination}</Text>
                  </View>
                  <Text style={styles.meta}>{fmtMeta(t.startAt)}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <StatusPill status={t.status} />
                  {typeof t.price === "number" ? <Text style={styles.price}>{"₹"}{t.price}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </WebShell>
  );
};

export default BookingsScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingTop: 36, paddingBottom: 56 },
  title: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6, marginBottom: 16 },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: WEB.fieldFill },
  tabOn: { backgroundColor: WEB.forest },
  tabText: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.inkStrong },
  tabTextOn: { color: WEB.lime },

  center: { alignItems: "center", paddingVertical: 80 },
  emptyCard: { alignItems: "center", gap: 8, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, ...cardBorder },
  emptyTitle: { fontFamily: FONT.display, fontSize: 21, color: WEB.forest },
  emptyBody: { fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.inkMuted, textAlign: "center", marginBottom: 10 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 26, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  list: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", ...cardBorder },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  rowBody: { flex: 1, minWidth: 0 },
  routeLine: { flexDirection: "row", alignItems: "center" },
  origin: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest, flexShrink: 0, maxWidth: "52%" },
  dest: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest, flexShrink: 1, flex: 1 },
  arrow: { marginHorizontal: 7 },
  meta: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: 4 },
  rowMeta: { alignItems: "flex-end", gap: 7 },
  price: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest },

  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: WEB.fieldFill },
  statusGood: { backgroundColor: WEB.lime },
  statusBad: { backgroundColor: "rgba(240,158,92,0.20)" },
  statusText: { fontFamily: FONT.black, fontSize: 10.5, color: WEB.inkStrong },
  statusTextGood: { color: WEB.forest },
});
