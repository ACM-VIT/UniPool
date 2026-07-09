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
import React, { Suspense, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { useUser } from "../contexts/UserContext";
import { useDecodedLocalSearchParams, appHref } from "../navigation/routes";
import { getCoordinatesForLocation, getInstantLocationResults } from "../utils/LocationService";
import { openWhatsApp, dialPhone, whatsappDigits } from "../utils/ExternalRideService";

// maplibre-gl is ~the heaviest dependency in the app. Lazy-load it so the
// ride detail page paints instantly (title, route, fare card) and the map
// streams in after, instead of blocking the whole route on the map bundle.
const TripPreviewMap = React.lazy(() => import("../components/TripPreviewMap"));
import { titleCaseLocation } from "../components/web/format";
import { WEB, RADIUS, FONT, cardBorder, cardFloat, floatShadow } from "../components/web/theme";

const APP_STORE_URL = "https://apps.apple.com/app/id6756426249";
const PLAY_STORE_URL = "https://unipool.download";
const openApp = () => {
  if (typeof window === "undefined") return;
  const url = /android/i.test(navigator.userAgent || "") ? PLAY_STORE_URL : APP_STORE_URL;
  window.open(url, "_blank", "noopener,noreferrer");
};

// Mirror of the backend's dmRoomID(a, b): "dm_" + the two user ids sorted.
const dmRoomFor = (a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `dm_${x}_${y}`;
};

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

// An external (off-platform) ride. The /external/preview/:id endpoint returns
// the same sanitized card the nearby/search lists use (host email stays
// server-side). The page then renders a "reach out / notify them" variant
// instead of the request-a-seat card.
type ExternalPreview = {
  id: string;
  source: string;
  source_label: string;
  pickup_point: string;
  destination: string;
  departure_time: string;
  host_name: string;
  host_phone: string;
  /** Whether an invite email can be sent (address stays server-side). When
   *  false we hide the invite CTA and lead with WhatsApp/phone. */
  has_host_email?: boolean;
  vehicle_type: string;
  total_seats: number;
  available_seats: number;
  total_price?: number;
  journey_notes?: string;
};

type InviteState = "idle" | "sending" | "sent" | "already" | "no_email" | "error";

// Rides this browser has already notified for, so revisiting the page shows the
// done state immediately — persisted to localStorage so it survives reloads
// too. The backend is the hard guarantee (one email per user + ride); this is
// only the local UX shortcut, mirroring the mobile sheet.
const INVITED_STORAGE_KEY = "unipool.invitedExternalRides";
const loadInvitedIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(INVITED_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
};
const invitedExternalRideIds = loadInvitedIds();
const markInvited = (id: string) => {
  invitedExternalRideIds.add(id);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVITED_STORAGE_KEY, JSON.stringify([...invitedExternalRideIds]));
  } catch {
    // Storage disabled or full — the in-memory set still covers this session.
  }
};

const externalFirstNameOf = (name: string) =>
  (name || "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim().split(/\s+/)[0] || "the host";

// Full display name with the VIT registration suffix stripped
// ("Sree Raj Muthaiya A L 24BCE0250" → "Sree Raj Muthaiya A L").
const externalDisplayNameOf = (name: string) =>
  (name || "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim() || "Off-platform host";

const looksLikeInternalRideId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// The gated /ride/details/:id response carries the server-computed
// `viewer_state` — the single source of truth for what the viewer should
// see (have they requested? confirmed? are they the host?).
type ViewerState = "host" | "confirmed_passenger" | "pending_passenger" | "rejected_passenger" | "available" | "full" | "past";
type Booking = {
  id: string;
  passenger_id: string;
  request_status: string;
  passenger_name?: string;
  passenger_profile_picture_url?: string;
  passenger_is_verified?: boolean;
  passenger_institute_name?: string;
};
type Actions = { can_cancel_booking?: boolean; can_cancel_ride?: boolean; can_accept_passengers?: boolean };
type Details = Coords & {
  viewer_state?: ViewerState;
  host_user_id?: string;
  host_user_name?: string;
  host_is_verified?: boolean;
  host_institute_name?: string;
  vehicle_info?: string;
  actions?: Actions;
  viewer_booking_id?: string;
  bookings?: Booking[];
};

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

const WhatsAppIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.04 2c-5.5 0-9.97 4.47-9.97 9.97 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.97-4.47 9.97-9.97 0-2.66-1.04-5.17-2.92-7.05A9.9 9.9 0 0 0 12.04 2zm0 1.67c2.23 0 4.32.87 5.9 2.44a8.3 8.3 0 0 1 2.44 5.87c0 4.58-3.73 8.3-8.32 8.3a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.08.81.82-3-.2-.31a8.24 8.24 0 0 1-1.27-4.42c0-4.58 3.73-8.3 8.32-8.3zm-2.5 4.5c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.2.87 2.35.99 2.51.12.16 1.7 2.6 4.13 3.55 2.02.8 2.43.64 2.87.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.32-.74-1.8-.19-.46-.39-.4-.53-.4z" />
  </Svg>
);
const PhoneIcon = ({ color }: { color: string }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Svg>
);
const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 12.5 9 17.5 20 6.5" />
  </Svg>
);

const RideDetailsScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();
  const { user } = useUser();
  const viewerId = user?.id;
  // `rideId` when navigated in-app (query), `id` from the /ride/<id> path.
  const params = useDecodedLocalSearchParams<{ rideId?: string; id?: string }>();
  const rideId = params.rideId ?? params.id;

  const { width } = useWindowDimensions();
  const stacked = width < 900;
  // Below this the request row's avatar + name + 3 action buttons can't sit
  // on one line, so the actions drop to their own row beneath the person.
  const narrowActions = width < 560;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [external, setExternal] = useState<ExternalPreview | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setPreview(null);
    setExternal(null);
    setInviteState("idle");
    setCoords(null);
    setViewerState(null);
    setHostUserId(null);
    setDetails(null);
    setActing(null);
    setRequesting(false);
    setRequestSent(false);
    setRequestError(null);

    if (!rideId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      let previewRes: Preview | null = null;
      let externalRes: ExternalPreview | null = null;
      const loadInternalPreview = async () => {
        previewRes = await apiUtil.getSilent<Preview>(`/ride/preview/${rideId}`);
        if (!cancelled) setPreview(previewRes);
      };
      const loadExternalPreview = async () => {
        externalRes = await apiUtil.getSilent<ExternalPreview>(`/external/preview/${rideId}`);
        if (!cancelled) {
          setExternal(externalRes);
          setInviteState(invitedExternalRideIds.has(externalRes.id) ? "already" : "idle");
        }
      };
      try {
        if (looksLikeInternalRideId(rideId)) {
          await loadInternalPreview();
        } else {
          await loadExternalPreview();
        }
      } catch {
        // If an id is misclassified or the backend changes id shape, keep the
        // fallback so shared links continue to resolve instead of 404ing.
        try {
          if (looksLikeInternalRideId(rideId)) {
            await loadExternalPreview();
          } else {
            await loadInternalPreview();
          }
        } catch {
          // Neither preview resolved — the not-found UI handles this, so no toast.
          if (!cancelled) setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
      // The route is public — a ride is just an A→B. Geocode the stop names
      // so EVERYONE (guests included) sees the route preview, the way the
      // app does. Signed-in viewers then get the exact stored coordinates.
      const startName = previewRes?.start_location ?? externalRes?.pickup_point;
      const endName = previewRes?.end_location ?? externalRes?.destination;
      if (startName && endName) {
        // Try the local popular-locations index first — campus stops resolve
        // instantly with zero network, so the map shows immediately.
        const instant = (name: string): { lat: number; lon: number } | null => {
          const r = getInstantLocationResults(name, undefined, 1)[0];
          if (!r) return null;
          const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
          return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
        };
        const si = instant(startName);
        const ei = instant(endName);
        if (!cancelled && si && ei) {
          setCoords({ start_latitude: si.lat, start_longitude: si.lon, end_latitude: ei.lat, end_longitude: ei.lon });
        } else {
          try {
            const [s, e] = await Promise.all([
              si ? Promise.resolve(si) : getCoordinatesForLocation(startName),
              ei ? Promise.resolve(ei) : getCoordinatesForLocation(endName),
            ]);
            if (!cancelled && s && e) {
              setCoords({ start_latitude: s.lat, start_longitude: s.lon, end_latitude: e.lat, end_longitude: e.lon });
            }
          } catch {
            // Geocoding is best-effort; the readable route stack still shows.
          }
        }
      }
      if (!isGuest && previewRes) {
        try {
          const full = await apiUtil.get<Details>(`/ride/details/${rideId}`);
          if (!cancelled) {
            setDetails(full);
            if (full.viewer_state) setViewerState(full.viewer_state);
            if (full.host_user_id) setHostUserId(full.host_user_id);
            if (isValid(full.start_latitude, full.start_longitude) && isValid(full.end_latitude, full.end_longitude)) {
              setCoords(full);
            }
          }
        } catch {
          // Keep the geocoded preview coords; viewer_state stays unknown.
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

  // Notify an external host through UniPool ("wants to ride with you"). Auth-
  // gated like the mobile sheet; the backend guarantees one email per user +
  // ride, so re-taps read as "already notified".
  const sendInvite = async () => {
    if (!external) return;
    if (inviteState === "sending" || inviteState === "sent" || inviteState === "already") return;
    if (isGuest) {
      requireAuth({ screen: "RideDetailsScreen", params: { rideId } } as any, "to notify this host");
      return;
    }
    setInviteState("sending");
    try {
      const res = await apiUtil.post<{ sent: boolean; already?: boolean; error?: string }, unknown>(
        "/external/invite",
        {
          external_ride_id: external.id,
          host_name: external.host_name,
          start_location: external.pickup_point,
          end_location: external.destination,
        },
      );
      if (res?.sent) {
        markInvited(external.id);
        setInviteState(res.already ? "already" : "sent");
      } else {
        setInviteState(res?.error === "no_email" ? "no_email" : "error");
      }
    } catch (err: any) {
      const code = err?.response?.data?.error || err?.response?.data?.message;
      setInviteState(code === "no_email" ? "no_email" : "error");
    }
  };

  const refetchDetails = async () => {
    if (!rideId) return;
    try {
      const full = await apiUtil.get<Details>(`/ride/details/${rideId}`);
      setDetails(full);
      if (full.viewer_state) setViewerState(full.viewer_state);
    } catch {
      /* leave current state */
    }
  };

  const acceptBooking = async (bookingId: string) => {
    setActing(bookingId);
    try {
      await apiUtil.putSilent(`/bookings/accept/${bookingId}`, {});
      await refetchDetails();
    } catch {
      /* no-op; the row stays */
    } finally {
      setActing(null);
    }
  };
  const rejectBooking = async (bookingId: string) => {
    setActing(bookingId);
    try {
      await apiUtil.putSilent(`/bookings/reject/${bookingId}`, {});
      await refetchDetails();
    } catch {
      /* no-op */
    } finally {
      setActing(null);
    }
  };
  const cancelBooking = async () => {
    const bid = details?.viewer_booking_id;
    if (!bid || typeof window === "undefined" || !window.confirm("Leave this ride?")) return;
    try {
      await apiUtil.deleteSilent(`/booking/delete/${bid}`);
      router.replace(appHref("TripsListScreen"));
    } catch {
      /* no-op */
    }
  };
  const cancelRide = async () => {
    if (!rideId || typeof window === "undefined" || !window.confirm("Cancel this ride for everyone? This can't be undone.")) return;
    try {
      await apiUtil.deleteSilent(`/ride/delete/${rideId}`);
      router.replace(appHref("TripsListScreen"));
    } catch (err: any) {
      // The backend blocks canceling a ride that still has accepted riders;
      // surface its message instead of failing silently.
      const data = err?.response?.data;
      const msg =
        data?.accepted_booking_count > 0
          ? "You've already accepted riders on this trip. Remove them first, then cancel the ride."
          : data?.error || "Couldn't cancel the ride. Please try again.";
      window.alert(msg);
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

    // External (off-platform) ride: the host isn't on UniPool yet, so instead
    // of a request-a-seat card we render the ways to actually reach them
    // (WhatsApp, phone) plus the one-tap "notify them through UniPool" invite,
    // mirroring the mobile ExternalContactSheet.
    if (external) {
      const first = externalFirstNameOf(external.host_name);
      const fromLabel = titleCaseLocation(external.pickup_point);
      const toLabel = titleCaseLocation(external.destination);
      const seatsOpen = external.available_seats > 0;
      const seatMeta = seatsOpen
        ? `${external.available_seats} of ${external.total_seats} seats open`
        : "Fully booked";
      const hasWhatsApp = !!whatsappDigits(external.host_phone);
      const hasPhone = !!external.host_phone;
      const hasContact = hasWhatsApp || hasPhone;
      // Sources like Vigo don't expose a host email, so an invite can never
      // send — hide that CTA and lead with WhatsApp/phone instead of a
      // dead-end "no email on file".
      const canInvite = external.has_host_email === true;
      const waMessage =
        `Hi ${first}, I found your ride from ${external.pickup_point} to ${external.destination} on UniPool ` +
        `and would love to ride with you. Is there room for one more?`;

      const invite = (() => {
        if (!seatsOpen) {
          return { label: "Ride is full", muted: true, disabled: true };
        }
        switch (inviteState) {
          case "sent":
            return { label: `${first} has been notified`, done: true, disabled: true };
          case "already":
            return { label: `${first} already knows`, done: true, disabled: true };
          case "sending":
            return { label: "Letting them know...", spinner: true, disabled: true };
          case "no_email":
            return { label: "No email on file", muted: true, disabled: true };
          case "error":
            return { label: "Didn't send, tap to retry", disabled: false };
          default:
            return { label: `Let ${first} know you want in`, disabled: false };
        }
      })();

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
                {fmtDate(external.departure_time)} {"·"} {fmtTime(external.departure_time)}
              </Text>

              <View style={styles.mapCard}>
                {coords ? (
                  <Suspense fallback={<View style={styles.mapPlaceholder}><ActivityIndicator color={WEB.inkMuted} /></View>}>
                    <TripPreviewMap
                      start={{ latitude: coords.start_latitude, longitude: coords.start_longitude }}
                      end={{ latitude: coords.end_latitude, longitude: coords.end_longitude }}
                      style={styles.mapInner}
                    />
                  </Suspense>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <ActivityIndicator color={WEB.inkMuted} />
                    <Text style={styles.mapPlaceholderText}>Loading route…</Text>
                  </View>
                )}
              </View>

              <RouteBlock from={fromLabel} to={toLabel} meta={seatMeta} />

              {external.journey_notes ? (
                <View style={styles.sideCard}>
                  <Text style={styles.sideTitle}>Notes</Text>
                  <Text style={styles.extNotesBody}>{external.journey_notes}</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.right, stacked && styles.rightStacked]}>
              <View style={styles.fareCard}>
                {typeof external.total_price === "number" ? (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareAmount}>{"₹"}{external.total_price}</Text>
                    <Text style={styles.fareUnit}>per seat</Text>
                  </View>
                ) : null}
                <Text style={[styles.seatsLine, !seatsOpen && styles.seatsLineFull, typeof external.total_price !== "number" && styles.seatsLineNoFare]}>
                  {seatsOpen ? `${external.available_seats} ${external.available_seats === 1 ? "seat" : "seats"} left` : "Fully booked"}
                </Text>
                <Text style={[styles.extSourcePill, styles.extSourcePillSpaced]}>Posted on {external.source_label || "another app"}</Text>

                <View style={styles.hostRow}>
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostInitial}>{(external.host_name || "H").trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.hostName} numberOfLines={1}>{externalDisplayNameOf(external.host_name)}</Text>
                    <Text style={styles.hostSub} numberOfLines={1}>Not on UniPool yet</Text>
                  </View>
                </View>

                {external.vehicle_type ? (
                  <View style={styles.vehicleRow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M5 13 L6.5 8 H17.5 L19 13 M5 13 H19 V17 H5 Z M7.5 17 V19 M16.5 17 V19" stroke={WEB.inkStrong} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text style={styles.vehicleText} numberOfLines={1}>{external.vehicle_type}</Text>
                  </View>
                ) : null}

                {canInvite ? (
                  <Pressable
                    style={[styles.requestBtn, invite.done && styles.inviteDone, invite.muted && styles.inviteMuted]}
                    onPress={invite.disabled ? undefined : sendInvite}
                    disabled={invite.disabled}
                  >
                    {invite.spinner ? (
                      <ActivityIndicator color={WEB.lime} />
                    ) : (
                      <View style={styles.inviteRow}>
                        {invite.done ? <CheckIcon color={WEB.midOlive} /> : null}
                        <Text style={[styles.requestBtnText, invite.done && styles.inviteDoneText, invite.muted && styles.inviteMutedText]} numberOfLines={1}>
                          {invite.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ) : null}

                {seatsOpen && (hasWhatsApp || hasPhone) ? (
                  <View style={styles.contactRow}>
                    {hasWhatsApp ? (
                      <Pressable style={styles.contactBtn} onPress={() => openWhatsApp(external.host_phone, waMessage)}>
                        <WhatsAppIcon color={WEB.midOlive} />
                        <Text style={styles.contactBtnText}>WhatsApp</Text>
                      </Pressable>
                    ) : null}
                    {hasPhone ? (
                      <Pressable style={styles.contactBtn} onPress={() => dialPhone(external.host_phone)}>
                        <PhoneIcon color={WEB.forest} />
                        <Text style={styles.contactBtnText}>Call</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <Text style={styles.fareNote}>
                  {!seatsOpen
                    ? "This ride is already full. Find another ride on this route instead."
                    : canInvite
                    ? `${first} posted this ride elsewhere. Reach out directly, or let them know you found them on UniPool.`
                    : hasContact
                    ? `${first} posted this ride elsewhere on ${external.source_label || "another app"}. Reach out on WhatsApp or by phone.`
                    : `${first} posted this ride elsewhere on ${external.source_label || "another app"}.`}
                </Text>
              </View>
            </View>
          </View>
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

    // A just-submitted request reads as pending immediately; otherwise use
    // the server's viewer_state (only known for signed-in viewers).
    const effectiveState: ViewerState | null = requestSent ? "pending_passenger" : viewerState;

    const openAppBtn = (
      <Pressable style={({ hovered }: any) => [styles.appLinkBtn, hovered && styles.appLinkBtnHover]} onPress={openApp}>
        <Text style={styles.appLinkText}>Open in the UniPool app</Text>
      </Pressable>
    );
    const findAnotherBtn = (
      <Pressable style={({ hovered }: any) => [styles.appLinkBtn, hovered && styles.appLinkBtnHover]} onPress={() => router.push(appHref("AvailableRidesScreen", {} as any))}>
        <Text style={styles.appLinkText}>Find another ride</Text>
      </Pressable>
    );
    const openChatBtn = (
      <Pressable
        style={[styles.requestBtn, styles.chatBtn]}
        onPress={() => router.push(appHref("ChatMessages", { chatId: preview.id, chatTitle: `${fromLabel} to ${toLabel}`, chatSubtitle: `Hosted by ${hostName}`, isGroupChat: true } as any))}
      >
        <Text style={styles.requestBtnText}>Open chat</Text>
      </Pressable>
    );
    // A pending passenger isn't in the group chat yet — they DM the host.
    const messageHostBtn = viewerId && hostUserId ? (
      <Pressable
        style={[styles.requestBtn, styles.chatBtn]}
        onPress={() => router.push(appHref("ChatMessages", { dmRoomId: dmRoomFor(viewerId, hostUserId), chatId: preview.id, chatTitle: `Chat with ${hostName}`, chatSubtitle: `${fromLabel} to ${toLabel}` } as any))}
      >
        <Text style={styles.requestBtnText}>Message host</Text>
      </Pressable>
    ) : null;
    const statusBox = (title: string, bodyText: string, accent?: boolean) => (
      <View style={[styles.statusBox, accent && styles.statusBoxAccent]}>
        <Text style={styles.statusTitle}>{title}</Text>
        {bodyText ? <Text style={styles.statusBody}>{bodyText}</Text> : null}
      </View>
    );

    const cta = (() => {
      if (!isGuest && effectiveState) {
        switch (effectiveState) {
          case "pending_passenger":
            return <>{statusBox("Request sent", "Waiting for the host to accept. Message them if you have a question.")}{messageHostBtn}{openAppBtn}</>;
          case "confirmed_passenger":
            return <>{statusBox("You're in!", "Your seat is confirmed. Chat with the host below.", true)}{openChatBtn}{openAppBtn}</>;
          case "rejected_passenger":
            return <>{statusBox("Request declined", "The host couldn't fit you in this time.")}{findAnotherBtn}</>;
          case "host":
            return <>{statusBox("You're hosting this ride", "Chat with your riders and manage requests.")}{openChatBtn}{openAppBtn}</>;
          case "past":
            return <>{statusBox("This ride has already left", "")}{findAnotherBtn}</>;
          case "full":
            return (
              <>
                <View style={[styles.requestBtn, styles.requestBtnDisabled]}><Text style={styles.requestBtnText}>Ride is full</Text></View>
                {findAnotherBtn}
              </>
            );
          // "available" falls through to the request button below.
        }
      }
      return (
        <>
          <Pressable
            style={[styles.requestBtn, (!seatsLeft || requesting) && styles.requestBtnDisabled]}
            onPress={requestSeat}
            disabled={!seatsLeft || requesting}
          >
            {requesting ? (
              <ActivityIndicator color={WEB.lime} />
            ) : (
              <Text style={styles.requestBtnText}>{!seatsLeft ? "Ride is full" : isGuest ? "Sign in to request" : "Request a seat"}</Text>
            )}
          </Pressable>
          {requestError ? <Text style={styles.requestError}>{requestError}</Text> : null}
          {openAppBtn}
          <Text style={styles.fareNote}>Settle the fare with the host over UPI after the trip.</Text>
        </>
      );
    })();

    const bookings = details?.bookings ?? [];
    const acceptedPassengers = bookings.filter((b) => b.request_status === "accepted");
    const pendingRequests = bookings.filter((b) => b.request_status === "pending");
    const canManage = !!details?.actions?.can_accept_passengers;
    const hostVerified = !!details?.host_is_verified;
    const hostInstitute = details?.host_institute_name || preview.host_institute_name;
    const vehicleInfo = details?.vehicle_info;
    const canCancelBooking = !!details?.actions?.can_cancel_booking;
    const canCancelRide = !!details?.actions?.can_cancel_ride;

    const PersonRow: React.FC<{ name?: string; verified?: boolean; sub?: string; right?: React.ReactNode; last?: boolean }> = ({ name, verified, sub, right, last }) => (
      <View style={[styles.personRow, !last && styles.personRowBorder]}>
        <View style={styles.personAvatar}><Text style={styles.personInitial}>{(name || "U").trim().charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.personNameRow}>
            <Text style={styles.personName} numberOfLines={1}>{name || "Student"}</Text>
            {verified ? (
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2 L14.6 4.2 L18 4 L18.3 7.4 L21 9.5 L19.2 12.4 L20 16 L16.6 16.8 L14.8 19.8 L12 18.2 L9.2 19.8 L7.4 16.8 L4 16 L4.8 12.4 L3 9.5 L5.7 7.4 L6 4 L9.4 4.2 Z" fill={WEB.midOlive} />
                <Path d="M8.5 12 L11 14.5 L15.5 9.5" stroke={WEB.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </View>
          {sub ? <Text style={styles.personSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {right}
      </View>
    );

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
                <Suspense fallback={<View style={styles.mapPlaceholder}><ActivityIndicator color={WEB.inkMuted} /></View>}>
                  <TripPreviewMap
                    start={{ latitude: coords.start_latitude, longitude: coords.start_longitude }}
                    end={{ latitude: coords.end_latitude, longitude: coords.end_longitude }}
                    style={styles.mapInner}
                  />
                </Suspense>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator color={WEB.inkMuted} />
                  <Text style={styles.mapPlaceholderText}>Loading route…</Text>
                </View>
              )}
            </View>

            <RouteBlock from={fromLabel} to={toLabel} meta={seatMeta} />

            {acceptedPassengers.length > 0 ? (
              <View style={styles.sideCard}>
                <Text style={styles.sideTitle}>Riders <Text style={styles.sideCount}>{acceptedPassengers.length}</Text></Text>
                {acceptedPassengers.map((p, i) => (
                  <PersonRow key={p.id} name={p.passenger_name} verified={p.passenger_is_verified} sub={p.passenger_institute_name} last={i === acceptedPassengers.length - 1} />
                ))}
              </View>
            ) : null}

            {canManage && pendingRequests.length > 0 ? (
              <View style={styles.sideCard}>
                <Text style={styles.sideTitle}>Requests <Text style={styles.sideCount}>{pendingRequests.length}</Text></Text>
                {pendingRequests.map((p, i) => {
                  const last = i === pendingRequests.length - 1;
                  const actions = (
                    <View style={[styles.reqActions, narrowActions && styles.reqActionsStacked]}>
                      {viewerId && p.passenger_id ? (
                        <Pressable style={styles.reqMsg} onPress={() => router.push(appHref("ChatMessages", { dmRoomId: dmRoomFor(viewerId, p.passenger_id), chatId: preview.id, chatTitle: `Chat with ${(p.passenger_name || "").split(" ")[0]}`, chatSubtitle: `${fromLabel} to ${toLabel}` } as any))} accessibilityLabel="Message">
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M4 5 H20 A1 1 0 0 1 21 6 V16 A1 1 0 0 1 20 17 H9 L4 21 V6 A1 1 0 0 1 5 5 Z" stroke={WEB.forest} strokeWidth={2} strokeLinejoin="round" /></Svg>
                        </Pressable>
                      ) : null}
                      <Pressable style={[styles.reqBtn, styles.reqReject]} onPress={() => rejectBooking(p.id)} disabled={acting === p.id}>
                        <Text style={styles.reqRejectText}>Decline</Text>
                      </Pressable>
                      <Pressable style={[styles.reqBtn, styles.reqAccept]} onPress={() => acceptBooking(p.id)} disabled={acting === p.id}>
                        {acting === p.id ? <ActivityIndicator color={WEB.forest} /> : <Text style={styles.reqAcceptText}>Accept</Text>}
                      </Pressable>
                    </View>
                  );
                  return narrowActions ? (
                    <View key={p.id} style={[styles.reqStack, !last && styles.personRowBorder]}>
                      <PersonRow name={p.passenger_name} verified={p.passenger_is_verified} sub={p.passenger_institute_name} last />
                      {actions}
                    </View>
                  ) : (
                    <PersonRow key={p.id} name={p.passenger_name} verified={p.passenger_is_verified} sub={p.passenger_institute_name} last={last} right={actions} />
                  );
                })}
              </View>
            ) : null}
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
                  <Text style={styles.hostInitial}>{(details?.host_user_name || hostName).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.hostNameRow}>
                    <Text style={styles.hostName} numberOfLines={1}>{details?.host_user_name || hostName}</Text>
                    {hostVerified ? (
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 2 L14.6 4.2 L18 4 L18.3 7.4 L21 9.5 L19.2 12.4 L20 16 L16.6 16.8 L14.8 19.8 L12 18.2 L9.2 19.8 L7.4 16.8 L4 16 L4.8 12.4 L3 9.5 L5.7 7.4 L6 4 L9.4 4.2 Z" fill={WEB.midOlive} />
                        <Path d="M8.5 12 L11 14.5 L15.5 9.5" stroke={WEB.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    ) : null}
                  </View>
                  <Text style={styles.hostSub} numberOfLines={1}>{hostInstitute || "Student host"}</Text>
                </View>
              </View>

              {vehicleInfo ? (
                <View style={styles.vehicleRow}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M5 13 L6.5 8 H17.5 L19 13 M5 13 H19 V17 H5 Z M7.5 17 V19 M16.5 17 V19" stroke={WEB.inkStrong} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                  <Text style={styles.vehicleText} numberOfLines={1}>{vehicleInfo}</Text>
                </View>
              ) : null}

              {cta}

              {canCancelBooking || canCancelRide ? (
                <Pressable style={styles.cancelLink} onPress={canCancelRide ? cancelRide : cancelBooking}>
                  <Text style={styles.cancelText}>{canCancelRide ? "Cancel ride" : viewerState === "confirmed_passenger" ? "Leave ride" : "Cancel request"}</Text>
                </Pressable>
              ) : null}
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

  mapCard: { height: 340, borderRadius: RADIUS.card, overflow: "hidden", backgroundColor: WEB.surface, ...cardBorder, ...cardFloat },
  mapInner: { flex: 1, minHeight: 338 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapPlaceholderText: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkMuted },

  routeBlock: { marginTop: 20, backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 20, ...cardBorder, ...cardFloat },
  routeRow: { flexDirection: "row", gap: 14 },
  routeRail: { alignItems: "center", paddingVertical: 5 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: WEB.forest },
  line: { width: 2, flex: 1, minHeight: 26, backgroundColor: WEB.inkLine, marginVertical: 4 },
  square: { width: 10, height: 10, borderRadius: 2, backgroundColor: WEB.forest },
  routeLabels: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  routeStop: { fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, marginVertical: 4 },
  routeMeta: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkMuted, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: WEB.hairline },

  sideCard: { marginTop: 20, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingHorizontal: 20, paddingVertical: 14, ...cardBorder, ...cardFloat },
  sideTitle: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.forest, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  sideCount: { fontFamily: FONT.black, fontSize: 12, color: WEB.midOlive },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  personRowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  personAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  personInitial: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  personName: { fontFamily: FONT.bold, fontSize: 14.5, color: WEB.forest, flexShrink: 1 },
  personSub: { fontFamily: FONT.semibold, fontSize: 12.5, color: WEB.inkMuted, marginTop: 1 },
  reqActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqMsg: { width: 34, height: 34, borderRadius: 17, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center" },
  reqBtn: { height: 34, paddingHorizontal: 14, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  reqReject: { backgroundColor: WEB.fieldFill },
  reqRejectText: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkStrong },
  reqAccept: { backgroundColor: WEB.lime, minWidth: 64 },
  reqAcceptText: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.forest },
  reqStack: {},
  reqActionsStacked: { marginLeft: 50, marginTop: 2, marginBottom: 12, justifyContent: "flex-start" },

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
  hostNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  hostName: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest, flexShrink: 1 },
  hostSub: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: 2 },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18, paddingHorizontal: 2 },
  vehicleText: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkStrong, flex: 1 },
  cancelLink: { alignItems: "center", paddingVertical: 12, marginTop: 6 },
  cancelText: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.inkMuted },
  requestBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 52, alignItems: "center", justifyContent: "center" },
  chatBtn: { marginTop: 12 },
  requestBtnDisabled: { opacity: 0.45 },
  requestBtnText: { fontFamily: FONT.black, fontSize: 15.5, color: WEB.lime },
  appLinkBtn: { height: 46, borderRadius: RADIUS.button, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: WEB.hairline, marginTop: 10 },
  appLinkBtnHover: { borderColor: WEB.forest, backgroundColor: WEB.fieldFill },
  appLinkText: { fontFamily: FONT.bold, fontSize: 14.5, color: WEB.forest },
  requestError: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 10, textAlign: "center" },
  fareNote: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 18, color: WEB.inkMuted, marginTop: 14, textAlign: "center" },
  statusBox: { backgroundColor: WEB.fieldFill, borderRadius: RADIUS.button, padding: 16 },
  statusBoxAccent: { backgroundColor: "rgba(181,215,80,0.20)" },
  statusTitle: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest, marginBottom: 4 },
  statusBody: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 19, color: WEB.inkStrong },

  // External-ride variant.
  extSourcePill: { alignSelf: "flex-start", backgroundColor: WEB.fieldFill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontFamily: FONT.bold, fontSize: 12.5, color: WEB.inkStrong },
  extSourcePillSpaced: { marginTop: 14 },
  seatsLineNoFare: { marginTop: 0 },
  extNotesBody: { fontFamily: FONT.semibold, fontSize: 13.5, lineHeight: 20, color: WEB.inkStrong },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inviteDone: { backgroundColor: "rgba(122,153,90,0.16)" },
  inviteDoneText: { color: WEB.midOlive },
  inviteMuted: { backgroundColor: WEB.inkSubtle },
  inviteMutedText: { color: WEB.inkMuted },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: RADIUS.button, borderWidth: 1.5, borderColor: WEB.hairline, backgroundColor: WEB.surface },
  contactBtnText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.forest },
});
