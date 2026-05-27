import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  Pressable,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import RouteStack from "./RouteStack";
import { displayRideLocation } from "../utils/LocationService";

/**
 * Universal-link host the deeplinks point to. Real app-link / universal-
 * link verification (assetlinks.json + apple-app-site-association)
 * is set up later — for now this just renders as a tappable URL on
 * the recipient's device which, once verification is live, will
 * automatically open the installed UniPool app to the right ride. In
 * the meantime it shows a clean web preview at unipool.acmvit.in
 * (placeholder landing for now).
 */
const SHARE_HOST = "https://unipool.acmvit.in";
// Direct install target for first-time recipients. Keep this off the
// /download SPA so link previewers and JS-blocked clients still get a
// concrete store URL. Swap to an App Store URL or server redirect when
// iOS distribution is public.
const DOWNLOAD_URL =
  "https://play.google.com/store/apps/details?id=com.carpoolitapp&hl=en_IN";

type Props = {
  visible: boolean;
  onClose: () => void;
  rideId: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
};

const formatShareDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

const formatShareTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/**
 * Dashed horizontal perforation — the visual cue that lets the
 * cream card read as a "ticket" (top half = QR, bottom half =
 * stub with route + time). Implemented as a row of short dashes
 * because RN's `borderStyle: "dashed"` is inconsistent across
 * platforms, and a real dashed line gives us control over
 * dash length + gap. Notched scoops on either side sell the
 * perforation read even harder — they're absolutely positioned
 * lime circles that bleed into the cream card edge.
 */
