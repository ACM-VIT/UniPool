import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { useApi } from "../utils/ApiUtil";
import BrandedAlert from "./BrandedAlert";
import RouteStack from "./RouteStack";
import PressableScale from "./PressableScale";
import { haptic } from "./haptics";
import { displayRideLocation } from "../utils/LocationService";

export type TripCardStage = "upcoming" | "in_window" | "stale";

export type TripCard = {
  booking_id: string;
  ride_id: string;
  host_user_id: string;
  host_name: string;
  host_profile_picture_url?: string;
  host_upi_vpa?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  stage: TripCardStage;
};

interface ActiveTripCardProps {
  onPressOpen?: (rideId: string) => void;
  /** Fires whenever the card mounts/unmounts a real card. Drives the
   *  home sheet's mutual-exclusion with "Your trips" — when there's
   *  an active trip surface, the upcoming-trips carousel hides. */
  onPresenceChange?: (present: boolean) => void;
  cardFromState?: TripCard | null;
  appStateResolved?: boolean;
}

/**
 * Home-screen card that surfaces the user's currently relevant trip.
 * Drives the post-trip pay flow: when the trip's `stage` shifts to
 * `in_window` (between start_time and start_time+24h), a `Pay {host}`
 * button appears. Tapping it fires a UPI deeplink and records the
 * "paid" dismissal — that's the de-facto completion signal, since
 * users won't manually mark trips complete.
 *
 * State machine (server-derived):
 *   upcoming  — trip is in the future, info card only
 *   in_window — Pay button + Didn't happen link
 *   stale     — collapsed compact reminder; same actions still avail
 *
 * If `/trip-card/active` returns 204, nothing renders — the card is
 * silent when there's no relevant trip.
 */
