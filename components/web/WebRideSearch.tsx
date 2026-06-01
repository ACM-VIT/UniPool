// Web ride search, list-first.
//
// Carpool inventory is sparse, so a map of pins is mostly empty and not
// useful as the primary surface (that is Uber/Zillow's dense-inventory
// pattern). The usable pattern for ride/transport booking is a prominent
// search followed by a readable LIST of options (BlaBlaCar, Booking,
// Uber's "choose a ride"). This renders that: a From/To search bar and a
// vertical list of ride cards. The exact route map lives on the ride
// detail page. Reuses the shared data layer (/ride/search, /rides/nearby).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import RideResultCard from "./RideResultCard";
import { useApi } from "../../utils/ApiUtil";
import { appHref } from "../../navigation/routes";
import { seatsLeftLabel } from "../../utils/seatMath";
import { titleCaseLocation } from "./format";
import { WEB, RADIUS, FONT, cardBorder } from "./theme";

const FALLBACK_CENTER: [number, number] = [79.1559, 12.9698]; // VIT Vellore

type RideData = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  total_seats: number;
  booked_seats: number;
  host_user_name?: string;
  host_user_profile_picture_url?: string | null;
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

const SwapIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4 L7 20 M7 20 L3.5 16.5 M7 20 L10.5 16.5" stroke={WEB.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 20 L17 4 M17 4 L13.5 7.5 M17 4 L20.5 7.5" stroke={WEB.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

type Props = { initialFrom?: string; initialTo?: string };

const WebRideSearch: React.FC<Props> = ({ initialFrom = "", initialTo = "" }) => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { width } = useWindowDimensions();
  const narrow = width < 720;

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [routed, setRouted] = useState(Boolean(initialFrom.trim() && initialTo.trim()));
  const searchedRef = useRef(false);

  const runSearch = useCallback(
    async (f: string, t: string) => {
      setLoading(true);
      setRouted(Boolean(f.trim() && t.trim()));
      try {
        if (f.trim() && t.trim()) {
          const qs = `start_location=${encodeURIComponent(f.trim())}&end_location=${encodeURIComponent(t.trim())}`;
          const res = await apiUtil.get<SearchResponse>(`/ride/search?${qs}`);
          setRides(res?.rides ?? []);
        } else {
          const center = await getViewerCenter();
          const res = await apiUtil.get<SearchResponse>(
            `/rides/nearby?lat=${center[1].toFixed(4)}&lng=${center[0].toFixed(4)}&radius=25000&limit=50`,
          );
          setRides(res?.rides ?? []);
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

  const openRide = (id: string) => router.push(appHref("RideDetailsScreen", { rideId: id } as any));
  const canSearch = from.trim().length > 0 && to.trim().length > 0;

  const resultsHeader = loading
    ? "Searching"
    : `${rides.length} ${rides.length === 1 ? "ride" : "rides"} ${routed ? "on your route" : "near you"}`;

  return (
    <View style={styles.page}>
      {/* Search bar */}
      <View style={[styles.searchBar, narrow && styles.searchBarNarrow]}>
        <View style={styles.field}>
          <View style={styles.fromDot} />
          <TextInput
            style={styles.input}
            placeholder="Leaving from"
            placeholderTextColor={WEB.inkMuted}
            value={from}
            onChangeText={setFrom}
            onSubmitEditing={() => runSearch(from, to)}
          />
        </View>

        {narrow ? <View style={styles.fieldDividerH} /> : <View style={styles.fieldDividerV} />}

        <View style={styles.field}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path d="M3 11 L21 3 L13 21 L11 13 Z" fill={WEB.forest} />
          </Svg>
          <TextInput
            style={styles.input}
            placeholder="Going to"
            placeholderTextColor={WEB.inkMuted}
            value={to}
            onChangeText={setTo}
            onSubmitEditing={() => runSearch(from, to)}
          />
          {!narrow && (
            <Pressable style={styles.swapButton} onPress={() => { setFrom(to); setTo(from); }} accessibilityLabel="Swap from and to">
              <SwapIcon />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.searchBtn, narrow && styles.searchBtnNarrow, !canSearch && styles.searchBtnDisabled]}
          onPress={() => canSearch && runSearch(from, to)}
          disabled={!canSearch}
        >
          <Text style={[styles.searchBtnText, !canSearch && styles.searchBtnTextDisabled]}>Search</Text>
        </Pressable>
      </View>

      <Text style={styles.resultsHeader}>{resultsHeader}</Text>

      {loading ? (
        <>
          <View style={styles.skeleton} />
          <View style={styles.skeleton} />
          <View style={styles.skeleton} />
        </>
      ) : rides.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No rides {routed ? "on this route" : "near you"} yet</Text>
          <Text style={styles.emptyBody}>
            {routed
              ? "Try a nearby landmark, or post this route yourself and let others join."
              : "Search a route above, or post your own ride for students heading your way."}
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push(appHref("CreateRide"))}>
            <Text style={styles.emptyBtnText}>Post a ride</Text>
          </Pressable>
        </View>
      ) : (
        rides.map((ride) => (
          <RideResultCard
            key={ride.id}
            origin={titleCaseLocation(ride.start_location)}
            destination={titleCaseLocation(ride.end_location)}
            dateLabel={formatDate(ride.start_time)}
            timeLabel={formatTime(ride.start_time)}
            seatsLabel={seatsLeftLabel(ride.total_seats, ride.booked_seats)}
            price={ride.total_price}
            hostName={ride.host_user_name}
            hostPhoto={ride.host_user_profile_picture_url}
            onPress={() => openRide(ride.id)}
          />
        ))
      )}
    </View>
  );
};

// Resolve a map center from the browser geolocation, falling back to the
// campus center when it is unavailable or denied. Used only to seed the
// "rides near you" query; there is no map to center.
function getViewerCenter(): Promise<[number, number]> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(FALLBACK_CENTER),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
    );
  });
}

