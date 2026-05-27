import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

type LoadingComponentProps = {
  /**
   * Optional caption shown beneath the spinner. Use a short status string
   * ("Finding rides on your route…") rather than a vague "Loading".
   */
  label?: string;
  /**
   * When true, fills the parent with a translucent overlay so the loader sits
   * on top of underlying content. When false (default) it sits inline.
   */
  overlay?: boolean;
};

const LoadingComponent: React.FC<LoadingComponentProps> = ({ label, overlay = false }) => {
  const colors = useThemeColors();
  // Dark-mode overlay: warm-charcoal with the same ~94% opacity so it
  // still hints the screen behind without painting it lime in dark.
  const overlayBg =
    colors.mode === "dark" ? "rgba(15,15,18,0.94)" : "rgba(181,215,80,0.94)";
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        overlay && [styles.overlay, { backgroundColor: overlayBg }],
      ]}
    >
      <LottieView
        source={require("../assets/loader.json")}
        autoPlay
        loop
        style={styles.lottie}
      />
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Lime brand canvas — the loading state is part of the brand,
    // not a neutral interlude.
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 32,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Translucent lime overlay so the screen behind hints through but
    // the brand colour still wins.
    backgroundColor: "rgba(181,215,80,0.94)",
    zIndex: 100,
  },
  lottie: {
    width: 120,
    height: 120,
  },
  label: {
    marginTop: 8,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
    textAlign: "center",
    letterSpacing: -0.1,
  },
});

export default LoadingComponent;
