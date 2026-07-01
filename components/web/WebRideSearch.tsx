// Web ride search, list-first.
//
// Carpool inventory is sparse, so a map of pins is mostly empty and not
// useful as the primary surface (that is Uber/Zillow's dense-inventory
// pattern). The usable pattern for ride/transport booking is a prominent
// search followed by a readable LIST of options (BlaBlaCar, Booking,
// Uber's "choose a ride"). This renders that, wearing the UniPool skin:
// a brand hero, a forest From/To card (the app's search card), and a
// grid of cream ride cards on the lime canvas. Reuses the shared data
// layer (/ride/search, /rides/nearby).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import RideResultCard from "./RideResultCard";
import WebLocationInput from "./WebLocationInput";
import WebLocationNudge from "./WebLocationNudge";
import { useApi } from "../../utils/ApiUtil";
import { appHref } from "../../navigation/routes";
import { seatsLeftLabel } from "../../utils/seatMath";
import { titleCaseLocation } from "./format";
import { WEB, RADIUS, FONT, cardBorder, cardFloat } from "./theme";

const FALLBACK_CENTER: [number, number] = [79.1559, 12.9698]; // VIT Vellore
const NEARBY_LIMIT = 50; // backend clamps /rides/nearby `limit` to ≤50 (else default 30)
const PAGE_SIZE = 6;     // cards revealed per "Load more"

type RideData = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  total_seats: number;
  booked_seats: number;
  start_latitude?: number;
  start_longitude?: number;
  host_user_name?: string;
  host_user_profile_picture_url?: string | null;
};

// /rides/nearby filters to within `radius` but orders by start_time, not
// distance — so sort by proximity here (the response carries start coords)
// to genuinely surface the closest rides first. center is [lng, lat].
const sortByProximity = (list: RideData[], center: [number, number]): RideData[] => {
  const [clng, clat] = center;
  const cosLat = Math.cos((clat * Math.PI) / 180);
  const dist2 = (r: RideData) => {
    if (typeof r.start_latitude !== "number" || typeof r.start_longitude !== "number") {
      return Number.POSITIVE_INFINITY; // rides without coords sink to the end
    }
    const dx = (r.start_longitude - clng) * cosLat;
    const dy = r.start_latitude - clat;
    return dx * dx + dy * dy;
  };
  return [...list].sort((a, b) => dist2(a) - dist2(b));
};

type SearchResponse = { rides?: RideData[] };

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};
const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

const STEPS = [
  { img: require("../../assets/brand/location-pin.png"), title: "Search", body: "Drop your route and travel time." },
  { img: require("../../assets/brand/sofa.png"), title: "Match", body: "Pick a ride, or post your own." },
  { img: require("../../assets/brand/wallet.png"), title: "Ride", body: "Split the fare, settle over UPI." },
];

const SwapIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4 L7 20 M7 20 L3.5 16.5 M7 20 L10.5 16.5" stroke={WEB.onForest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 20 L17 4 M17 4 L13.5 7.5 M17 4 L20.5 7.5" stroke={WEB.onForest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

type Props = { initialFrom?: string; initialTo?: string };

const WebRideSearch: React.FC<Props> = ({ initialFrom = "", initialTo = "" }) => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { width } = useWindowDimensions();
  const narrow = width < 720;
  const twoCol = width >= 900;

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [routed, setRouted] = useState(Boolean(initialFrom.trim() && initialTo.trim()));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchedRef = useRef(false);

  const runSearch = useCallback(
    async (f: string, t: string) => {
      setLoading(true);
      setVisibleCount(PAGE_SIZE);
      setRouted(Boolean(f.trim() && t.trim()));
      try {
        if (f.trim() && t.trim()) {
          const qs = `start_location=${encodeURIComponent(f.trim())}&end_location=${encodeURIComponent(t.trim())}`;
          const res = await apiUtil.get<SearchResponse>(`/ride/search?${qs}`);
          setRides(res?.rides ?? []);
        } else {
          const center = await getViewerCenter();
          const res = await apiUtil.get<SearchResponse>(
            `/rides/nearby?lat=${center[1].toFixed(4)}&lng=${center[0].toFixed(4)}&radius=25000&limit=${NEARBY_LIMIT}`,
          );
          setRides(sortByProximity(res?.rides ?? [], center));
        }
      } catch {
        setRides([]);
      } finally {
        setLoading(false);
      }
    },
    [apiUtil],
  );

  useEffect(() => {
    if (searchedRef.current) return;
    searchedRef.current = true;
    void runSearch(initialFrom, initialTo);
  }, [initialFrom, initialTo, runSearch]);

  // Re-run the nearby search from an explicit center — used by the
  // location nudge once the visitor grants browser geolocation.
  const runNearbyAt = useCallback(
    async (center: [number, number]) => {
      setLoading(true);
      setVisibleCount(PAGE_SIZE);
      setRouted(false);
      try {
        const res = await apiUtil.get<SearchResponse>(
          `/rides/nearby?lat=${center[1].toFixed(4)}&lng=${center[0].toFixed(4)}&radius=25000&limit=${NEARBY_LIMIT}`,
        );
        setRides(sortByProximity(res?.rides ?? [], center));
      } catch {
        setRides([]);
      } finally {
        setLoading(false);
      }
    },
    [apiUtil],
  );

  const openRide = useCallback(
    (id: string) => router.push(appHref("RideDetailsScreen", { rideId: id } as any)),
    [router],
  );
  const canSearch = from.trim().length > 0 && to.trim().length > 0;

  const resultsHeader = loading
    ? "Searching…"
    : `${rides.length} ${rides.length === 1 ? "ride" : "rides"} ${routed ? "on your route" : "near you"}`;

  // Render only the revealed slice, and memoise it so typing in the search
  // box (which re-renders this component) doesn't re-render every card.
  const visibleCards = useMemo(
    () =>
      rides.slice(0, visibleCount).map((ride) => (
        <View key={ride.id} style={twoCol ? styles.gridHalf : styles.gridFull}>
          <RideResultCard
            origin={titleCaseLocation(ride.start_location)}
            destination={titleCaseLocation(ride.end_location)}
            dateLabel={formatDate(ride.start_time)}
            timeLabel={formatTime(ride.start_time)}
            seatsLabel={seatsLeftLabel(ride.total_seats, ride.booked_seats)}
            price={ride.total_price}
            hostName={ride.host_user_name}
            hostPhoto={ride.host_user_profile_picture_url}
            seats={ride.total_seats}
            onPress={() => openRide(ride.id)}
          />
        </View>
      )),
    [rides, visibleCount, twoCol, openRide],
  );

  return (
    <View style={styles.page}>
      {/* Brand hero — a single line, no marketing subcopy. */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          {routed ? "Rides on your route" : "Your campus, carpooled."}
        </Text>
      </View>

      {/* Forest From/To card — the app's search surface, with real
          location autocomplete (the same data layer as mobile). */}
      <View style={[styles.searchCard, narrow && styles.searchCardNarrow]}>
        <WebLocationInput
          value={from}
          onChangeText={setFrom}
          onSelect={(label) => { setFrom(label); if (to.trim()) runSearch(label, to); }}
          placeholder="Leaving from"
          icon={<View style={styles.fromDot} />}
          onSubmit={() => runSearch(from, to)}
        />

        {narrow ? <View style={styles.fieldDividerH} /> : <View style={styles.fieldDividerV} />}

        <WebLocationInput
          value={to}
          onChangeText={setTo}
          onSelect={(label) => { setTo(label); if (from.trim()) runSearch(from, label); }}
          placeholder="Going to"
          icon={(
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path d="M3 11 L21 3 L13 21 L11 13 Z" fill={WEB.lime} />
            </Svg>
          )}
          trailing={!narrow ? (
            <Pressable style={styles.swapButton} onPress={() => { const a = from; setFrom(to); setTo(a); }} accessibilityLabel="Swap from and to">
              <SwapIcon />
            </Pressable>
          ) : undefined}
          onSubmit={() => runSearch(from, to)}
        />

        <Pressable
          style={({ hovered }: any) => [styles.searchBtn, narrow && styles.searchBtnNarrow, hovered && styles.searchBtnHover, !canSearch && styles.searchBtnDisabled]}
          onPress={() => canSearch && runSearch(from, to)}
          disabled={!canSearch}
        >
          <Text style={[styles.searchBtnText, !canSearch && styles.searchBtnTextDisabled]}>Search</Text>
        </Pressable>
      </View>

      <Text style={styles.resultsHeader}>{resultsHeader}</Text>

      {loading ? (
        <View style={[styles.grid, !twoCol && styles.gridSingle]}>
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No rides {routed ? "on this route" : "near you"} yet</Text>
          <Pressable
            style={({ hovered }: any) => [styles.emptyBtn, hovered && styles.emptyBtnHover]}
            onPress={() => router.push(appHref("CreateRide"))}
          >
            <Text style={styles.emptyBtnText}>Post a ride</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.grid, !twoCol && styles.gridSingle]}>{visibleCards}</View>
          {rides.length > visibleCount ? (
            <View style={styles.loadMoreWrap}>
              <Pressable
                style={({ hovered }: any) => [styles.loadMore, hovered && styles.loadMoreHover]}
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <Text style={styles.loadMoreText}>Load more rides</Text>
              </Pressable>
              <Text style={styles.loadMoreCount}>Showing {Math.min(visibleCount, rides.length)} of {rides.length}</Text>
            </View>
          ) : null}
        </>
      )}

      {!routed && !loading && (
        <View style={styles.how}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={[styles.howSteps, !twoCol && styles.howStepsStacked]}>
            {STEPS.map((s, i) => (
              <View key={s.title} style={styles.howStep}>
                <View style={styles.howIcon}>
                  <Text style={styles.howNum}>{i + 1}</Text>
                  <Image source={s.img} style={styles.howIconImg} resizeMode="contain" />
                </View>
                <Text style={styles.howStepTitle}>{s.title}</Text>
                <Text style={styles.howStepBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!routed && <WebLocationNudge onAllow={runNearbyAt} />}
    </View>
  );
};

// Resolve a map center from the browser geolocation, falling back to the
// campus center when it is unavailable or denied. Used only to seed the
// "rides near you" query; there is no map to center.
async function getViewerCenter(): Promise<[number, number]> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return FALLBACK_CENTER;
  // Never trigger an unprompted permission dialog on load — only read GPS
  // if the visitor has already granted it. The WebLocationNudge asks for
  // permission on a click instead.
  try {
    if (!navigator.permissions) return FALLBACK_CENTER;
    const p = await navigator.permissions.query({ name: "geolocation" as any });
    if (p.state !== "granted") return FALLBACK_CENTER;
  } catch {
    return FALLBACK_CENTER;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(FALLBACK_CENTER),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
    );
  });
}

export default WebRideSearch;

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1000, alignSelf: "center", paddingTop: 40, paddingBottom: 64, paddingHorizontal: 20 },

  hero: { marginBottom: 22, maxWidth: 760 },
  heroTitle: { fontFamily: FONT.displayBlack, fontSize: 44, lineHeight: 47, color: WEB.forest, letterSpacing: -1.2 },

  // Forest search card — echoes the mobile From/To card.
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WEB.forest,
    borderRadius: RADIUS.cardLg,
    padding: 10,
    position: "relative",
    zIndex: 30,
    ...cardFloat,
  },
  searchCardNarrow: { flexDirection: "column", alignItems: "stretch", padding: 12, gap: 4 },
  fromDot: { width: 12, height: 12, borderRadius: 7, borderWidth: 3, borderColor: WEB.onForest },
  fieldDividerV: { width: 1, height: 30, backgroundColor: WEB.onForestLine },
  fieldDividerH: { height: 1, backgroundColor: WEB.onForestLine, marginHorizontal: 14 },
  swapButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: WEB.onForestField, alignItems: "center", justifyContent: "center" },
  searchBtn: { backgroundColor: WEB.lime, borderRadius: RADIUS.button, height: 50, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  searchBtnNarrow: { marginLeft: 0, marginTop: 4 },
  searchBtnHover: { backgroundColor: "#C2E15C" },
  searchBtnDisabled: { backgroundColor: WEB.onForestField },
  searchBtnText: { fontFamily: FONT.black, fontSize: 15.5, color: WEB.forest },
  searchBtnTextDisabled: { color: WEB.onForestMuted },

  resultsHeader: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.inkStrong, marginTop: 30, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.4 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  gridSingle: { flexDirection: "column" },
  gridHalf: { width: "calc(50% - 7px)" as any },
  gridFull: { width: "100%" },

  skeleton: { height: 168, borderRadius: RADIUS.card, backgroundColor: WEB.surface, opacity: 0.5 },

  loadMoreWrap: { alignItems: "center", marginTop: 22, gap: 8 },
  loadMore: { backgroundColor: WEB.surface, borderRadius: RADIUS.pill, paddingHorizontal: 26, paddingVertical: 13, ...cardBorder, ...cardFloat },
  loadMoreHover: { backgroundColor: "#FFFFFF" },
  loadMoreText: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.forest },
  loadMoreCount: { fontFamily: FONT.semibold, fontSize: 12.5, color: WEB.inkMuted },

  empty: { backgroundColor: WEB.surface, borderRadius: RADIUS.cardLg, paddingVertical: 44, paddingHorizontal: 32, alignItems: "center", ...cardBorder, ...cardFloat },
  emptyArt: { width: 156, height: 116, marginBottom: 6 },
  emptyTitle: { fontFamily: FONT.displayBlack, fontSize: 21, color: WEB.forest, marginBottom: 20, textAlign: "center", letterSpacing: -0.4 },
  emptyBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 48, paddingHorizontal: 26, alignItems: "center", justifyContent: "center" },
  emptyBtnHover: { backgroundColor: WEB.forestDeep },
  emptyBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  how: { marginTop: 56 },
  howTitle: { fontFamily: FONT.displayBlack, fontSize: 22, color: WEB.forest, letterSpacing: -0.5, marginBottom: 20 },
  howSteps: { flexDirection: "row", gap: 16 },
  howStepsStacked: { flexDirection: "column" },
  howStep: { flex: 1, backgroundColor: WEB.surface, borderRadius: RADIUS.cardLg, padding: 24, ...cardBorder, ...cardFloat },
  howIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: WEB.lime, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  howIconImg: { width: 28, height: 28 },
  howNum: { position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: WEB.forest, color: WEB.lime, fontFamily: FONT.black, fontSize: 12, textAlign: "center", lineHeight: 24, overflow: "hidden" },
  howStepTitle: { fontFamily: FONT.black, fontSize: 17, color: WEB.forest, marginBottom: 6 },
  howStepBody: { fontFamily: FONT.semibold, fontSize: 13.5, lineHeight: 20, color: WEB.inkMuted },
});
