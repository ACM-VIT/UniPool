import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from "react-native";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import BrandedAlert from "./BrandedAlert";

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
const ActiveTripCard: React.FC<ActiveTripCardProps> = ({ onPressOpen }) => {
  const { apiUtil } = useApi();
  const [card, setCard] = useState<TripCard | null>(null);
  const [busy, setBusy] = useState(false);

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
    load();
  }, [load]);

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
        `${hostFirst} hasn't added a UPI ID — settle the fare directly.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark as paid", onPress: () => dismiss("paid") },
        ],
      );
      return;
    }
    const note = encodeURIComponent(
      `UniPool · ${card.start_location} → ${card.end_location} · ${tripDate}`,
    );
    const url = `upi://pay?pa=${encodeURIComponent(card.host_upi_vpa)}&pn=${encodeURIComponent(hostFirst)}&am=${card.total_price}&tn=${note}&cu=INR`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("UPI not available");
      await Linking.openURL(url);
      // Optimistic dismiss — the tap is the signal, we don't try
      // to verify the UPI app actually completed the payment.
      dismiss("paid");
    } catch {
      BrandedAlert.alert(
        "No UPI app installed",
        `Install GPay / PhonePe / any UPI app to pay ${hostFirst}, or pay outside the app.`,
      );
    }
  };

  const compact = card.stage === "stale";
  const showPayBtn = card.stage === "in_window" || card.stage === "stale";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => onPressOpen?.(card.ride_id)}
    >
      <View style={styles.routeRow}>
        <View style={styles.dotOutline} />
        <Text style={styles.routeText} numberOfLines={1}>
          {card.start_location}
        </Text>
      </View>
      <View style={styles.connector} />
      <View style={styles.routeRow}>
        <View style={styles.dotFilled} />
        <Text style={styles.routeText} numberOfLines={1}>
          {card.end_location}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {card.stage === "upcoming" ? `with ${hostFirst} · ${tripDate}` : `${tripDate} · with ${hostFirst}`}
        </Text>
      </View>

      {showPayBtn ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.payBtn}
            disabled={busy}
            onPress={onPay}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>
              Pay {hostFirst} ₹{card.total_price}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => dismiss("no_show")}
            disabled={busy}
            hitSlop={10}
          >
            <Text style={styles.dismissLink}>Didn't happen</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  // Lime fill on the forest card — inverse pattern, premium CTA.
  payBtn: {
    flex: 1,
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
  dismissLink: {
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12.5,
    textDecorationLine: "underline",
  },
});

export default ActiveTripCard;
