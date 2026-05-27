import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { haptic } from "./PressableScale";
import { displayRideLocation } from "../utils/LocationService";
import SheetShell from "./SheetShell";

type PreviewRide = {
  start_location: string;
  end_location: string;
  start_time?: string;
  total_price?: number;
  host_user_name?: string;
};

type Props = {
  ride: PreviewRide | null;
  onDismiss: () => void;
  onOpen: () => void;
};

/**
 * Pin-tap route preview, now wrapped in SheetShell so it matches
 * every other modal sheet in the app (verify-academic, chat
 * settings, payment confirm, etc). Same chrome — dim backdrop,
 * grab handle, close X, slide-up spring — owned by SheetShell so
 * we don't reimplement it here.
 *
 * Contents stay tight: route block (filled pin → outline pin),
 * one meta row (when + fare), one View ride CTA. The host sheet
 * underneath collapses to its min height when this opens (see
 * HomeScreen's previewRide effect) so the user sees the sheet
 * landing on a calm background, not stacked atop another sheet
 * full of UI.
 *
 * `visible={!!ride}` lets SheetShell drive the open/close
 * animation directly from the parent's `previewRide` state —
 * setting it to null fades the backdrop + slides the sheet out
 * cleanly without a separate close gesture.
 */
const RoutePreviewCard: React.FC<Props> = ({ ride, onDismiss, onOpen }) => {
  const colors = useThemeColors();
  // Forest pin in light → bright off-white in dark (avoids dark-on-dark).
  const pinColor = colors.mode === "dark" ? colors.textPrimary : colors.textPrimary;
  // CTA: forest+lime in light; lime+forest-ink in dark (brand splash).
  const ctaBg = colors.mode === "dark" ? colors.primary : colors.textPrimary;
  const ctaText = colors.mode === "dark" ? colors.textOnAccent : colors.primary;
  const shortStart = useMemo(() => shorten(ride?.start_location || ""), [ride?.start_location]);
  const shortEnd = useMemo(() => shorten(ride?.end_location || ""), [ride?.end_location]);

  const timeLabel = useMemo(() => {
    if (!ride?.start_time) return "";
    const d = new Date(ride.start_time);
    if (isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} · ${hh}:${mm}`;
  }, [ride?.start_time]);

  const handleOpen = () => {
    haptic("medium");
    onOpen();
  };

  return (
    <SheetShell visible={!!ride} onDismiss={onDismiss}>
      {/* Route block: filled lime dot for pickup, outline lime
          for drop, short dotted vertical connector between. Same
          glyph language as every other ride card surface in the
          app so the sheet reads as "more UniPool" not a new
          component family. */}
      <View style={styles.route}>
        <View style={styles.pinCol}>
          <View style={[styles.pinFilled, { backgroundColor: pinColor }]} />
          <View style={[styles.pinConnector, { backgroundColor: pinColor }]} />
          <View style={[styles.pinOutline, { borderColor: pinColor }]} />
        </View>
        <View style={styles.routeText}>
          <Text style={[styles.startLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {shortStart}
          </Text>
          <Text style={[styles.endLabel, { color: colors.textPrimary }]} numberOfLines={1}>
            {shortEnd}
          </Text>
        </View>
      </View>

      {/* Meta row — date+time on the left, fare on the right.
          Single hairline separator above to band it apart from
          the route block without resorting to a full divider. */}
      {(timeLabel || ride?.total_price != null) ? (
        <View style={[styles.metaRow, { borderTopColor: colors.inkSubtle }]}>
          <Text style={[styles.metaLeft, { color: colors.textSecondary }]} numberOfLines={1}>
            {timeLabel}
          </Text>
          {ride?.total_price != null ? (
            <Text style={[styles.metaRight, { color: colors.textPrimary }]}>₹{ride.total_price}</Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: ctaBg },
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View ride to ${shortEnd}`}
      >
        <Text style={[styles.ctaText, { color: ctaText }]}>View ride</Text>
      </Pressable>
    </SheetShell>
  );
};

const shorten = (s: string): string => {
  const safe = displayRideLocation(s);
  const first = (safe.split(",")[0] || "").trim();
  return first.length > 28 ? first.slice(0, 27).trimEnd() + "…" : first;
};

const styles = StyleSheet.create({
  route: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    paddingHorizontal: 4,
    // SheetShell already pads the top for the grab handle + close
    // X; the route block starts immediately under that without a
    // doubled-up margin.
    marginTop: 6,
  },
  pinCol: {
    width: 14,
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6,
  },
  pinFilled: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  pinConnector: {
    flex: 1,
    width: 2,
    backgroundColor: AppColors.secondaryDarkGreen,
    opacity: 0.35,
    marginVertical: 4,
    borderRadius: 1,
  },
  pinOutline: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    backgroundColor: "transparent",
  },
  routeText: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
    gap: 10,
  },
  startLabel: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
    opacity: 0.65,
  },
  endLabel: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 19,
    letterSpacing: -0.4,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(38,59,51,0.12)",
  },
  metaLeft: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14.5,
    letterSpacing: -0.1,
    opacity: 0.78,
    flexShrink: 1,
  },
  metaRight: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    letterSpacing: -0.2,
    marginLeft: 12,
  },

  cta: {
    marginTop: 22,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    letterSpacing: 0.2,
  },
});

export default RoutePreviewCard;
