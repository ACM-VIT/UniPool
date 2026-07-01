// Web ride search, list-first.
//
// Carpool inventory is sparse, so a map of pins is mostly empty and not
// useful as the primary surface (that is Uber/Zillow's dense-inventory
// pattern). The usable pattern for ride/transport booking is a prominent
// search followed by a readable LIST of options (BlaBlaCar, Booking,
// Uber's "choose a ride"). This renders that, wearing the UniPool skin:
// a brand hero, a forest From/To card (the app's search card), and a
// grid of cream ride cards on the lime canvas. Reuses the shared data layer:
// /ride/search for routes + "all rides", /rides/nearby for the server-side
// radius-filtered "near you" list. Both carry host names + external rides.
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
import type { LocationResult } from "../../utils/LocationService";

const NEARBY_LIMIT = 50; // backend clamps `limit` to ≤50 (else default 30)
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

// External (off-platform) rides ride alongside UniPool rides in the
// `external_rides` array of both /ride/search and /rides/nearby. On the list
// they render as plain ride cards (indistinguishable from UniPool rides, by
// design); the ride-info page is where the off-platform contact flow kicks in.
type ExternalRideData = {
  id: string;
  source_label: string;
  pickup_point: string;
  destination: string;
  departure_time: string;
  host_name?: string;
  vehicle_type?: string;
  total_seats: number;
  available_seats: number;
  total_price?: number;
};

// Normalise an external ride into the same shape the card consumes, so the two
// kinds interleave in one list. `external` flags it purely for the seats label
// (external feeds give seats-available, not seats-booked).
type ResultItem = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price?: number;
  total_seats: number;
  booked_seats: number;
  host_user_name?: string;
  host_user_profile_picture_url?: string | null;
  external?: boolean;
};

