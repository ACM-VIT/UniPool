import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import AppColors from "../design_systems/colors";

const { width } = Dimensions.get("window");

/**
 * The set of status messages cycled while a search is running.
 * Peer-to-peer matching is slower than instant ride-hail (we're searching
 * other students' posted rides, not dispatching drivers) so the user
 * benefits from light narration. Order is intentional: location ➜ time ➜
 * fares ➜ co-riders ➜ confidence-building close.
 */
const MESSAGES = [
  "Scanning rides on your route…",
  "Matching your time window…",
  "Comparing fares…",
  "Looking for familiar co-riders…",
  "Almost there, pulling the best matches…",
];

const STEP_MS = 1400; // how long each message stays up

type Props = {
  /** Optional headline above the cycling messages. */
  title?: string;
  /** Override the default cycling messages. */
  messages?: string[];
};

const SearchingForRidesLoader: React.FC<Props> = ({
  title = "Finding your ride",
  messages = MESSAGES,
}) => {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Cross-fade to the next message.
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
      }, 220);
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [messages, fade]);

  return (
    <View style={styles.container}>
      <View style={styles.lottieWrap}>
        <LottieView
          source={require("../assets/loader.json")}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Animated.Text style={[styles.status, { opacity: fade }]}>
        {messages[index]}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    // Lime brand canvas matches the rest of the app — the search-loading
    // moment is still UniPool, not a blank pause.
    backgroundColor: AppColors.primaryLightGreen,
  },
  lottieWrap: {
    width: Math.min(width * 0.5, 220),
    height: Math.min(width * 0.5, 220),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
  title: {
    marginTop: 4,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  status: {
    marginTop: 8,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    textAlign: "center",
    letterSpacing: -0.05,
    minHeight: 22,
  },
});

export default SearchingForRidesLoader;
