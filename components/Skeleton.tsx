import React, { useEffect } from "react";
import { DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "../contexts/ThemeContext";

/**
 * A single shimmering placeholder block — the atom every skeleton
 * screen is built from. Pulse cadence (900ms in/out) deliberately
 * matches the legacy `RideCardSkeleton` / "Your trips" loaders so a
 * screen mixing old and new skeletons breathes in unison.
 *
 * Why skeletons and not a spinner: a spinner says "wait." A skeleton
 * shows the *shape* of what's coming, so when the real data lands it
 * feels like it was already there. Use these to outline the content a
 * screen is about to render, then swap to the real rows on load.
 *
 * The pulse runs on the UI thread, so it stays smooth even while the
 * JS thread is busy doing the very fetch the skeleton is covering for.
 */

type SkeletonBlockProps = {
  /** Width — number (px) or percentage string. Default 100%. */
  width?: DimensionValue;
  /** Height in px. Default 12. */
  height?: number;
  /** Corner radius. Default `height / 2` for a soft pill. */
  radius?: number;
  /** Extra layout style (margins, alignment). */
  style?: StyleProp<ViewStyle>;
  /** Override the fill. Defaults to the theme's soft ink tone. */
  color?: string;
};

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = "100%",
  height = 12,
  radius,
  style,
  color,
}) => {
  const colors = useThemeColors();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? height / 2,
          backgroundColor: color ?? colors.inkSoft,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default SkeletonBlock;
