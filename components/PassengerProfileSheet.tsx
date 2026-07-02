import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Linking,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

export type PassengerProfile = {
  id: string;
  name: string;
  email?: string;
  profile_picture_url?: string;
  contact_number?: string;
  upi_vpa?: string;
  is_verified?: boolean;
  institute_name?: string;
  request_status?: "pending" | "accepted" | "rejected" | string;
  booking_id?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  passenger?: PassengerProfile | null;
  /** Host-only action handlers. Each is optional — render only if
   *  the caller wires them up and the status warrants the action. */
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  /** Fires when the host taps Message — parent routes into the
   *  appropriate UniPool chat (pending = DM thread, accepted = the
   *  ride's group chat). Falls back to native SMS only if unset. */
  onMessage?: () => void;
  /** Loading flag tied to whichever booking action is in flight. */
  actionLoading?: "accept" | "reject" | "remove" | null;
};

const firstNameOf = (name?: string) =>
  (name || "").trim().split(/\s+/)[0] || "them";

/**
 * Compact, in-context profile sheet for a passenger on the host's
 * Ride Management view. Bottom modal — slides up, scrim closes,
 * Done text-link at top-right. Sections:
 *
 *   1. Header — name + verified checkmark + institute + status pill
 *   2. Contact strip — phone (call / message) + email
 *   3. Pay strip — UPI VPA + amount input + "Pay with UPI" button
 *      (host can pay anyone for anything: snack money, gas split,
 *      whatever. Falls back to "No UPI on file" when blank.)
 *   4. Host actions — Accept / Reject for pending, Remove for
 *      accepted. Calls back into the caller's handlers, which
 *      already drive the existing /bookings/accept/reject/delete
 *      endpoints.
 */
