import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
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
 *                   paid. Shows amount as the hero number + passenger
 *                   name. The host sees Confirm received / Didn't
 *                   receive buttons inline; everyone else sees the
 *                   card without actions.
 *
 *   payment_ack     posted by the host after they ack. A compact
 *                   pill with a coloured glyph circle (forest tick
 *                   for received, coral exclamation for missing).
 *                   No buttons; lifecycle is closed.
 *
 * Lives outside the message-bubble row so the card spans full-width
 * like the Apple-Pay-in-iMessage treatment, instead of being squeezed
 * into the left/right bubble lane.
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

// --- payment_marker -------------------------------------------------

const PaymentMarkerCard: React.FC<{
  amount: number;
  passengerName: string;
  bookingID: string;
  viewerIsHost: boolean;
  apiUtil: ReturnType<typeof useApi>["apiUtil"];
  onAcked?: () => void;
}> = ({ amount, passengerName, bookingID, viewerIsHost, apiUtil, onAcked }) => {
  const colors = useThemeColors();
  // `pendingAck` keeps optimistic UI honest. Once the host taps a
  // button we hide both buttons and show a busy spinner; the
  // inbound payment_ack socket push lands shortly after and the
  // marker stays as-is while the ack pill renders below it.
  const [pendingAck, setPendingAck] = useState<"received" | "missing" | null>(null);

  // Soft fade + scale-in so the card lands like a notification card
  // instead of popping into existence. Tiny spring (250ms) — the
  // chat list scrolls past these constantly and a long animation
  // would feel laggy.
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
    // Host-side: gentle haptic when a new payment marker lands so
    // they notice the new action needed even if their eyes were
    // somewhere else. Passenger side stays silent — they just sent
    // it, they know.
    if (viewerIsHost) {
      haptic("light");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <Animated.View style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.inkSubtle },
        ]}
      >
        {/* Hero amount, like an Apple Pay card. The kicker label
            sits above so the eye reads "payment, ₹250" in one
            glance instead of having to parse a sentence. */}
        <Text style={[styles.cardKicker, { color: colors.textTertiary }]}>Payment marked</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountCurrency, { color: colors.textPrimary }]}>₹</Text>
          <Text style={[styles.amountValue, { color: colors.textPrimary }]}>{amount}</Text>
        </View>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          {passengerName} says they've paid
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.inkSubtle }]} />

        {viewerIsHost ? (
          pendingAck ? (
            <View style={styles.actionsBusy}>
              <ActivityIndicator size="small" color={colors.textPrimary} />
              <Text style={[styles.actionsBusyText, { color: colors.textSecondary }]}>
                {pendingAck === "received" ? "Confirming…" : "Flagging…"}
              </Text>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnSecondary,
                  { borderColor: colors.inkLine },
                ]}
                activeOpacity={0.85}
                onPress={() => ack("missing")}
                accessibilityLabel="Didn't receive payment"
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    styles.actionBtnTextSecondary,
                    { color: colors.textPrimary },
                  ]}
                >
                  Didn't receive
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  // Forest in light → lime in dark. textOnAccent flips
                  // so the label stays legible either way.
                  {
                    backgroundColor:
                      colors.mode === "dark" ? colors.primary : colors.textPrimary,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => ack("received")}
                accessibilityLabel="Confirm payment received"
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    styles.actionBtnTextPrimary,
                    {
                      color:
                        colors.mode === "dark" ? colors.textOnAccent : colors.primary,
                    },
                  ]}
                >
                  Confirm received
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          // Non-host viewer — passenger themselves or another
          // accepted rider. Just an awaiting-ack note; the host
          // owns the action.
          <Text style={[styles.waitingFootnote, { color: colors.textTertiary }]}>
            Waiting for host to confirm…
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// --- payment_ack ----------------------------------------------------

const PaymentAckLine: React.FC<{ ack: string; text: string }> = ({ ack, text }) => {
  const colors = useThemeColors();
  const received = ack === "received";

  // Same gentle entrance as the marker card — keeps the chat feeling
  // alive when state changes arrive.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    haptic(received ? "success" : "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Brand-tinted pill in light mode (lime / coral wash); softer
  // neutral tint in dark mode so the accent reads as the glyph
  // circle, not the whole pill.
  const pillTint = received
    ? colors.mode === "dark"
      ? "rgba(200,230,100,0.16)"
      : "rgba(181,215,80,0.28)"
    : colors.mode === "dark"
    ? "rgba(255,107,91,0.16)"
    : "rgba(210,68,50,0.14)";
  // Light mode keeps the historical brand pairing — forest glyph
  // for "received," brand coral for "missing." Dark mode swaps in
  // the palette tokens so the glyph and text read against the
  // charcoal canvas.
  const glyphBg = received
    ? (colors.mode === "dark" ? colors.success : AppColors.secondaryDarkGreen)
    : (colors.mode === "dark" ? colors.destructive : "#D24432");
  const textColor = received
    ? colors.textPrimary
    : (colors.mode === "dark" ? colors.destructive : "#A8281A");

  return (
    <Animated.View style={[styles.ackWrap, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.ackPill, { backgroundColor: pillTint }]}>
        <View
          style={[
            styles.ackGlyphCircle,
            { backgroundColor: glyphBg },
          ]}
        >
          <Text style={[styles.ackGlyphText, { color: received ? colors.textOnAccent : "#FFFFFF" }]}>
            {received ? "✓" : "!"}
          </Text>
        </View>
        <Text
          style={[styles.ackText, { color: textColor }]}
          numberOfLines={2}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrap: {
    width: "100%",
    paddingHorizontal: 12,
    marginVertical: 8,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: AppColors.basicWhite,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    // Soft elevation — the card should sit *above* the chat lane
    // without screaming for attention. Two-stop shadow gives it the
    // Apple-Pay rounded-tile feel without going neumorphic.
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.08)",
    alignItems: "center",
  },
  cardKicker: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 10.5,
    letterSpacing: 1.0,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textTransform: "uppercase",
  },
  amountRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  amountCurrency: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    marginTop: 8,
    marginRight: 2,
    opacity: 0.85,
  },
  amountValue: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 42,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  cardSub: {
    marginTop: 2,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    textAlign: "center",
  },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(38,59,51,0.12)",
    marginTop: 14,
    marginBottom: 12,
  },
  waitingFootnote: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  actionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 10,
    alignSelf: "stretch",
  },
  actionsBusyText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    letterSpacing: -0.1,
  },

  // payment_ack
  ackWrap: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  ackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: 320,
  },
  ackPillSuccess: {
    backgroundColor: "rgba(181,215,80,0.28)",
  },
  ackPillWarning: {
    backgroundColor: "rgba(210,68,50,0.14)",
  },
  ackGlyphCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  ackGlyphCircleSuccess: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  ackGlyphCircleWarning: {
    backgroundColor: "#D24432",
  },
  ackGlyphText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    color: AppColors.basicWhite,
    lineHeight: 16,
    textAlign: "center",
  },
  ackText: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12.5,
    letterSpacing: -0.05,
  },
  ackTextSuccess: {
    color: AppColors.secondaryDarkGreen,
  },
  ackTextWarning: {
    color: "#A8281A",
  },
});

export default PaymentChatCard;
