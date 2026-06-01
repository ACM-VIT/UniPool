// Web variant of the ride detail / share page.
//
// Opens from a shared link, so it must work signed-out: it renders from
// the public, sanitised /ride/preview/:id endpoint (route, time, per-seat
// price, seats, host first name). A signed-in viewer additionally pulls
// the gated /ride/details/:id to draw the exact route on the map. The
// request action reuses /bookings/request.
//
// Layout: a listing detail. Left column is route title, map, and a quiet
// route block; the right rail holds the one elevated element on the page
// (the sticky fare card).
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import TripPreviewMap from "../components/TripPreviewMap";
import WebShell from "../components/web/WebShell";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { useDecodedLocalSearchParams, appHref } from "../navigation/routes";
import { titleCaseLocation } from "../components/web/format";
import { WEB, RADIUS, FONT, cardBorder, floatShadow } from "../components/web/theme";

type Preview = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  seats_available: number;
  total_price: number;
  price_per_seat: number;
  host_first_name: string;
  host_institute_name?: string;
};

type Coords = { start_latitude: number; start_longitude: number; end_latitude: number; end_longitude: number };

const isValid = (lat?: number, lng?: number) =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return iso;
  }
};
const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};

const RouteBlock: React.FC<{ from: string; to: string; meta: string }> = ({ from, to, meta }) => (
  <View style={styles.routeBlock}>
    <View style={styles.routeRow}>
      <View style={styles.routeRail}>
        <View style={styles.dot} />
        <View style={styles.line} />
        <View style={styles.square} />
      </View>
      <View style={styles.routeLabels}>
        <Text style={styles.routeStop}>{from}</Text>
        <Text style={styles.routeStop}>{to}</Text>
      </View>
    </View>
    <Text style={styles.routeMeta}>{meta}</Text>
  </View>
);

const RideDetailsScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();
  const params = useDecodedLocalSearchParams<{ rideId?: string }>();
  const rideId = params.rideId;

  const { width } = useWindowDimensions();
  const stacked = width < 900;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!rideId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiUtil.get<Preview>(`/ride/preview/${rideId}`);
        if (!cancelled) setPreview(res);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!isGuest) {
        try {
          const full = await apiUtil.get<Coords>(`/ride/details/${rideId}`);
          if (!cancelled && isValid(full.start_latitude, full.start_longitude) && isValid(full.end_latitude, full.end_longitude)) {
            setCoords(full);
          }
        } catch {
          // Map is optional; the preview already carries the readable route.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rideId, apiUtil, isGuest]);

  const requestSeat = async () => {
    if (!preview) return;
    if (isGuest) {
      requireAuth({ screen: "RideDetailsScreen", params: { rideId } } as any, "to request a seat");
      return;
    }
    setRequesting(true);
    setRequestError(null);
    try {
      await apiUtil.post("/bookings/request", { ride_id: preview.id, request_status: "pending" });
      setRequestSent(true);
    } catch (err: any) {
      setRequestError(err?.response?.data?.message || "Could not request the ride. Try again.");
    } finally {
      setRequesting(false);
    }
  };

  const body = (() => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={WEB.forest} />
        </View>
      );
    }
    if (notFound || !preview) {
      return (
        <View style={styles.centered}>
          <Text style={styles.notFoundTitle}>Ride not found</Text>
          <Text style={styles.notFoundBody}>This ride may have been removed or already left.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("HomeScreen"))}>
            <Text style={styles.primaryBtnText}>Find another ride</Text>
          </Pressable>
        </View>
      );
    }

    const seatsLeft = preview.seats_available > 0;
    const hostName = preview.host_first_name || "a UniPool host";
    const fromLabel = titleCaseLocation(preview.start_location);
    const toLabel = titleCaseLocation(preview.end_location);
    const seatMeta = seatsLeft ? `${preview.seats_available} of ${preview.total_seats} seats open` : "Fully booked";

    return (
      <View style={styles.wrap}>
        <Pressable style={styles.backLink} onPress={() => router.push(appHref("AvailableRidesScreen", {} as any))}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5 L8 12 L15 19" stroke={WEB.inkStrong} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.backLinkText}>All rides</Text>
        </Pressable>

        <View style={[styles.layout, stacked && styles.layoutStacked]}>
          <View style={styles.left}>
            <Text style={styles.routeTitle}>
              {fromLabel} <Text style={styles.routeArrow}>to</Text> {toLabel}
            </Text>
            <Text style={styles.routeWhen}>
              {fmtDate(preview.start_time)} {"·"} {fmtTime(preview.start_time)}
            </Text>

            <View style={styles.mapCard}>
              {coords ? (
                <TripPreviewMap
                  start={{ latitude: coords.start_latitude, longitude: coords.start_longitude }}
                  end={{ latitude: coords.end_latitude, longitude: coords.end_longitude }}
                  style={styles.mapInner}
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 21 C 12 21, 5 14.5, 5 9.5 A 7 7 0 0 1 19 9.5 C 19 14.5, 12 21, 12 21 Z" stroke={WEB.inkMuted} strokeWidth={2} strokeLinejoin="round" />
                    <Path d="M12 7.2 a2.3 2.3 0 1 0 0.01 0" stroke={WEB.inkMuted} strokeWidth={2} />
                  </Svg>
                  <Text style={styles.mapPlaceholderText}>The exact route appears once you join.</Text>
                </View>
              )}
            </View>

            <RouteBlock from={fromLabel} to={toLabel} meta={seatMeta} />
          </View>

          <View style={[styles.right, stacked && styles.rightStacked]}>
            <View style={styles.fareCard}>
              <View style={styles.fareRow}>
                <Text style={styles.fareAmount}>{"₹"}{preview.price_per_seat}</Text>
                <Text style={styles.fareUnit}>per seat</Text>
              </View>
              <Text style={[styles.seatsLine, !seatsLeft && styles.seatsLineFull]}>
                {seatsLeft ? `${preview.seats_available} ${preview.seats_available === 1 ? "seat" : "seats"} left` : "Fully booked"}
              </Text>

              <View style={styles.hostRow}>
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostInitial}>{hostName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.hostName} numberOfLines={1}>{hostName}</Text>
                  <Text style={styles.hostSub} numberOfLines={1}>{preview.host_institute_name || "Verified student host"}</Text>
                </View>
              </View>

              {requestSent ? (
                <View style={styles.sentBox}>
                  <Text style={styles.sentTitle}>Request sent</Text>
                  <Text style={styles.sentBody}>The host will review it. Follow it in Trips.</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    style={[styles.requestBtn, (!seatsLeft || requesting) && styles.requestBtnDisabled]}
                    onPress={requestSeat}
                    disabled={!seatsLeft || requesting}
                  >
                    {requesting ? (
                      <ActivityIndicator color={WEB.lime} />
                    ) : (
                      <Text style={styles.requestBtnText}>
                        {isGuest ? "Sign in to request" : seatsLeft ? "Request a seat" : "Ride is full"}
                      </Text>
                    )}
                  </Pressable>
                  {requestError ? <Text style={styles.requestError}>{requestError}</Text> : null}
                  <Text style={styles.fareNote}>You settle the fare with the host over UPI after the trip.</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  })();

  return <WebShell active="HomeScreen">{body}</WebShell>;
};

