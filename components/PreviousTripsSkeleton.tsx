import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useThemeColors } from "../contexts/ThemeContext";

/**
 * Minimal placeholder for the home "Your trips" carousel. Previous
 * version painted a full forest card with fake route dots, dashed
 * connector, date chip and price pill — heavy for a transient loading
 * frame. This is just two faint pulsing lines on the lime canvas, in
 * the same horizontal rhythm as the real card so the layout doesn't
 * jump much when content arrives.
 */
const PreviousTripsSkeleton: React.FC = () => {
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
    <View style={styles.wrap}>
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
  wrap: {
    paddingVertical: 16,
    gap: 12,
  },
  barLong: {
    width: "62%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  barShort: {
    width: "36%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(38,59,51,0.08)",
  },
});

export default PreviousTripsSkeleton;