// External host names arrive with the VIT registration suffix appended
// ("Ishan Awasthi 24BAI0207"); strip it so cards read like the app's
// ExternalRideCard, which does the same.
const stripRegNo = (name?: string) => (name ?? "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim();

const externalToItem = (e: ExternalRideData): ResultItem => ({
  id: e.id,
  start_location: e.pickup_point,
  end_location: e.destination,
  start_time: e.departure_time,
  total_price: e.total_price,
  total_seats: e.total_seats,
  // seatMath treats total_seats as host-inclusive (passenger capacity =
  // total - 1), while external feeds give passenger seats-available directly.
  // Back into booked_seats so the card's "seats left" equals available_seats
  // rather than being one short (which mislabelled 1-seat rides as "Full").
  booked_seats: Math.max(0, e.total_seats - 1 - e.available_seats),
  host_user_name: stripRegNo(e.host_name) || undefined,
  external: true,
});

type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

type SearchOptions = {
  fromCoordinates?: LocationCoordinates | null;
  toCoordinates?: LocationCoordinates | null;
};

const coordinatesFromLocationResult = (result?: LocationResult): LocationCoordinates | null => {
  if (!result?.lat || !result?.lon) return null;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

type WithDeparture = { id?: string; start_time: string };

const departureMs = (r: WithDeparture) => {
  const t = new Date(r.start_time).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
};

// Rides in the past drop off the list (with a 1h grace). Rides without a
// parseable time are kept so a bad timestamp never hides inventory.
const isUpcoming = (r: WithDeparture): boolean => {
  const t = departureMs(r);
  return t === Number.POSITIVE_INFINITY || t >= Date.now() - 60 * 60 * 1000;
};

const sortByDeparture = <T extends WithDeparture>(list: T[]): T[] => {
  return [...list]
    .filter(isUpcoming)
    .sort((a, b) => {
      const timeDiff = departureMs(a) - departureMs(b);
      if (timeDiff !== 0) return timeDiff;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
};

type SearchResponse = { rides?: RideData[]; external_rides?: ExternalRideData[] };

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
  const [fromCoordinates, setFromCoordinates] = useState<LocationCoordinates | null>(null);
  const [toCoordinates, setToCoordinates] = useState<LocationCoordinates | null>(null);
  const [rides, setRides] = useState<RideData[]>([]);
  const [externals, setExternals] = useState<ExternalRideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [routed, setRouted] = useState(Boolean(initialFrom.trim() && initialTo.trim()));
  // Whether the current list is genuinely proximity-based (geolocation
  // granted) vs. the default "all upcoming rides" list.
  const [near, setNear] = useState(false);
  // The visitor's granted location, kept so they can toggle between
  // "near you" and "all rides" without re-requesting permission.
  const [coords, setCoords] = useState<[number, number] | null>(null);
  // Set when the visitor taps "Near you" but location is denied/off, so we
  // can explain rather than silently doing nothing.
  const [locBlocked, setLocBlocked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchedRef = useRef(false);

  const runSearch = useCallback(
    async (f: string, t: string, options: SearchOptions = {}) => {
      const searchFromCoordinates = options.fromCoordinates === undefined ? fromCoordinates : options.fromCoordinates;
      const searchToCoordinates = options.toCoordinates === undefined ? toCoordinates : options.toCoordinates;
      setLoading(true);
      setVisibleCount(PAGE_SIZE);
      setRouted(Boolean(f.trim() && t.trim()));
      try {
        if (f.trim() && t.trim()) {
          setNear(false);
          const qs = new URLSearchParams({
            start_location: f.trim(),
            end_location: t.trim(),
            limit: String(NEARBY_LIMIT),
            sort_by: "time",
          });
          if (searchFromCoordinates) {
            qs.set("start_lat", searchFromCoordinates.latitude.toFixed(6));
            qs.set("start_lon", searchFromCoordinates.longitude.toFixed(6));
          }
          if (searchToCoordinates) {
            qs.set("end_lat", searchToCoordinates.latitude.toFixed(6));
            qs.set("end_lon", searchToCoordinates.longitude.toFixed(6));
          }
          const res = await apiUtil.get<SearchResponse>(`/ride/search?${qs.toString()}`);
          setRides(res?.rides ?? []);
          setExternals(res?.external_rides ?? []);
        } else {
          // No route entered. Only surface "near you" when the visitor has
          // already granted geolocation; otherwise show all upcoming rides
          // instead of faking proximity to a default campus location.
          const geo = await getGrantedLocation();
          if (geo) {
            setCoords(geo);
            // /rides/nearby returns a server-side radius-filtered subset, with
            // host names joined in + external rides — lighter than pulling the
            // whole list and filtering client-side.
            const res = await apiUtil.get<SearchResponse>(
              `/rides/nearby?lat=${geo[1].toFixed(4)}&lng=${geo[0].toFixed(4)}&radius=25000&limit=${NEARBY_LIMIT}`,
            );
            setRides(res?.rides ?? []);
            setExternals(res?.external_rides ?? []);
            setNear(true);
          } else {
            const res = await apiUtil.get<SearchResponse>(`/ride/search?limit=${NEARBY_LIMIT}&sort_by=time`);
            setRides(sortByDeparture(res?.rides ?? []));
            setExternals(res?.external_rides ?? []);
            setNear(false);
          }
        }
      } catch {
        setRides([]);
        setExternals([]);
      } finally {
        setLoading(false);
      }
    },
    [apiUtil, fromCoordinates, toCoordinates],
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
      setNear(true);
      setCoords(center);
      setLocBlocked(false);
      try {
        const res = await apiUtil.get<SearchResponse>(
          `/rides/nearby?lat=${center[1].toFixed(4)}&lng=${center[0].toFixed(4)}&radius=25000&limit=${NEARBY_LIMIT}`,
        );
        setRides(res?.rides ?? []);
        setExternals(res?.external_rides ?? []);
      } catch {
        setRides([]);
        setExternals([]);
      } finally {
        setLoading(false);
      }
    },
    [apiUtil],
  );

  // Show all upcoming rides (used by the Near you / All rides toggle when
  // location is available, and as the default when it isn't).
  const loadAll = useCallback(async () => {
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    setRouted(false);
    setNear(false);
    setLocBlocked(false);
    try {
      const res = await apiUtil.get<SearchResponse>(`/ride/search?limit=${NEARBY_LIMIT}&sort_by=time`);
      setRides(sortByDeparture(res?.rides ?? []));
      setExternals(res?.external_rides ?? []);
    } catch {
      setRides([]);
      setExternals([]);
    } finally {
      setLoading(false);
    }
  }, [apiUtil]);

  // Switch to nearby. If we already have the location, reuse it; otherwise
  // ask now (a click prompts reliably). If it's denied/off, flag it so the
  // toggle can explain instead of silently doing nothing.
  const requestNear = useCallback(() => {
    setLocBlocked(false);
    if (coords) {
      void runNearbyAt(coords);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocBlocked(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void runNearbyAt([pos.coords.longitude, pos.coords.latitude]),
      () => setLocBlocked(true),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, [coords, runNearbyAt]);

  const openRide = useCallback(
    (id: string) => router.push(appHref("RideDetailsScreen", { rideId: id } as any)),
    [router],
  );
  const canSearch = from.trim().length > 0 && to.trim().length > 0;

  // External rides render as ordinary cards mixed in with UniPool rides,
  // ordered by departure so the soonest upcoming rides lead regardless of
  // source. "Near you" just feeds a server-side radius-filtered subset
  // (/rides/nearby) into the same ordering.
  const results = useMemo<ResultItem[]>(() => {
    return sortByDeparture([...rides, ...externals.map(externalToItem)]);
  }, [rides, externals]);

  const total = results.length;
  const rideWord = total === 1 ? "ride" : "rides";
  const resultsHeader = loading
    ? "Searching…"
    : routed
    ? `${total} ${rideWord} on your route`
    : near
    ? `${total} ${rideWord} near you`
    : `${total} upcoming ${rideWord}`;

  // Render only the revealed slice, and memoise it so typing in the search
  // box (which re-renders this component) doesn't re-render every card.
  const visibleCards = useMemo(
    () =>
      results.slice(0, visibleCount).map((ride) => (
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
    [results, visibleCount, twoCol, openRide],
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
          onChangeText={(text) => {
            setFrom(text);
            setFromCoordinates(null);
          }}
          onSelect={(label, result) => {
            const selectedCoordinates = coordinatesFromLocationResult(result);
            setFrom(label);
            setFromCoordinates(selectedCoordinates);
            if (to.trim()) runSearch(label, to, { fromCoordinates: selectedCoordinates, toCoordinates });
          }}
          placeholder="Leaving from"
          icon={<View style={styles.fromDot} />}
          onSubmit={() => runSearch(from, to)}
        />

        {narrow ? <View style={styles.fieldDividerH} /> : <View style={styles.fieldDividerV} />}

        <WebLocationInput
          value={to}
          onChangeText={(text) => {
            setTo(text);
            setToCoordinates(null);
          }}
          onSelect={(label, result) => {
            const selectedCoordinates = coordinatesFromLocationResult(result);
            setTo(label);
            setToCoordinates(selectedCoordinates);
            if (from.trim()) runSearch(from, label, { fromCoordinates, toCoordinates: selectedCoordinates });
          }}
          placeholder="Going to"
          icon={(
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path d="M3 11 L21 3 L13 21 L11 13 Z" fill={WEB.lime} />
            </Svg>
          )}
          trailing={!narrow ? (
            <Pressable
              style={styles.swapButton}
              onPress={() => {
                const oldFrom = from;
                const oldFromCoordinates = fromCoordinates;
                setFrom(to);
                setFromCoordinates(toCoordinates);
                setTo(oldFrom);
                setToCoordinates(oldFromCoordinates);
              }}
              accessibilityLabel="Swap from and to"
            >
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

      <View style={styles.resultsRow}>
        <Text style={styles.resultsHeader}>{resultsHeader}</Text>
        {/* Always available (unless searching a route). "Near you" asks for
            location if we don't have it yet, so it's the way back to
            proximity even after the location nudge is dismissed or blocked. */}
        {!routed ? (
          <View style={styles.scopeToggle}>
            <Pressable
              onPress={requestNear}
              style={[styles.scopeBtn, near && styles.scopeBtnActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.scopeBtnText, near && styles.scopeBtnTextActive]}>Near you</Text>
            </Pressable>
            <Pressable
              onPress={loadAll}
              style={[styles.scopeBtn, !near && styles.scopeBtnActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.scopeBtnText, !near && styles.scopeBtnTextActive]}>All rides</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!routed && locBlocked && !near ? (
        <Text style={styles.locHint}>
          Location is off. Allow it in your browser to see the rides nearest you.
        </Text>
      ) : null}

      {loading ? (
        <View style={[styles.grid, !twoCol && styles.gridSingle]}>
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
          <View style={[styles.skeleton, twoCol ? styles.gridHalf : styles.gridFull]} />
        </View>
      ) : total === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {routed ? "No rides on this route yet" : near ? "No rides near you yet" : "No upcoming rides yet"}
          </Text>
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
          {total > visibleCount ? (
            <View style={styles.loadMoreWrap}>
              <Pressable
                style={({ hovered }: any) => [styles.loadMore, hovered && styles.loadMoreHover]}
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <Text style={styles.loadMoreText}>Load more rides</Text>
              </Pressable>
              <Text style={styles.loadMoreCount}>Showing {Math.min(visibleCount, total)} of {total}</Text>
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

      {!routed && !near && <WebLocationNudge onAllow={runNearbyAt} />}
    </View>
  );
};

// The visitor's location, but only if they've ALREADY granted browser
// geolocation — returns null otherwise (never triggers an unprompted
// permission dialog on load; the WebLocationNudge asks on a click). Null
// means "show all upcoming rides" rather than faking a campus location.
async function getGrantedLocation(): Promise<[number, number] | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    if (!navigator.permissions) return null;
    const p = await navigator.permissions.query({ name: "geolocation" as any });
    if (p.state !== "granted") return null;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(null),
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

  resultsRow: { marginTop: 30, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  resultsHeader: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.inkStrong, textTransform: "uppercase", letterSpacing: 0.4 },
  scopeToggle: { flexDirection: "row", backgroundColor: WEB.surface, borderRadius: RADIUS.pill, padding: 3, ...cardBorder },
  scopeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill },
  scopeBtnActive: { backgroundColor: WEB.forest },
  scopeBtnText: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkMuted, letterSpacing: 0.2 },
  scopeBtnTextActive: { color: WEB.lime },
  locHint: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: -4, marginBottom: 14 },

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