export default WebRideSearch;

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 720, alignSelf: "center", paddingTop: 28, paddingBottom: 56, paddingHorizontal: 20 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 8,
    ...cardBorder,
  },
  searchBarNarrow: { flexDirection: "column", alignItems: "stretch", padding: 12, gap: 4 },
  field: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11, height: 50, paddingHorizontal: 12 },
  fromDot: { width: 12, height: 12, borderRadius: 7, borderWidth: 3, borderColor: WEB.forest },
  input: { flex: 1, fontFamily: FONT.bold, fontSize: 15, color: WEB.forest, outlineStyle: "none" as any },
  fieldDividerV: { width: 1, height: 28, backgroundColor: WEB.hairline },
  fieldDividerH: { height: 1, backgroundColor: WEB.hairline, marginHorizontal: 12 },
  swapButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center" },
  searchBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 46, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  searchBtnNarrow: { marginLeft: 0, marginTop: 4 },
  searchBtnDisabled: { backgroundColor: WEB.inkSubtle },
  searchBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },
  searchBtnTextDisabled: { color: WEB.inkMuted },

  resultsHeader: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkStrong, marginTop: 22, marginBottom: 12 },

  skeleton: { height: 132, borderRadius: RADIUS.card, backgroundColor: WEB.surface, borderWidth: 1, borderColor: WEB.hairline, marginBottom: 12, opacity: 0.6 },

  empty: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 44, paddingHorizontal: 32, alignItems: "center", ...cardBorder },
  emptyTitle: { fontFamily: FONT.black, fontSize: 17, color: WEB.forest, marginBottom: 8, textAlign: "center" },
  emptyBody: { fontFamily: FONT.semibold, fontSize: 14, lineHeight: 21, color: WEB.inkMuted, textAlign: "center", maxWidth: 380, marginBottom: 18 },
  emptyBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 46, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },
});