const ActiveTripCard: React.FC<ActiveTripCardProps> = ({
  onPressOpen,
  onPresenceChange,
  cardFromState,
  appStateResolved,
}) => {
  const colors = useThemeColors();
  const { apiUtil } = useApi();
  const [card, setCard] = useState<TripCard | null>(null);
  const [busy, setBusy] = useState(false);
  const hasFocusedOnceRef = useRef(false);
  const controlledByAppState = appStateResolved !== undefined;

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<{ trip_card: TripCard | null }>("/trip-card/active");
      setCard(resp?.trip_card ?? null);
    } catch {
      // 204 No Content shows up here too — silent failure is fine,
      // the card just doesn't render.
      setCard(null);
    }
  }, [apiUtil]);

  useEffect(() => {
    if (controlledByAppState) return;
    load();
  }, [controlledByAppState, load]);

  useFocusEffect(
    useCallback(() => {
      if (controlledByAppState) return undefined;
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      void load();
      return undefined;
    }, [controlledByAppState, load]),
  );

  useEffect(() => {
    if (!controlledByAppState || !appStateResolved) return;
    setCard(cardFromState ?? null);
  }, [appStateResolved, cardFromState, controlledByAppState]);

  useEffect(() => {
    onPresenceChange?.(!!card);
  }, [card, onPresenceChange]);

  if (!card) return null;

  const hostFirst = (card.host_name || "the host").trim().split(/\s+/)[0];
  const tripDate = formatTripWhen(card.start_time);

  const dismiss = async (signal: "paid" | "no_show") => {
    setBusy(true);
    try {
      await apiUtil.post("/trip-card/dismiss", {
        booking_id: card.booking_id,
        signal,
      });
      setCard(null);
    } catch (err) {
      console.warn("[ActiveTripCard] dismiss failed", err);
      BrandedAlert.alert("Couldn't update", "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const onPay = async () => {
    if (!card.host_upi_vpa) {
      // No VPA on file — still record paid as the intent, but tell
      // the user we couldn't open UPI directly.
      BrandedAlert.alert(
        "Pay outside the app",
        `${hostFirst} hasn't added a UPI ID. Settle the fare directly.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark as paid", onPress: () => dismiss("paid") },
        ],
      );
      return;
    }
    const note = encodeURIComponent(
      `UniPool · ${displayRideLocation(card.start_location)} → ${displayRideLocation(card.end_location)} · ${tripDate}`,
    );
    const url = `upi://pay?pa=${encodeURIComponent(card.host_upi_vpa)}&pn=${encodeURIComponent(hostFirst)}&am=${card.total_price}&tn=${note}&cu=INR`;
    try {
      // Skip the `canOpenURL` probe and just try to open. On Android 11+
      // the probe needs `<queries>` for the upi scheme, on iOS it needs
      // `LSApplicationQueriesSchemes`, and both are now in place — but
      // older OS versions and edge cases still flake. `openURL` is the
      // real signal: if it throws, no UPI app handled the intent.
      await Linking.openURL(url);
      // Pay is the de-facto trip-completion signal — confirm the
      // handoff to the UPI app with a success tick.
      haptic("success");
      // Optimistic dismiss — the tap is the signal, we don't try
      // to verify the UPI app actually completed the payment.
      dismiss("paid");
    } catch {
      BrandedAlert.alert(
        "No UPI app installed",
        `Install GPay / PhonePe / any UPI app to pay ${hostFirst}, or pay outside the app.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark as paid", onPress: () => dismiss("paid") },
        ],
      );
    }
  };

  const compact = card.stage === "stale";
  const showPayBtn = card.stage === "in_window" || card.stage === "stale";

  return (
    <PressableScale
      style={[
        styles.card,
        // navFill keeps the forest surface in light AND swaps to
        // raised charcoal in dark — matches the rest of the dark
        // surface system without re-introducing green in dark mode.
        { backgroundColor: colors.navFill },
        compact && styles.cardCompact,
      ]}
      onPress={() => onPressOpen?.(card.ride_id)}
    >
      <RouteStack
        tone="onForest"
        start={card.start_location}
        end={card.end_location}
        compact={compact}
      />

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, colors.mode === "dark" && { color: colors.textOnDark }]}>
          {card.stage === "upcoming" ? `with ${hostFirst} · ${tripDate}` : `${tripDate} · with ${hostFirst}`}
        </Text>
      </View>

      {showPayBtn ? (
        <View style={styles.actionRow}>
          <PressableScale
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
            disabled={busy}
            onPress={onPay}
            haptic="medium"
          >
            <Text style={[styles.payBtnText, { color: colors.textOnAccent }]}>
              Pay {hostFirst} ₹{card.total_price}
            </Text>
          </PressableScale>
          {/* Quiet escape hatch for the rare "the trip didn't actually
              happen" case. Centered tiny link below the primary Pay
              button so it never competes with the headline action — it
              only needs to be findable, not loud. */}
          <PressableScale
            onPress={() => dismiss("no_show")}
            disabled={busy}
            hitSlop={10}
            haptic={null}
            style={styles.dismissLinkWrap}
          >
            <Text style={[styles.dismissLink, colors.mode === "dark" && { color: colors.textOnDark }]}>Trip didn't happen</Text>
          </PressableScale>
        </View>
      ) : null}
    </PressableScale>
  );
};

// Friendly relative day label. Today/Tomorrow/Yesterday/short date —
// matches the rest of the app's date formatting vocabulary.
const formatTripWhen = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
};

const styles = StyleSheet.create({
  // Forest dark card, same vocabulary as RideCard / PreviousTripsCompressed.
  card: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 10,
  },
  cardCompact: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  connector: {
    width: 2,
    height: 14,
    marginLeft: 5,
    marginVertical: 2,
    backgroundColor: "rgba(181,215,80,0.45)",
  },
  routeText: {
    flex: 1,
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    letterSpacing: -0.15,
  },
  metaRow: {
    marginTop: 10,
  },
  metaText: {
    color: AppColors.primaryLightGreen,
    opacity: 0.75,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  actionRow: {
    marginTop: 14,
    // Stacked, not side-by-side — keeps the Pay button full-width and
    // the "trip didn't happen" escape hatch quietly below.
    flexDirection: "column",
    alignItems: "stretch",
  },
  // Lime fill on the forest card — inverse pattern, premium CTA.
  payBtn: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  payBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  dismissLinkWrap: {
    alignSelf: "center",
    paddingVertical: 8,
    marginTop: 2,
  },
  dismissLink: {
    color: AppColors.primaryLightGreen,
    opacity: 0.55,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
});

export default ActiveTripCard;
