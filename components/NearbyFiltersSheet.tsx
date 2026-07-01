import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import SheetShell from "./SheetShell";
import PressableScale from "./PressableScale";
import { useThemeColors } from "../contexts/ThemeContext";
import { haptic } from "./haptics";

// Client-side filters for the "Rides around you" list. The nearby endpoint
// already returns every ride within 10 km, so narrowing happens on-device —
// no refetch, instant feedback.
export type NearbyFilters = {
  sortBy: "distance" | "time";
  maxDistanceKm: number | null; // null = no cap (the full 10 km radius)
  minSeats: number; // 0 = any
  maxPrice: number | null; // null = any
  showExternal: boolean;
};

export const DEFAULT_NEARBY_FILTERS: NearbyFilters = {
  sortBy: "distance",
  maxDistanceKm: null,
  minSeats: 0,
  maxPrice: null,
  showExternal: true,
};

// How many facets differ from the default — drives the header badge.
export const nearbyFiltersCount = (f: NearbyFilters): number =>
  (f.sortBy !== "distance" ? 1 : 0) +
  (f.maxDistanceKm !== null ? 1 : 0) +
  (f.minSeats !== 0 ? 1 : 0) +
  (f.maxPrice !== null ? 1 : 0) +
  (!f.showExternal ? 1 : 0);

type Option<T> = { label: string; value: T };

interface Props {
  visible: boolean;
  onDismiss: () => void;
  value: NearbyFilters;
  onApply: (next: NearbyFilters) => void;
  /** How many rides a given filter set would surface — evaluated against the
   *  live draft so the apply button previews the result before committing. */
  countFor?: (f: NearbyFilters) => number;
}

/**
 * Bottom-sheet filter panel for the nearby-rides list. Keeps a local draft so
 * the list under it doesn't churn on every tap; Apply commits, Reset clears.
 * Segmented chips match the app's sheet language (SheetShell + PressableScale).
 */
const NearbyFiltersSheet: React.FC<Props> = ({ visible, onDismiss, value, onApply, countFor }) => {
  const colors = useThemeColors();
  const [draft, setDraft] = useState<NearbyFilters>(value);

  // Sync the draft to the committed value each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const patch = (next: Partial<NearbyFilters>) => {
    haptic("selection");
    setDraft((d) => ({ ...d, ...next }));
  };

  const apply = () => {
    haptic("medium");
    onApply(draft);
    onDismiss();
  };

  const Segmented = <T,>({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: Option<T>[];
    selected: T;
    onSelect: (v: T) => void;
  }) => (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => {
          const active = opt.value === selected;
          return (
            // PressableScale applies `style` to an inner view, so the flex that
            // splits the row lives on this plain wrapper; the chip fills it.
            <View key={String(opt.value)} style={styles.segmentCol}>
              <PressableScale
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.inkSubtle },
                ]}
                onPress={() => onSelect(opt.value)}
                haptic={null}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.secondary : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );

  const resultCount = countFor ? countFor(draft) : undefined;
  const applyLabel =
    typeof resultCount === "number"
      ? resultCount === 0
        ? "No rides match"
        : `Show ${resultCount} ${resultCount === 1 ? "ride" : "rides"}`
      : "Show rides";

  return (
    <SheetShell visible={visible} onDismiss={onDismiss}>
      {/* Leave room on the right for SheetShell's own close X. */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>Filter rides</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Narrow the carpools within 10 km of you.
      </Text>

      {/* The groups scroll so the apply button stays reachable on short screens. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Segmented<NearbyFilters["sortBy"]>
          label="Sort by"
          selected={draft.sortBy}
          onSelect={(v) => patch({ sortBy: v })}
          options={[
            { label: "Nearest", value: "distance" },
            { label: "Leaving soon", value: "time" },
          ]}
        />

        <Segmented<number | null>
          label="Within"
          selected={draft.maxDistanceKm}
          onSelect={(v) => patch({ maxDistanceKm: v })}
          options={[
            { label: "2 km", value: 2 },
            { label: "5 km", value: 5 },
            { label: "10 km", value: null },
          ]}
        />

        <Segmented<number>
          label="Seats needed"
          selected={draft.minSeats}
          onSelect={(v) => patch({ minSeats: v })}
          options={[
            { label: "Any", value: 0 },
            { label: "1+", value: 1 },
            { label: "2+", value: 2 },
            { label: "3+", value: 3 },
          ]}
        />

        <Segmented<number | null>
          label="Max fare"
          selected={draft.maxPrice}
          onSelect={(v) => patch({ maxPrice: v })}
          options={[
            { label: "Any", value: null },
            { label: "₹100", value: 100 },
            { label: "₹200", value: 200 },
            { label: "₹300", value: 300 },
          ]}
        />

        <Segmented<boolean>
          label="Off-platform rides"
          selected={draft.showExternal}
          onSelect={(v) => patch({ showExternal: v })}
          options={[
            { label: "Show", value: true },
            { label: "Hide", value: false },
          ]}
        />
      </ScrollView>

      <PressableScale
        style={[styles.applyBtn, { backgroundColor: colors.primary }]}
        onPress={apply}
        haptic={null}
      >
        <Text style={[styles.applyText, { color: colors.secondary }]}>{applyLabel}</Text>
      </PressableScale>
    </SheetShell>
  );
};

export default NearbyFiltersSheet;

const styles = StyleSheet.create({
  title: {
    marginRight: 44, // clear SheetShell's close X
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
  scroll: {
    flexShrink: 1,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  group: {
    marginTop: 18,
  },
  groupLabel: {
    fontSize: 12.5,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentCol: {
    flex: 1,
  },
  chip: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.1,
  },
  applyBtn: {
    width: "100%",
    marginTop: 18,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    fontSize: 15.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.2,
  },
});