const Perforation: React.FC<{ sheetBackground: string }> = ({ sheetBackground }) => {
  const dashes = Array.from({ length: 18 }, (_, i) => i);
  return (
    <View style={styles.perfRow}>
      {/* Left scoop — a small circle clipped half-off the
          card's left edge, giving the eye a real "stub torn off
          here" cue. Matches the sheet background so it reads as a
          real notch cut out of the card. */}
      <View style={[styles.scoopLeft, { backgroundColor: sheetBackground }]} />
      <View style={styles.dashesWrap}>
        {dashes.map((i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
      <View style={[styles.scoopRight, { backgroundColor: sheetBackground }]} />
    </View>
  );
};

/**
 * ShareRideSheet — bottom modal that lets the host hand their ride
 * link to passengers. Two affordances:
 *
 *   1. QR code (scannable across the table at a campus hangout, etc.)
 *   2. "Share link" — pops the native iOS / Android share sheet so the
 *      link goes out via WhatsApp / iMessage / Instagram DMs / wherever.
 *
 * Visual model is a paper ticket: cream card with the QR on top, a
 * dashed perforation in the middle, and the route + time on the
 * "stub" below. Single unified surface so the host's eye reads it
 * as one object instead of three stacked panels.
 */
const ShareRideSheet: React.FC<Props> = ({
  visible,
  onClose,
  rideId,
  startLocation,
  endLocation,
  startTime,
}) => {
  const colors = useThemeColors();
  const deeplink = `${SHARE_HOST}/ride/${rideId}`;
  const dateLabel = useMemo(() => formatShareDate(startTime), [startTime]);
  const timeLabel = useMemo(() => formatShareTime(startTime), [startTime]);

  // Keep each URL on its own row and make the ride link the last URL
  // in the body. iOS share targets pick previews from message URLs
  // inconsistently, so the canonical ride URL should be the final
  // surface they see.
  const shareMessage = useMemo(
    () =>
      `I'm hosting a UniPool ride from ${displayRideLocation(startLocation)} to ${displayRideLocation(endLocation)} on ${dateLabel} at ${timeLabel}.\n\nNew to UniPool?\n${DOWNLOAD_URL}\n\nGrab a seat:\n${deeplink}`,
    [startLocation, endLocation, dateLabel, timeLabel, deeplink],
  );

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: "Join my ride on UniPool",
      });
    } catch {
      // Share dismissal isn't an error — swallow.
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, colors.mode === "dark" && { backgroundColor: colors.surfaceElevated }]} onPress={() => {}}>
          {/* Grip handle: light = rgba(38,59,51,0.30) from module styles,
              dark = colors.inkLine (rgba warm-white 18%). Override here
              because the module-scope `grip` style hardcodes a forest
              rgba that reads as near-invisible on dark canvas. */}
          <View style={[styles.grip, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>Share this ride</Text>
          <Text style={[styles.subtitle, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
            Scan the code or send the link to a classmate.
          </Text>

          {/* Boarding-pass card — single surface holds the QR on top +
              the perforation + the route stub at the bottom. */}
          <View style={[styles.ticketCard, { backgroundColor: colors.surface }]}>
            <View style={styles.qrZone}>
              <QRCode
                value={deeplink}
                size={188}
                color={colors.textPrimary}
                backgroundColor={colors.surface}
              />
              {/* Small wordmark below the QR — brands the ticket
                  without needing a logo asset. */}
              <Text style={[styles.qrBrand, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>UniPool</Text>
            </View>

            {/* Scoop background must match the sheet canvas so they read
                as real notches cut out of the card. */}
            <Perforation sheetBackground={colors.mode === "dark" ? colors.surfaceElevated : AppColors.primaryLightGreen} />

            <View style={styles.stubZone}>
              {/* Canonical RouteStack — pin → dashed → arrow. */}
              <RouteStack
                tone="onLime"
                start={startLocation}
                end={endLocation}
                numberOfLines={1}
                textStyle={[styles.routePoint, { color: colors.textPrimary }]}
              />

              {/* When line — sits below the route as a quieter caption. */}
              <View style={styles.whenRow}>
                <Text style={[styles.whenText, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
                  {dateLabel}
                  {timeLabel ? ` · ${timeLabel}` : ""}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              // Light: forest pill (module-scope). Dark: lime brand
              // splash — matches the Accept button pattern used
              // across the app so the primary CTA reads loud and
              // clear on the charcoal sheet.
              colors.mode === "dark" && { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.85}
            onPress={handleNativeShare}
          >
            <Text style={[styles.primaryBtnText, colors.mode === "dark" && { color: colors.textOnAccent }]}>Share link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text style={[styles.secondaryBtnText, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const SCOOP_SIZE = 18;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    // Centre the inner sheet under its maxWidth on iPad. On phones
    // the scrim width is already ≤540 so this is a no-op.
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    // Phone-shape cap so the share ticket reads as a focused card
    // on iPad instead of a 1000pt-wide pill.
    maxWidth: 540,
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    alignItems: "center",
  },
  grip: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(38,59,51,0.30)",
    marginVertical: 10,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    lineHeight: 26,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.68,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 22,
    paddingHorizontal: 12,
  },

  /* ----- Boarding-pass ticket ------------------------------------- */
  ticketCard: {
    width: "100%",
    backgroundColor: AppColors.cardSurface,
    borderRadius: 22,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
    // Hide nothing — the scoop circles on the perf row will bleed
    // INTO the card edge via negative margins, sold by their lime
    // background colour matching the sheet behind.
    overflow: "visible",
  },
  qrZone: {
    paddingTop: 22,
    paddingBottom: 14,
    alignItems: "center",
  },
  qrBrand: {
    marginTop: 14,
    fontFamily: "Trap-Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
    opacity: 0.85,
  },

  // Perforation row — sits inside the ticket card, full-width minus
  // the inset for the scoops. The scoops are absolutely positioned
  // off the left/right edges so they read as torn-off corners.
  perfRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCOOP_SIZE / 2 + 6,
    height: SCOOP_SIZE,
    position: "relative",
  },
  scoopLeft: {
    position: "absolute",
    left: -SCOOP_SIZE / 2,
    top: 0,
    width: SCOOP_SIZE,
    height: SCOOP_SIZE,
    borderRadius: SCOOP_SIZE / 2,
    // Matches the sheet's lime canvas so the scoop reads as a real
    // notch cut OUT of the cream card. Without this, the perforation
    // is just a line with no "torn paper" feel.
    backgroundColor: AppColors.primaryLightGreen,
  },
  scoopRight: {
    position: "absolute",
    right: -SCOOP_SIZE / 2,
    top: 0,
    width: SCOOP_SIZE,
    height: SCOOP_SIZE,
    borderRadius: SCOOP_SIZE / 2,
    backgroundColor: AppColors.primaryLightGreen,
  },
  dashesWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dash: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(38,59,51,0.22)",
  },

  // Bottom half of the ticket — the "stub" with route + time. Same
  // surface as the QR zone above; the perforation is what reads
  // visually as the divider.
  stubZone: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Outlined origin dot. Same proportions as the dots inside
  // RideCard / PreviousTripsCompressed so the visual idiom is unified.
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    marginRight: 12,
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.secondaryDarkGreen,
    marginRight: 12,
  },
  routeConnector: {
    marginLeft: 4.5,
    marginVertical: 3,
    width: 2,
    alignItems: "center",
    justifyContent: "space-between",
    height: 14,
  },
  routeConnectorDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  routePoint: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14.5,
    lineHeight: 20,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  whenRow: {
    marginTop: 12,
    paddingLeft: 23, // align with the route text (dot 11 + margin 12)
  },
  whenText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.62,
    letterSpacing: 0.1,
  },

  /* ----- Buttons -------------------------------------------------- */
  primaryBtn: {
    marginTop: 22,
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    marginTop: 2,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    letterSpacing: 0.1,
  },
});

export default ShareRideSheet;
