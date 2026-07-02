import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import SheetShell from "./SheetShell";
import PressableScale from "./PressableScale";
import RouteStack from "./RouteStack";
import { useThemeColors } from "../contexts/ThemeContext";
import { useAuthGate } from "../contexts/AuthGate";
import { useApi } from "../utils/ApiUtil";
import { haptic } from "./haptics";
import type { ExternalRide } from "../utils/ExternalRideService";
import { dialPhone, openWhatsApp, whatsappDigits } from "../utils/ExternalRideService";
import type { AuthSheetReturnTo } from "./AuthSheet/AuthSheet";

type EmailState = "idle" | "sending" | "sent" | "already" | "no_email" | "error";

// Rides this device has already notified for, so reopening the sheet shows the
// done state immediately. The backend is the hard guarantee (one email per
// user + ride); this is only the local UX shortcut.
const invitedRideIds = new Set<string>();

interface Props {
  visible: boolean;
  onDismiss: () => void;
  ride: ExternalRide;
  authReturnTo?: AuthSheetReturnTo;
}

const firstNameOf = (name: string) =>
  (name || "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim().split(/\s+/)[0] || "there";

/**
 * Contact sheet for an external ride. External hosts are not on UniPool
 * yet, so instead of a bare "Call" we offer the ways to actually reach
 * them (WhatsApp, phone) plus a one-tap UniPool invite that emails them
 * to join and ride together. Mirrors the app's other bottom sheets.
 */
const ExternalContactSheet: React.FC<Props> = ({ visible, onDismiss, ride, authReturnTo }) => {
  const colors = useThemeColors();
  const { apiUtil } = useApi();
  const { requireAuth } = useAuthGate();
  const [emailState, setEmailState] = useState<EmailState>(
    invitedRideIds.has(ride.id) ? "already" : "idle",
  );

  // Reset (or restore the already-notified state) each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setEmailState(invitedRideIds.has(ride.id) ? "already" : "idle");
    }
  }, [visible, ride.id]);

  const first = useMemo(() => firstNameOf(ride.host_name), [ride.host_name]);
  const hasWhatsApp = !!whatsappDigits(ride.host_phone);
  const hasPhone = !!ride.host_phone;
  const hasContact = hasWhatsApp || hasPhone;
  // Sources like Vigo expose no host email, so the invite can never send —
  // hide it and lead with WhatsApp/phone instead of a dead-end.
  const canInvite = ride.has_host_email === true;

  const waMessage =
    `Hi ${first}, I found your ride from ${ride.pickup_point} to ${ride.destination} on UniPool ` +
    `and would love to ride with you. Is there room for one more?`;

  const sendInvite = async () => {
    if (emailState === "sending" || emailState === "sent" || emailState === "already") return;
    if (!requireAuth(authReturnTo ?? { screen: "HomeScreen" }, "to notify this host")) {
      onDismiss();
      return;
    }
    setEmailState("sending");
    haptic("medium");
    try {
      const res = await apiUtil.post<
        { sent: boolean; already?: boolean; error?: string },
        unknown
      >("/external/invite", {
        external_ride_id: ride.id,
        host_name: ride.host_name,
        start_location: ride.pickup_point,
        end_location: ride.destination,
      });
      if (res?.sent) {
        invitedRideIds.add(ride.id);
        haptic("success");
        setEmailState(res.already ? "already" : "sent");
      } else {
        setEmailState(res?.error === "no_email" ? "no_email" : "error");
      }
    } catch (error: any) {
      const errCode = error?.response?.data?.error || error?.response?.data?.message;
      setEmailState(errCode === "no_email" ? "no_email" : "error");
    }
  };

  // The notify action reads as UniPool's primary CTA: a forest button with
  // lime label. Terminal states swap to a calm success / muted fill.
  const emailBtn = (() => {
    switch (emailState) {
      case "sent":
        return {
          bg: withAlpha(colors.success, 0.14),
          fg: colors.success,
          icon: <CheckIcon color={colors.success} />,
          title: `${first} has been notified`,
          disabled: true,
        };
      case "already":
        return {
          bg: withAlpha(colors.success, 0.14),
          fg: colors.success,
          icon: <CheckIcon color={colors.success} />,
          title: `${first} already knows`,
          disabled: true,
        };
      case "sending":
        return {
          bg: colors.secondary,
          fg: colors.primary,
          icon: <MailIcon color={colors.primary} />,
          title: "Letting them know...",
          disabled: true,
        };
      case "no_email":
        return {
          bg: colors.inkSubtle,
          fg: colors.textSecondary,
          icon: <MailIcon color={colors.textSecondary} />,
          title: "No email on file",
          disabled: true,
        };
      case "error":
        return {
          bg: colors.secondary,
          fg: colors.primary,
          icon: <MailIcon color={colors.primary} />,
          title: "Didn't send, tap to retry",
          disabled: false,
        };
      default:
        return {
          bg: colors.secondary,
          fg: colors.primary,
          icon: <MailIcon color={colors.primary} />,
          title: `Let ${first} know you want in`,
          disabled: false,
        };
    }
  })();

  return (
    <SheetShell visible={visible} onDismiss={onDismiss}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Ride with {first}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {canInvite
          ? `${first} posted this ride elsewhere. Reach out, or let them know you want in.`
          : hasContact
          ? `${first} posted this ride elsewhere. Reach out on WhatsApp or by phone.`
          : `${first} posted this ride elsewhere.`}
      </Text>

      <View style={[styles.routeCard, { backgroundColor: colors.inkSubtle }]}>
        <RouteStack tone="onLime" start={ride.pickup_point} end={ride.destination} compact />
      </View>

      <View style={styles.actions}>
        {/* Primary: notify the host through UniPool — only when an invite
            email can actually be sent (some sources expose no host email). */}
        {canInvite ? (
          <PressableScale
            style={[styles.primaryBtn, { backgroundColor: emailBtn.bg }]}
            onPress={emailBtn.disabled ? undefined : sendInvite}
            disabled={emailBtn.disabled}
            haptic={null}
          >
            {emailBtn.icon}
            <Text style={[styles.primaryBtnText, { color: emailBtn.fg }]} numberOfLines={1}>
              {emailBtn.title}
            </Text>
          </PressableScale>
        ) : null}

        {/* Reach out directly. */}
        {hasWhatsApp || hasPhone ? (
          <View style={styles.secondaryRow}>
            {hasWhatsApp ? (
              <View style={styles.secondaryCol}>
                <SecondaryButton
                  icon={<WhatsAppIcon color={colors.success} />}
                  label="WhatsApp"
                  onPress={() => {
                    haptic("selection");
                    openWhatsApp(ride.host_phone, waMessage);
                  }}
                  colors={colors}
                />
              </View>
            ) : null}
            {hasPhone ? (
              <View style={styles.secondaryCol}>
                <SecondaryButton
                  icon={<PhoneIcon color={colors.textPrimary} />}
                  label="Call"
                  onPress={() => {
                    haptic("selection");
                    dialPhone(ride.host_phone);
                  }}
                  colors={colors}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </SheetShell>
  );
};

export default ExternalContactSheet;

const SecondaryButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ icon, label, onPress, colors }) => (
  <PressableScale
    style={[styles.secondaryBtn, { backgroundColor: colors.inkSubtle }]}
    onPress={onPress}
    haptic={null}
  >
    {icon}
    <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>{label}</Text>
  </PressableScale>
);

// Blend a hex colour with an alpha into an rgba string. Icon-circle tints
// only, so the tolerant parse is fine.
function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const WhatsAppIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.04 2c-5.5 0-9.97 4.47-9.97 9.97 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.97-4.47 9.97-9.97 0-2.66-1.04-5.17-2.92-7.05A9.9 9.9 0 0 0 12.04 2zm0 1.67c2.23 0 4.32.87 5.9 2.44a8.3 8.3 0 0 1 2.44 5.87c0 4.58-3.73 8.3-8.32 8.3a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.08.81.82-3-.2-.31a8.24 8.24 0 0 1-1.27-4.42c0-4.58 3.73-8.3 8.32-8.3zm-2.5 4.5c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.2.87 2.35.99 2.51.12.16 1.7 2.6 4.13 3.55 2.02.8 2.43.64 2.87.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.32-.74-1.8-.19-.46-.39-.4-.53-.4z" />
  </Svg>
);

const PhoneIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Svg>
);

const MailIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <Path d="m3 6 9 7 9-7" />
  </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 12.5 9 17.5 20 6.5" />
  </Svg>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    lineHeight: 20,
  },
  routeCard: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    fontSize: 15.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.2,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  // PressableScale applies its style to an inner view, so the flex that
  // splits the row has to live on this plain wrapper; the button then fills
  // it with width:100%.
  secondaryCol: {
    flex: 1,
  },
  secondaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 16,
  },
  secondaryBtnText: {
    fontSize: 14.5,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.1,
  },
});
