import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import AppColors from "../design_systems/colors";

// Generic loading placeholder for list rows on the Trips + Available
// rides screens. Earlier version tried to mirror the real `RideCard`
// element-for-element (route dots, dashed connector, time + price
// columns, vehicle silhouette) — it read as busy and slightly off,
// like a wireframe that hadn't been polished. This version is a
// calmer surrogate: the same outer card geometry so the list reserves
// the right amount of space, plus three simple stacked bars and one
// trailing chip that hint at "content rows + small meta tag" without
// claiming to be specific UI.
//
// Animation: a single shared `pulse` Animated.Value crossfades every
// placeholder element between 0.55 ↔ 1.0 over 900ms — same cadence
// as `PreviousTripsSkeleton` so a screen with both surfaces breathing
// simultaneously stays in one rhythm.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const wp = (p: number) => (SCREEN_W * p) / 100;
const hp = (p: number) => (SCREEN_H * p) / 100;

type Props = {
  /** Optional wrapping View style for outer spacing — matches the
   *  callsite's list-item wrapper. */
  style?: ViewStyle;
};

const RideCardSkeleton: React.FC<Props> = ({ style }) => {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.card, style]}>
      {/* Three stacked content bars on the left — width steps down
          line by line so the stack doesn't read as a fake table.
          Same horizontal padding the real card uses for its route
          column. */}
      <View style={styles.contentColumn}>
        <Animated.View style={[styles.barXL, { opacity: pulse }]} />
        <Animated.View style={[styles.barL, { opacity: pulse }]} />
        <Animated.View style={[styles.barM, { opacity: pulse }]} />
      </View>

      {/* Single trailing chip in the lower-right corner — stands in
          for the small meta tags (date / fare / seats) the real card
          puts there. A single chip reads cleaner than three competing
          placeholder badges. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.trailingChip, { opacity: pulse }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Card footprint matches `RideCard` exactly so the swap from
  // skeleton → real content is content-only, no layout shift.
  card: {
    height: hp(19),
    width: "100%",
    borderRadius: wp(3),
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.5),
    backgroundColor: AppColors.basicWhite,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: "2%",
    justifyContent: "center",
  },
  contentColumn: {
    gap: 12,
  },
  // Three bar widths that step DOWN from longest to shortest.
  // Mimics the natural feel of a paragraph that wraps with a
  // partial last line. All three share the same height + radius so
  // the eye reads them as one cohesive paragraph.
  barXL: {
    width: "62%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(38,59,51,0.12)",
  },
  barL: {
    width: "48%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  barM: {
    width: "34%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  // Lower-right pill, anchored to bottom-right corner so it doesn't
  // collide with the bars on the left. Width + height match the
  // real "₹150 · 3 seats" pill on the live card, which lets the eye
  // settle in the same place before the real chip arrives.
  trailingChip: {
    position: "absolute",
    right: wp(5),
    bottom: hp(2.5),
    width: 72,
    height: 24,
    borderRadius: 999,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
});

export default RideCardSkeleton;
