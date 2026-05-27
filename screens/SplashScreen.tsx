import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";

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
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";

  // Scale the wordmark to the device. iPhone Pro ~430 → ~88pt;
  // smaller phones drop proportionally. The previous 1.0× lineHeight
  // was clipping the descender on "i" and the ascender on "l" with
  // Trap-Bold, which is why the wordmark sometimes rendered as
  // "Un" / "Poo" on dark. Generous lineHeight + 0 letterspacing
  // fixes that.
  const wordmarkSize = Math.min(Math.round(screenWidth * 0.20), 92);
  const wordmarkLineHeight = Math.round(wordmarkSize * 1.18);

  // Light mode: historical dual-line "Uni / Pool" with white "oo"
  // wheels on lime — the brand pattern that gave the product its
  // visual signature. Dark mode: same dual-line layout, cream
  // letters with the "oo" still as the brightest pop (lime, the
  // brand splash). Same brand idea, just the canvas swap.
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
        {/* The outer Text carries the default colour for "P" and "l".
            Nested <Text> only overrides the "oo" wheels. Previously
            we wrapped EACH letter in its own <Text> with an explicit
            colour — on iOS, certain nested colour-span sequences fail
            to paint the trailing narrow glyph ("l"), which is why the
            wordmark rendered as "Poo". Inheriting colour from the
            outer Text and only overriding the centre two letters is
            the simplest fix and matches React Native's documented
            Text-nesting model. */}
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
    // Relaxed letterspacing — the previous -2 was squeezing narrow
    // glyphs ("i", "l") into their neighbours and they were getting
    // clipped at certain font sizes on certain devices.
    letterSpacing: -0.5,
    textAlign: "center",
    // Synthetic-bold off — `Trap-Bold` is already a weighted face.
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
  // Pulled out so we can hue-shift just the heart without affecting
  // the surrounding text — keeps the attribution single-line and
  // visually balanced (the heart is the only spot of accent color).
  heart: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 14,
    opacity: 0.9,
  },
});
