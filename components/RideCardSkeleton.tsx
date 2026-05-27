import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

// Minimal list placeholder used while ride rows are loading.
//
// The previous version rebuilt the whole RideCard surface (forest tile,
// shadow, fake route dots, chip, etc.) which read as a heavy fake card
// stuck between the lime canvas and the real content. Stripped to a
// pair of thin pulsing bars on the canvas — quiet enough that the list
// reads as "settling in" rather than "displaying placeholders."
//
// Forest at ~10% opacity sits gently on the lime background; the pulse
// animates between 0.55 ↔ 1.0 over 900ms — same cadence as the home
// "Your trips" skeleton so multiple loaders breathe together.

type Props = {
  /** Optional wrapping View style for outer spacing. */
  style?: ViewStyle;
};

const RideCardSkeleton: React.FC<Props> = ({ style }) => {
  const colors = useThemeColors();
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
    <View style={[styles.row, style]}>
      <Animated.View
        style={[
          styles.barLong,
          { opacity: pulse, backgroundColor: colors.inkSoft },
        ]}
      />
      <Animated.View
        style={[
          styles.barShort,
          { opacity: pulse, backgroundColor: colors.inkSubtle },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    // No card / shadow / background — sits straight on the lime canvas.
    // Keeps roughly the rhythm of a list row so the eye doesn't slam
    // when real cards arrive, but stays out of the way.
    paddingVertical: 14,
    gap: 10,
  },
  barLong: {
    width: "60%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  barShort: {
    width: "34%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(38,59,51,0.08)",
  },
});

export default RideCardSkeleton;
