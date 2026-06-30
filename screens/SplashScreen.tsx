import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");

/**
 * Splash screen shown while auth, fonts, and the JS bundle are settling.
 * The wordmark is split so the "oo" glyphs can carry the brand accent.
 */
const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";

  // Scale the wordmark to the device while keeping enough line height for
  // Trap-Bold's tall ascenders and descenders.
  const wordmarkSize = Math.min(Math.round(screenWidth * 0.20), 92);
  const wordmarkLineHeight = Math.round(wordmarkSize * 1.18);

  // Keep the "oo" accent bright against both light and dark canvases.
  const letterColor = colors.brandText;
  const wheelsColor = isDark ? colors.primary : AppColors.basicWhite;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text
          style={[
            styles.wordmark,
            { fontSize: wordmarkSize, lineHeight: wordmarkLineHeight, color: letterColor },
          ]}
          allowFontScaling={false}
        >
          Uni
        </Text>
        {/* Inherit the base color from the outer Text and override only the accent glyphs. */}
        <Text
          style={[
            styles.wordmark,
            { fontSize: wordmarkSize, lineHeight: wordmarkLineHeight, color: letterColor },
          ]}
          allowFontScaling={false}
        >
          P<Text style={{ color: wheelsColor }}>oo</Text>l
        </Text>

        <Text
          style={[
            styles.tagline,
            isDark
              ? { color: colors.textSecondary }
              : { color: AppColors.secondaryDarkGreen, opacity: 0.7 },
          ]}
          allowFontScaling={false}
        >
          Share. Commute. Save.
        </Text>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 18) + 8 },
        ]}
      >
        <Text
          style={[
            styles.footerText,
            isDark
              ? { color: colors.textTertiary }
              : { color: AppColors.secondaryDarkGreen, opacity: 0.65 },
          ]}
          allowFontScaling={false}
        >
          Made with{" "}
          <Text style={[styles.heart, { color: isDark ? colors.primary : AppColors.secondaryDarkGreen }]}>♥</Text>
          {"  "}by ACM-VIT
        </Text>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  wordmark: {
    fontFamily: "Trap-Bold",
    // Keep letter spacing relaxed so narrow Trap glyphs do not clip.
    letterSpacing: -0.5,
    textAlign: "center",
    // Trap-Bold already carries the weight.
    fontWeight: Platform.OS === "ios" ? "400" : "normal",
  },
  tagline: {
    marginTop: 14,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  footerText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.2,
  },
  // Isolate the heart color without affecting the attribution text.
  heart: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 14,
    opacity: 0.9,
  },
});
