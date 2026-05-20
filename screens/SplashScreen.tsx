import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";

const { width: screenWidth } = Dimensions.get("window");

/**
 * Splash screen shown while the app boots (auth state resolves, JS
 * bundle attaches, fonts hydrate). Used to be a pixel-accurate
 * tracing of a Figma export with absolute coordinates scaled
 * against a 710×1524 design viewport — looked off on real devices
 * because the scale arithmetic rounded fonts to fractional pt and
 * positioned everything by hand. Now it's a flexbox layout that
 * just centers the brand mark and pins attribution to the bottom.
 *
 * Brand mark: the "UniPool" wordmark splits across two lines so
 * the "oo" of Pool can render in white-on-lime — that pair reads
 * as the two wheels in the spirit of the carpool product. Trap-Bold
 * is the brand display face; NunitoSans is the supporting body.
 */
const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Scale the wordmark to the device. iPhone Pro ~430 → ~92pt;
  // smaller phones drop to ~78pt so "UniPool" never overflows.
  const wordmarkSize = Math.min(Math.round(screenWidth * 0.22), 104);
  const lineHeight = Math.round(wordmarkSize * 1.0);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text
          style={[
            styles.wordmark,
            { fontSize: wordmarkSize, lineHeight },
          ]}
          allowFontScaling={false}
        >
          <Text style={styles.wordmarkDark}>Uni</Text>
        </Text>
        <Text
          style={[
            styles.wordmark,
            { fontSize: wordmarkSize, lineHeight },
          ]}
          allowFontScaling={false}
        >
          <Text style={styles.wordmarkDark}>P</Text>
          <Text style={styles.wordmarkWheels}>oo</Text>
          <Text style={styles.wordmarkDark}>l</Text>
        </Text>

        <Text style={styles.tagline} allowFontScaling={false}>
          Share. Commute. Save.
        </Text>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 18) + 8 },
        ]}
      >
        <Text style={styles.footerText} allowFontScaling={false}>
          Made with{" "}
          <Text style={styles.heart}>♥</Text>
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
    letterSpacing: -2,
    textAlign: "center",
    // Synthetic-bold off — `Trap-Bold` is already a weighted face.
    fontWeight: Platform.OS === "ios" ? "400" : "normal",
  },
  wordmarkDark: {
    color: AppColors.secondaryDarkGreen,
  },
  // The two "oo" wheels. White on lime stays high-contrast and
  // hints at carpool wheels without dropping the brand surface.
  wordmarkWheels: {
    color: AppColors.basicWhite,
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
  // Pulled out so we can hue-shift just the heart without affecting
  // the surrounding text — keeps the attribution single-line and
  // visually balanced (the heart is the only spot of accent color).
  heart: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 14,
    opacity: 0.9,
  },
});