const PassengerProfileSheet: React.FC<Props> = ({
  visible,
  onClose,
  passenger,
  onAccept,
  onReject,
  onRemove,
  onMessage,
  actionLoading,
}) => {
  const colors = useThemeColors();
  const [amount, setAmount] = React.useState("");

  // Reset amount each time the sheet opens for a new passenger.
  React.useEffect(() => {
    if (visible) setAmount("");
  }, [visible, passenger?.id]);

  if (!passenger) {
    return null;
  }

  const firstName = firstNameOf(passenger.name);
  const initial = (passenger.name || "?").trim().charAt(0).toUpperCase();
  // Full name with the VIT registration suffix stripped for display.
  const displayName = (passenger.name || "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim() || "Unknown";

  const handleCall = () => {
    if (!passenger.contact_number) return;
    const url = `tel:${passenger.contact_number}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleMessage = () => {
    // Prefer UniPool chat over native SMS — keeps the conversation
    // in-app where the safety / reporting / context lives. Parent
    // routes to either the pending DM thread or the ride's group
    // chat depending on the passenger's status. Falls back to SMS
    // only if no in-app route is wired AND we have a phone number.
    if (onMessage) {
      onMessage();
      return;
    }
    if (!passenger.contact_number) return;
    Linking.openURL(`sms:${passenger.contact_number}`).catch(() => {});
  };

  const handlePay = () => {
    if (!passenger.upi_vpa) {
      Alert.alert(
        "No UPI on file",
        `${firstName} hasn't added a UPI ID yet.`,
      );
      return;
    }
    const trimmedAmount = amount.trim();
    const params: Record<string, string> = {
      pa: passenger.upi_vpa,
      pn: passenger.name || "UniPool ride",
      cu: "INR",
    };
    if (trimmedAmount && !isNaN(Number(trimmedAmount))) {
      params.am = trimmedAmount;
    }
    params.tn = `UniPool · paying ${firstName}`;
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    const url = `upi://pay?${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Couldn't open UPI app",
        "Make sure a UPI app (GPay, PhonePe, Paytm) is installed.",
      );
    });
  };

  const isPending = passenger.request_status === "pending";
  const isAccepted = passenger.request_status === "accepted";

  // In dark mode the sheet uses the elevated charcoal background and
  // the original "deep" treatment (forest squares, lime pills) maps
  // to primary-on-charcoal so the eye still finds the brand accents.
  const accentBg = colors.mode === "dark" ? colors.primary : colors.textPrimary;
  const accentText = colors.mode === "dark" ? colors.textOnAccent : colors.primary;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrimTop} onPress={onClose} />
        <View style={[styles.sheet, colors.mode === "dark" && { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.topBar}>
            <View style={[styles.grip, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />
            <TouchableOpacity onPress={onClose} style={styles.doneBtn} hitSlop={10} activeOpacity={0.6}>
              <Text style={[styles.doneBtnText, colors.mode === "dark" && { color: colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header — profile picture (or initial fallback) + name
                + verified checkmark + institute. Status pill removed
                — the host already knows from the row they tapped, and
                another pill in the sheet header was noisy. */}
            <View style={styles.headerBlock}>
              <View style={[styles.avatar, { backgroundColor: accentBg }]}>
                {passenger.profile_picture_url ? (
                  <Image
                    source={{ uri: passenger.profile_picture_url }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={[styles.avatarInitial, { color: accentText }]}>{initial}</Text>
                )}
              </View>
              <View style={styles.headerText}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {passenger.is_verified ? (
                    <View style={[styles.verifiedDot, { backgroundColor: accentBg }]}>
                      <Text style={[styles.verifiedGlyph, { color: accentText }]}>✓</Text>
                    </View>
                  ) : null}
                </View>
                {passenger.institute_name ? (
                  <Text style={[styles.institute, colors.mode === "dark" && { color: colors.textSecondary }]} numberOfLines={1}>
                    {passenger.institute_name}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Contact strip — phone with call / SMS shortcuts */}
            {passenger.contact_number ? (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionLabel, colors.mode === "dark" && { color: colors.textTertiary }]}>Phone</Text>
                <View style={styles.contactRow}>
                  <Text style={[styles.contactValue, { color: colors.textPrimary }]}>
                    {passenger.contact_number}
                  </Text>
                  <View style={styles.contactActions}>
                    {/* Chat button only for PENDING requesters — they
                        aren't in the group chat yet, so a DM is the
                        only way to reach them. For accepted
                        passengers the group chat is the canonical
                        surface, accessible via the "Open trip chat"
                        button on RideDetailsScreen itself, so we
                        skip the button here to avoid two competing
                        message-action UIs. */}
                    {passenger.request_status === "pending" ? (
                      <TouchableOpacity
                        onPress={handleMessage}
                        style={[styles.contactBtn, { backgroundColor: colors.inkSubtle }]}
                        activeOpacity={0.85}
                        accessibilityLabel={`Direct message ${firstName}`}
                      >
                        <Text style={[styles.contactBtnText, { color: colors.textPrimary }]}>DM</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={handleCall}
                      style={[styles.contactBtn, styles.contactBtnPrimary, { backgroundColor: accentBg }]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.contactBtnText, styles.contactBtnTextPrimary, { color: accentText }]}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Pay strip — UPI deeplink with optional amount */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionLabel, colors.mode === "dark" && { color: colors.textTertiary }]}>
                Pay {firstName}
              </Text>
              {passenger.upi_vpa ? (
                <>
                  <Text style={[styles.upiVpa, { color: colors.textPrimary }]}>{passenger.upi_vpa}</Text>
                  <View style={styles.payRow}>
                    <View style={[styles.amountInputWrap, colors.mode === "dark" && { backgroundColor: colors.surfaceInset }]}>
                      <Text style={[styles.amountCurrency, { color: colors.textSecondary }]}>₹</Text>
                      <TextInput
                        style={[styles.amountInput, { color: colors.textPrimary }]}
                        value={amount}
                        onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))}
                        placeholder="Amount (optional)"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handlePay}
                      style={[styles.payBtn, { backgroundColor: accentBg }]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.payBtnText, { color: accentText }]}>Pay with UPI</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={[styles.upiEmpty, { color: colors.textSecondary }]}>
                  {firstName} hasn't added a UPI ID yet.
                </Text>
              )}
            </View>

            {/* Host actions — Accept / Reject for pending; Remove for accepted */}
            {(isPending && (onAccept || onReject)) || (isAccepted && onRemove) ? (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionLabel, colors.mode === "dark" && { color: colors.textTertiary }]}>Decision</Text>
                {isPending ? (
                  <View style={styles.hostActionRow}>
                    <TouchableOpacity
                      style={[styles.hostActionReject, !!actionLoading && styles.hostActionDisabled]}
                      onPress={() => {
                        if (actionLoading) return;
                        onReject?.();
                      }}
                      activeOpacity={0.85}
                      disabled={!!actionLoading}
                    >
                      <Text style={[styles.hostActionRejectText, { color: colors.destructive }]}>
                        {actionLoading === "reject" ? "Rejecting…" : "Reject"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.hostActionAccept,
                        { backgroundColor: accentBg },
                        !!actionLoading && styles.hostActionDisabled,
                      ]}
                      onPress={() => {
                        if (actionLoading) return;
                        onAccept?.();
                      }}
                      activeOpacity={0.85}
                      disabled={!!actionLoading}
                    >
                      <Text style={[styles.hostActionAcceptText, { color: accentText }]}>
                        {actionLoading === "accept" ? "Accepting…" : "Accept"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {isAccepted ? (
                  <TouchableOpacity
                    style={[styles.removeBtn, !!actionLoading && styles.hostActionDisabled]}
                    onPress={() => {
                      if (actionLoading) return;
                      onRemove?.();
                    }}
                    activeOpacity={0.85}
                    disabled={!!actionLoading}
                  >
                    <Text style={[styles.removeBtnText, { color: colors.destructive }]}>
                      {actionLoading === "remove" ? "Removing…" : `Remove ${firstName}`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    maxHeight: "85%",
  },
  topBar: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  grip: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(38,59,51,0.30)",
  },
  doneBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  doneBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    letterSpacing: 0.2,
  },
  body: {
    alignSelf: "stretch",
  },
  bodyContent: {
    paddingBottom: 12,
  },

  // ----- header --------------------------------------------------
  headerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 6,
    paddingBottom: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.3,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 20,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  verifiedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedGlyph: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 11,
    lineHeight: 13,
  },
  institute: {
    marginTop: 2,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    letterSpacing: 0.1,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  statusPillPending: {
    backgroundColor: "rgba(255,107,91,0.16)",
  },
  statusPillAccepted: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  statusPillText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 10.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statusPillTextAccepted: {
    color: AppColors.primaryLightGreen,
  },

  // ----- sections ------------------------------------------------
  section: {
    backgroundColor: AppColors.cardSurface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 11,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // contact
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  contactValue: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    flex: 1,
    letterSpacing: -0.1,
  },
  contactActions: {
    flexDirection: "row",
    gap: 6,
  },
  contactBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  contactBtnPrimary: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  contactBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
  contactBtnTextPrimary: {
    color: AppColors.primaryLightGreen,
  },

  // pay
  upiVpa: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  upiEmpty: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amountInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(38,59,51,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  amountCurrency: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    paddingVertical: 0,
  },
  payBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },

  // host actions
  hostActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  hostActionReject: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,91,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  hostActionRejectText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: "#D24432",
    letterSpacing: 0.15,
  },
  hostActionAccept: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  hostActionAcceptText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.15,
  },
  hostActionDisabled: {
    opacity: 0.55,
  },
  removeBtn: {
    alignSelf: "stretch",
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,91,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: "#D24432",
    letterSpacing: 0.15,
  },
});

export default PassengerProfileSheet;
