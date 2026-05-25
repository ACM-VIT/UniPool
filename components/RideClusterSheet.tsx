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
import { displayRideLocation } from "../utils/LocationService";

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
  pickup: string;
  rides: ClusteredRide[];
  /** Called when the user taps a specific time chip. */
  onPickRide: (ride: ClusteredRide) => void;
};

const shorten = (s: string, max = 40): string => {
  // Same legacy-data defence as RoutePreviewCard.shortenLoc — if a
  // ride was created back when picking "Current location" persisted
  // that literal string, fall back to a neutral pickup label here
  // rather than letting it leak onto the cluster header.
  const safe = displayRideLocation(s);
  const first = (safe.split(",")[0] || "").trim();
  return first.length > max ? first.slice(0, max - 1).trimEnd() + "…" : first;
};

const chipDayFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" });
  } catch {
    return null;
  }
})();

const chipTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
})();

/**
 * Format a single ride's departure as a compact 2-line chip label:
 *   line 1: "Sat"  (short weekday)
 *   line 2: "9:33 AM"  (time)
 * Two-line chips are denser than "Sat 9:33 AM" all on one row.
 */
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
  destination: string;
  // Lowest price in this destination's rides — surfaced as the
  // group's headline price. Most rides to the same destination share
  // a price anyway; if they differ, the cheapest is the honest pitch.
  cheapestPrice: number;
  // All rides going to this destination, sorted by departure time.
  rides: ClusteredRideChip[];
  // Earliest departure timestamp in this group — drives the group
  // sort order (next-to-leave destination shows first).
  nextDeparture: number;
};

type DestinationGroupRowProps = {
  group: DestinationGroup;
  isLast: boolean;
  onPickRide: (ride: ClusteredRide) => void;
};

const DestinationGroupRow = React.memo(function DestinationGroupRow({
  group,
  isLast,
  onPickRide,
}: DestinationGroupRowProps) {
  return (
    <View style={[styles.group, isLast && styles.groupLast]}>
      {/* Destination header — bold name, price + ride count
          as a quiet caption on the right. */}
      <View style={styles.groupHeader}>
        <Text style={styles.groupDest} numberOfLines={1}>
          {shorten(group.destination)}
        </Text>
        <View style={styles.groupMeta}>
          <Text style={styles.groupPrice}>₹{group.cheapestPrice}</Text>
        </View>
      </View>

      {/* Tappable time chips, one per departure. Each chip
          is a forest-outlined pill with the weekday on top
          and the time below. Compact + scannable. */}
      <View style={styles.chipsWrap}>
        {group.rides.map((ride) => (
          <TouchableOpacity
            key={ride.id}
            activeOpacity={0.85}
            disabled={ride.isFull}
            onPress={() => onPickRide(ride)}
            style={[
              styles.chip,
              ride.isFull && styles.chipFull,
            ]}
          >
            <Text style={styles.chipDay}>{ride.chipDay}</Text>
            <Text style={styles.chipTime}>{ride.chipTime}</Text>
            <View style={styles.chipDivider} />
            <Text
              style={[
                styles.chipSeats,
                ride.isFull && styles.chipSeatsFull,
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
 * RideClusterSheet — transit-board style picker.
 *
 * Replaces the earlier "27 stacked white cards" layout which read as a
 * monotonous activity list. Now rides are grouped by destination, each
 * group rendering as one tight block with a tappable time chip per
 * departure. Way denser, way more scannable: 14 destination groups vs
 * 27 lookalike rows.
 *
 * Group sort: next-to-leave destination first (matches the way real
 * transit boards work — "where can I go RIGHT NOW" gets top billing).
 */
const RideClusterSheet: React.FC<Props> = ({
  visible,
  onClose,
  pickup,
  rides,
  onPickRide,
}) => {
  const groups = React.useMemo<DestinationGroup[]>(() => {
    const byDest = new Map<string, DestinationGroup>();
    for (const r of rides) {
      const key = r.end_location;
      const ts = new Date(r.start_time).getTime();
      const { day, time } = formatChipLabel(r.start_time);
      const seatsLeft = Math.max(0, r.total_seats - r.booked_seats);
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
        if (r.total_price < existing.cheapestPrice) existing.cheapestPrice = r.total_price;
        if (ts < existing.nextDeparture) existing.nextDeparture = ts;
      } else {
        byDest.set(key, {
          destination: r.end_location,
          cheapestPrice: r.total_price,
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
      />
    ),
    [groups.length, onPickRide],
  );

  const keyExtractor = React.useCallback((group: DestinationGroup) => group.destination, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Sibling structure (not parent/child): the dim layer is a
          sibling of the sheet so tapping the sheet content can't
          bubble up to a Pressable wrapper. The previous nested
          Pressable was absorbing scroll gestures and killing the
          ScrollView's panning. */}
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrimTop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Top bar — grip centered, Done text-button anchored
              top-right. Tap-outside-to-dismiss still works, but the
              Done button gives users an explicit, tappable exit that
              doesn't require reaching for the scrim. */}
          <View style={styles.topBar}>
            <View style={styles.grip} />
            <TouchableOpacity
              onPress={onClose}
              style={styles.doneBtn}
              hitSlop={10}
              activeOpacity={0.6}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>
              {rides.length} {rides.length === 1 ? "ride" : "rides"} leaving from
            </Text>
            <Text style={styles.title} numberOfLines={2}>
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
  // Full-modal container — splits into the dim scrim on top and the
  // sheet docked to the bottom. Sibling layout so the sheet's
  // ScrollView isn't trapped under a Pressable.
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    // Centre the inner sheet on iPad so the cluster picker is a
    // phone-shape card instead of a 1000pt-wide pill.
    alignItems: "center",
  },
  // Dim layer above the sheet. Only the empty space above the sheet
  // is tappable-to-close — the sheet sits below it as a sibling.
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
  // Top bar — holds the centered drag-grip + the right-anchored Done
  // button. Relative positioning so the absolutely-positioned Done
  // overlays the grip's row without shifting it off-center.
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

  // -------- destination group --------------------------------------
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

  // -------- chip row -----------------------------------------------
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  // Each chip: cream surface, tight padding, three-line stack (day /
  // time / seats). Reads as a "departure card" miniature.
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
