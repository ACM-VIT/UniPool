import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import BrandedAlert from "./BrandedAlert";
import { haptic } from "./PressableScale";
import type { ChatMessage } from "../screens/ChatScreens/ChatScreen.types";

type Props = {
  message: ChatMessage;
  /** True when the current viewer is the ride's host. Drives whether
   *  Confirm / Didn't receive buttons appear on a payment_marker. */
  viewerIsHost: boolean;
  /** Optional notifier so the chat screen can refresh after an ack
   *  (e.g. show a transient toast or refetch the message list). */
  onAcked?: () => void;
};

/**
 * Apple-Pay-style chat card for the payment lifecycle. Renders both
 * kinds of system messages:
 *
 *   payment_marker  posted by the passenger when they mark a trip
 *                   paid. Shows amount + passenger name. The host
 *                   sees Confirm received / Didn't receive buttons
 *                   inline; everyone else sees the card without
 *                   actions.
 *
 *   payment_ack     posted by the host after they ack. A compact
 *                   line with a checkmark (received) or warning
 *                   (missing) — no buttons; the lifecycle is closed
 *                   at this point.
 *
 * Lives outside the message-bubble row so a payment card spans the
 * chat full-width like the Apple-Pay-in-iMessage treatment, instead
 * of being constrained to the left/right bubble lane.
 */
const PaymentChatCard: React.FC<Props> = ({ message, viewerIsHost, onAcked }) => {
  const { apiUtil } = useApi();
  const meta = message.metadata || {};

  if (message.kind === "payment_ack") {
    return <PaymentAckLine ack={String(meta.ack || "")} text={message.text} />;
  }

  // payment_marker
  const amount = typeof meta.amount === "number" ? meta.amount : Number(meta.amount) || 0;
  const passengerName = String(meta.passenger_name || message.senderName || "Passenger");
  const bookingID = typeof meta.booking_id === "string" ? meta.booking_id : "";

  return (
    <PaymentMarkerCard
      amount={amount}
      passengerName={passengerName}
      bookingID={bookingID}
      viewerIsHost={viewerIsHost}
      apiUtil={apiUtil}
      onAcked={onAcked}
    />
  );
};

// --- payment_marker ---

const PaymentMarkerCard: React.FC<{
  amount: number;
  passengerName: string;
  bookingID: string;
  viewerIsHost: boolean;
  apiUtil: ReturnType<typeof useApi>["apiUtil"];
  onAcked?: () => void;
}> = ({ amount, passengerName, bookingID, viewerIsHost, apiUtil, onAcked }) => {
  // `pendingAck` keeps optimistic UI honest. Once the host taps a
  // button we hide both, switch to a small busy spinner, and then
  // let the inbound payment_ack message render the result. The
  // socket usually delivers it before the HTTP response returns.
  const [pendingAck, setPendingAck] = useState<"received" | "missing" | null>(null);

  const ack = async (kind: "received" | "missing") => {
    if (!bookingID || pendingAck) return;
    haptic(kind === "received" ? "success" : "warning");
    setPendingAck(kind);
    try {
      await apiUtil.postSilent<{ status: string }, { ack: string }>(
        `/booking/${bookingID}/payment-ack`,
        { ack: kind },
      );
      onAcked?.();
    } catch (err: any) {
      setPendingAck(null);
      haptic("error");
      BrandedAlert.alert(
        "Couldn't record that",
        err?.response?.data?.error || "Try again in a moment.",
      );
    }
  };

  return (
    <View style={styles.cardWrap}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>💸</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKicker}>Payment marked</Text>
            <Text style={styles.cardTitle}>
              {passengerName} marked ₹{amount} as paid
            </Text>
          </View>
        </View>

        {viewerIsHost ? (
          <View style={styles.actionsRow}>
            {pendingAck ? (
              <View style={styles.actionsBusy}>
                <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} />
                <Text style={styles.actionsBusyText}>Recording…</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  activeOpacity={0.85}
                  onPress={() => ack("missing")}
                  accessibilityLabel="Didn't receive payment"
                >
                  <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>
                    Didn't receive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  activeOpacity={0.85}
                  onPress={() => ack("received")}
                  accessibilityLabel="Confirm payment received"
                >
                  <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                    Confirm received
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          // Non-host viewer (the passenger themselves, or another
          // accepted rider). Just shows the marker without action
          // buttons — the host owns the ack.
          <Text style={styles.cardFootnote}>Waiting for host to confirm…</Text>
        )}
      </View>
    </View>
  );
};

// --- payment_ack ---

const PaymentAckLine: React.FC<{ ack: string; text: string }> = ({ ack, text }) => {
  const received = ack === "received";
  return (
    <View style={styles.ackWrap}>
      <View style={[styles.ackPill, received ? styles.ackPillSuccess : styles.ackPillWarning]}>
        <Text style={styles.ackGlyph}>{received ? "✓" : "!"}</Text>
        <Text
          style={[styles.ackText, received ? styles.ackTextSuccess : styles.ackTextWarning]}
          numberOfLines={2}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrap: {
    width: "100%",
    paddingHorizontal: 8,
    marginVertical: 6,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: AppColors.basicWhite,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // Soft elevation matching the chat-list cards so the payment
    // card feels like a first-class chat surface, not an overlay.
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  cardKicker: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textTransform: "uppercase",
  },
  cardTitle: {
    marginTop: 2,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  cardFootnote: {
    marginTop: 10,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  actionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.20)",
  },
  actionBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    letterSpacing: -0.1,
  },
  actionBtnTextPrimary: {
    color: AppColors.primaryLightGreen,
  },
  actionBtnTextSecondary: {
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
  },
  actionsBusy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  actionsBusyText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
  },
  ackWrap: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  ackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: 320,
  },
  ackPillSuccess: {
    backgroundColor: "rgba(181,215,80,0.30)",
  },
  ackPillWarning: {
    backgroundColor: "rgba(255,107,91,0.18)",
  },
  ackGlyph: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    lineHeight: 18,
    color: AppColors.basicWhite,
    overflow: "hidden",
  },
  ackText: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12.5,
    letterSpacing: -0.1,
  },
  ackTextSuccess: {
    color: AppColors.secondaryDarkGreen,
  },
  ackTextWarning: {
    color: "#A8281A",
  },
});

// Glyph styling tweak: success uses forest BG, warning uses coral BG.
// Inlined via inline style on the glyph so we don't fan out two
// near-identical style objects.
const _glyphPolish = StyleSheet.create({
  glyphSuccess: { backgroundColor: AppColors.secondaryDarkGreen },
  glyphWarning: { backgroundColor: "#D24432" },
});
// Apply via runtime composition rather than another conditional in
// the JSX so the render stays compact.
(PaymentAckLine as any).styles = _glyphPolish;

export default PaymentChatCard;