export default RideDetailsScreenWeb;

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 120, gap: 10 },
  notFoundTitle: { fontFamily: FONT.display, fontSize: 24, color: WEB.forest },
  notFoundBody: { fontFamily: FONT.semibold, fontSize: 15, color: WEB.inkMuted, marginBottom: 8 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 24, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  wrap: { paddingTop: 20, paddingBottom: 56 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 12 },
  backLinkText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkStrong },

  layout: { flexDirection: "row", gap: 32, alignItems: "flex-start" },
  layoutStacked: { flexDirection: "column", gap: 20 },
  left: { flex: 1, minWidth: 0 },
  routeTitle: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6, lineHeight: 34 },
  routeArrow: { fontFamily: FONT.displayMed, color: WEB.inkMuted, fontSize: 22 },
  routeWhen: { fontFamily: FONT.semibold, fontSize: 15, color: WEB.inkMuted, marginTop: 8, marginBottom: 20 },

  mapCard: { height: 340, borderRadius: RADIUS.card, overflow: "hidden", backgroundColor: WEB.fieldFill, ...cardBorder },
  mapInner: { flex: 1, minHeight: 338 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapPlaceholderText: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkMuted },

  routeBlock: { marginTop: 20, backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 20, ...cardBorder },
  routeRow: { flexDirection: "row", gap: 14 },
  routeRail: { alignItems: "center", paddingVertical: 5 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: WEB.forest },
  line: { width: 2, flex: 1, minHeight: 26, backgroundColor: WEB.inkLine, marginVertical: 4 },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: WEB.forest },
  routeLabels: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  routeStop: { fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, marginVertical: 4 },
  routeMeta: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkMuted, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: WEB.hairline },

  right: { width: 340 },
  rightStacked: { width: "100%" },
  fareCard: {
    position: "sticky" as unknown as "absolute",
    top: 84,
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 24,
    ...cardBorder,
    ...floatShadow,
  },
  fareRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  fareAmount: { fontFamily: FONT.displayBlack, fontSize: 32, color: WEB.forest, letterSpacing: -0.8 },
  fareUnit: { fontFamily: FONT.semibold, fontSize: 14, color: WEB.inkMuted },
  seatsLine: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.midOlive, marginTop: 8 },
  seatsLineFull: { color: WEB.inkMuted },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: WEB.hairline },
  hostAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  hostInitial: { fontFamily: FONT.black, fontSize: 17, color: WEB.lime },
  hostName: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest },
  hostSub: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: 2 },
  requestBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 52, alignItems: "center", justifyContent: "center" },
  requestBtnDisabled: { opacity: 0.45 },
  requestBtnText: { fontFamily: FONT.black, fontSize: 15.5, color: WEB.lime },
  requestError: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 10, textAlign: "center" },
  fareNote: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 18, color: WEB.inkMuted, marginTop: 14, textAlign: "center" },
  sentBox: { backgroundColor: WEB.fieldFill, borderRadius: RADIUS.button, padding: 16 },
  sentTitle: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest, marginBottom: 4 },
  sentBody: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 19, color: WEB.inkStrong },
});
