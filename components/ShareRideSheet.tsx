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

/** Base HTTPS host for ride share links and future app-link routing. */
const SHARE_HOST = "https://unipool.acmvit.in";
// Direct install target for first-time recipients and link preview clients.
const DOWNLOAD_URL = "https://unipool.download";
const PERFORATION_DASH_KEYS = Array.from({ length: 18 }, (_, index) => `dash-${index}`);

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
 * Dashed perforation between the QR area and ticket stub. Uses explicit dash
 * views because dashed borders are inconsistent across native platforms.
 */
const Perforation: React.FC<{ sheetBackground: string }> = ({ sheetBackground }) => {
  return (
    <View style={styles.perfRow}>
      {/* Left scoop clipped into the card edge. */}
      <View style={[styles.scoopLeft, { backgroundColor: sheetBackground }]} />
      <View style={styles.dashesWrap}>
        {PERFORATION_DASH_KEYS.map((dashKey) => (
          <View key={dashKey} style={styles.dash} />
        ))}
      </View>
      <View style={[styles.scoopRight, { backgroundColor: sheetBackground }]} />
    </View>
  );
};

/**
 * Bottom modal for sharing a hosted ride by QR code or native share sheet.
 * The ticket layout keeps the QR, route, and departure time in one object.
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

  // Keep the canonical ride URL last; share targets often preview the final URL.
  const shareMessage =
    `I'm hosting a UniPool ride from ${displayRideLocation(startLocation)} to ${displayRideLocation(endLocation)} on ${dateLabel} at ${timeLabel}.\n\nNew to UniPool?\n${DOWNLOAD_URL}\n\nGrab a seat:\n${deeplink}`;

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
          {/* Grip handle uses a darker override only on dark canvas. */}
          <View style={[styles.grip, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>Share this ride</Text>
          <Text style={[styles.subtitle, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
            Scan the code or send the link to a classmate.
          </Text>

          {/* Ticket card holding the QR, perforation, and route stub. */}
          <View style={[styles.ticketCard, { backgroundColor: colors.surface }]}>
            <View style={styles.qrZone}>
              <QRCode
                value={deeplink}
                size={188}
                color={colors.textPrimary}
                backgroundColor={colors.surface}
              />
              {/* Small wordmark below the QR. */}
              <Text style={[styles.qrBrand, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>UniPool</Text>
            </View>

            {/* Scoop backgrounds match the sheet canvas so they read as notches. */}
            <Perforation sheetBackground={colors.mode === "dark" ? colors.surfaceElevated : AppColors.primaryLightGreen} />

            <View style={styles.stubZone}>
              {/* Canonical RouteStack: pin, dashed connector, arrow. */}
              <RouteStack
                tone="onLime"
                start={startLocation}
                end={endLocation}
                numberOfLines={1}
                textStyle={[styles.routePoint, { color: colors.textPrimary }]}
              />

              {/* Departure date and time. */}
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
              // Dark mode uses the app's primary CTA contrast.
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
    // Center the capped sheet on wide screens.
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    // Phone-shape cap for tablet layouts.
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
    // Allow the scoop circles to bleed into the card edge.
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

  // Perforation row with scoops positioned off the left and right edges.
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
    // Match the sheet canvas so the scoop reads as a notch.
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

  // Bottom half of the ticket with route and departure time.
  stubZone: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Same route-dot proportions as RideCard and PreviousTripsCompressed.
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
