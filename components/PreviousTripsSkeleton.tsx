import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import AppColors from "../design_systems/colors";

/**
 * Loading placeholder for the "Your trips" carousel. Shaped exactly
 * like `PreviousTripsCompressed` so the layout doesn't shift when real
 * data lands. The slow pulse on the lime accents tells the user that
 * content is on its way without burning a spinner.
 */
const PreviousTripsSkeleton: React.FC = () => {
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
    <View>
      <View style={styles.card}>
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <Animated.View style={[styles.dotOutline, { opacity: pulse }]} />
            <Animated.View style={[styles.routeLineWide, { opacity: pulse }]} />
          </View>
          <Animated.View style={[styles.routeConnector, { opacity: pulse }]} />
          <View style={styles.routeRow}>
            <Animated.View style={[styles.dotFilled, { opacity: pulse }]} />
            <Animated.View style={[styles.routeLineMedium, { opacity: pulse }]} />
          </View>
        </View>
        <View style={styles.footer}>
          <Animated.View style={[styles.dateChip, { opacity: pulse }]} />
          <Animated.View style={[styles.pricePill, { opacity: pulse }]} />
        </View>
      </View>
      <View style={styles.dots}>
        <View style={styles.dot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  routeBlock: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: "rgba(181,215,80,0.45)",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeLineWide: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(181,215,80,0.22)",
    marginRight: 24,
  },
  routeLineMedium: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(181,215,80,0.18)",
    marginRight: 60,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(181,215,80,0.18)",
    paddingTop: 10,
  },
  dateChip: {
    width: 96,
    height: 13,
    borderRadius: 6,
    backgroundColor: "rgba(181,215,80,0.30)",
  },
  pricePill: {
    width: 52,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(181,215,80,0.30)",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 4,
    backgroundColor: "rgba(38,59,51,0.30)",
    marginHorizontal: 3,
  },
});

export default PreviousTripsSkeleton;
