import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Platform,
} from "react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { displayRideLocation } from "../utils/LocationService";
import { passengerSeatsLeft } from "../utils/seatMath";
import type { Palette } from "../design_systems/palettes";

export type ClusteredRide = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_price: number;
  total_seats: number;
  booked_seats: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The headline place: the shared origin (pickup) or drop-off (destination). */
  pickup: string;
  /**
   * Whether the grouped rides share an origin ("pickup", default) or a
   * drop-off ("destination"). Only changes the header framing.
   */
  mode?: "pickup" | "destination";
  rides: ClusteredRide[];
  /** Called when the user taps a specific time chip. */
  onPickRide: (ride: ClusteredRide) => void;
};

const shorten = (s: string, max = 40): string => {
  // Normalize legacy pickup labels before showing them in the cluster header.
  const safe = displayRideLocation(s);
  const first = (safe.split(",")[0] || "").trim();
  return first.length > max ? first.slice(0, max - 1).trimEnd() + "…" : first;
};

let chipDayFormatter: Intl.DateTimeFormat | null = null;
  try {
    chipDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  } catch {
    chipDayFormatter = null;
  }

let chipTimeFormatter: Intl.DateTimeFormat | null = null;
  try {
    chipTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    chipTimeFormatter = null;
  }

/** Format one ride departure as a compact weekday/time chip label. */
const formatChipLabel = (iso: string): { day: string; time: string } => {
  try {
    const d = new Date(iso);
    return {
      day: chipDayFormatter?.format(d) ?? d.toLocaleDateString(undefined, { weekday: "short" }),
      time: chipTimeFormatter?.format(d) ?? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
  } catch {
    return { day: "", time: "" };
  }
};

type ClusteredRideChip = ClusteredRide & {
  startTimeMs: number;
  chipDay: string;
  chipTime: string;
  seatsLeft: number;
  isFull: boolean;
};

type DestinationGroup = {
  // Stable grouping key (normalized destination).
  key: string;
  destination: string;
  // Price spread across rides in this destination group. Rides to the same
  // place can cost very differently, so the header shows a range and each
  // chip carries its own price.
  priceMin: number;
  priceMax: number;
  // All rides going to this destination, sorted by departure time.
  rides: ClusteredRideChip[];
  // Earliest departure timestamp; drives group sort order.
  nextDeparture: number;
};

// Normalize a destination so "VIT Vellore", "VIT Vellore, India" and
// "VIT Vellore, Vellore" collapse into one group instead of three.
const destKey = (loc: string): string =>
  (displayRideLocation(loc).split(",")[0] || "").trim().toLowerCase();

type DestinationGroupRowProps = {
  group: DestinationGroup;
  isLast: boolean;
  onPickRide: (ride: ClusteredRide) => void;
  colors: Palette;
};

const DestinationGroupRow = React.memo(function DestinationGroupRow({
  group,
  isLast,
  onPickRide,
  colors,
}: DestinationGroupRowProps) {
  return (
    <View style={[styles.group, isLast && styles.groupLast]}>
      {/* Destination header with headline price. */}
      <View style={styles.groupHeader}>
        <Text style={[styles.groupDest, { color: colors.textPrimary }]} numberOfLines={1}>
          {shorten(group.destination)}
        </Text>
        <View style={styles.groupMeta}>
          <Text style={[styles.groupPrice, colors.mode === "dark" && { color: colors.textPrimary, opacity: 0.85 }]}>
            {group.priceMin === group.priceMax
              ? `₹${group.priceMin}`
              : `₹${group.priceMin}–₹${group.priceMax}`}
          </Text>
        </View>
      </View>

      {/* Tappable time chips, one per departure. */}
      <View style={styles.chipsWrap}>
        {group.rides.map((ride) => (
          <TouchableOpacity
            key={ride.id}
            activeOpacity={0.85}
            disabled={ride.isFull}
            onPress={() => onPickRide(ride)}
            style={[
              styles.chip,
              { backgroundColor: colors.surface },
              ride.isFull && styles.chipFull,
            ]}
          >
            <Text style={[styles.chipDay, colors.mode === "dark" && { color: colors.textTertiary }]}>{ride.chipDay}</Text>
            <Text style={[styles.chipTime, { color: colors.textPrimary }]}>{ride.chipTime}</Text>
            <Text style={[styles.chipPrice, { color: colors.textPrimary }]}>₹{ride.total_price}</Text>
            <View style={[styles.chipDivider, colors.mode === "dark" && { backgroundColor: colors.inkSubtle }]} />
            <Text
              style={[
                styles.chipSeats,
                colors.mode === "dark" && { color: colors.textSecondary },
                ride.isFull && [styles.chipSeatsFull, colors.mode === "dark" && { color: colors.destructive, opacity: 1 }],
              ]}
            >
              {ride.isFull
                ? "Full"
                : `${ride.seatsLeft} ${ride.seatsLeft === 1 ? "seat" : "seats"}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

/**
 * Transit-board style picker that groups nearby rides by destination and
 * shows one departure chip per ride. Groups sort by next departure.
 */
const RideClusterSheet: React.FC<Props> = ({
  visible,
  onClose,
  pickup,
  mode = "pickup",
  rides,
  onPickRide,
}) => {
  const colors = useThemeColors();
  // Light mode inherits the brand canvas; dark mode uses an elevated sheet.
  const sheetBg = colors.mode === "dark" ? colors.surfaceElevated : colors.background;
  const groups = React.useMemo<DestinationGroup[]>(() => {
    const byDest = new Map<string, DestinationGroup>();
    for (const r of rides) {
      const key = destKey(r.end_location);
      const ts = new Date(r.start_time).getTime();
      const { day, time } = formatChipLabel(r.start_time);
      const seatsLeft = passengerSeatsLeft(r.total_seats, r.booked_seats);
      const chip: ClusteredRideChip = {
        ...r,
        startTimeMs: ts,
        chipDay: day,
        chipTime: time,
        seatsLeft,
        isFull: seatsLeft <= 0,
      };
      const existing = byDest.get(key);
      if (existing) {
        existing.rides.push(chip);
        if (r.total_price < existing.priceMin) existing.priceMin = r.total_price;
        if (r.total_price > existing.priceMax) existing.priceMax = r.total_price;
        if (ts < existing.nextDeparture) existing.nextDeparture = ts;
      } else {
        byDest.set(key, {
          key,
          destination: r.end_location,
          priceMin: r.total_price,
          priceMax: r.total_price,
          rides: [chip],
          nextDeparture: ts,
        });
      }
    }
    // Sort rides within each group by departure ascending.
    for (const g of byDest.values()) {
      g.rides.sort((a, b) => a.startTimeMs - b.startTimeMs);
    }
    // Sort groups by their next departure (ascending).
    return Array.from(byDest.values()).sort(
      (a, b) => a.nextDeparture - b.nextDeparture,
    );
  }, [rides]);

  const renderGroup = React.useCallback<ListRenderItem<DestinationGroup>>(
    ({ item, index }) => (
      <DestinationGroupRow
        group={item}
        isLast={index === groups.length - 1}
        onPickRide={onPickRide}
        colors={colors}
      />
    ),
    [groups.length, onPickRide, colors],
  );

  const keyExtractor = React.useCallback((group: DestinationGroup) => group.key, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Keep scrim and sheet as siblings so sheet scroll gestures are preserved. */}
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrimTop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          {/* Top bar with centered grip and explicit Done action. */}
          <View style={styles.topBar}>
            <View style={[styles.grip, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />
            <TouchableOpacity
              onPress={onClose}
              style={styles.doneBtn}
              hitSlop={10}
              activeOpacity={0.6}
            >
              <Text style={[styles.doneBtnText, { color: colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerBlock}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {rides.length} {rides.length === 1 ? "ride" : "rides"}{" "}
              {mode === "destination" ? "going to" : "leaving from"}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {shorten(pickup, 48)}
            </Text>
          </View>

          <FlatList
            data={groups}
            keyExtractor={keyExtractor}
            renderItem={renderGroup}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={48}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Full-modal shell with a bottom-docked sheet.
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    // Center the capped sheet on wide screens.
    alignItems: "center",
  },
  // Tap outside the sheet to close.
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    maxHeight: "80%",
  },
  // Relative positioning keeps Done from shifting the centered grip.
  topBar: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
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
  headerBlock: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  eyebrow: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.2,
  },
  title: {
    marginTop: 2,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: AppColors.secondaryDarkGreen,
  },
  list: {
    alignSelf: "stretch",
  },
  listContent: {
    paddingBottom: 8,
  },

  group: {
    marginBottom: 18,
  },
  groupLast: {
    marginBottom: 4,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  groupDest: {
    flex: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    lineHeight: 20,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
    marginRight: 10,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupPrice: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
    letterSpacing: -0.1,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  // Compact departure chip: day, time, and seats.
  chip: {
    backgroundColor: AppColors.cardSurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 78,
    alignItems: "center",
  },
  chipFull: {
    opacity: 0.45,
  },
  chipDay: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  chipTime: {
    marginTop: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  chipDivider: {
    width: 24,
    height: 1,
    backgroundColor: "rgba(38,59,51,0.10)",
    marginTop: 6,
    marginBottom: 4,
  },
  chipSeats: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.1,
  },
  chipSeatsFull: {
    color: "#D24432",
    opacity: 1,
  },
});

export default RideClusterSheet;
