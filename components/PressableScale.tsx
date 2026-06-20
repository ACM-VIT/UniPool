import React, { useCallback } from "react";
import { GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { haptic as fireHaptic, type HapticKind } from "./haptics";

/**
 * Drop-in `Pressable` replacement that adds the kind of tactile polish
 * iOS gets for free:
 *
 *   1. A subtle scale-down (1 → 0.96) on press-in, springing back on
 *      press-out. Tuned tight so the control feels "alive" without
 *      feeling mushy.
 *   2. An optional haptic tap on press-in. Default: `light`. Pass
 *      `haptic="medium"` for buttons that commit a bigger action
 *      (book, post, sign in), or `haptic={null}` to silence it.
 *
 * Use this for every button, list row, or tappable card across the
 * app. The scale runs entirely on the UI thread via Reanimated, so the
 * press stays buttery even while the JS thread is busy.
 *
 * IMPORTANT — layout fidelity: `style` is applied to the touchable
 * ITSELF (an animated `Pressable`), exactly like `TouchableOpacity`.
 * That means `width`, `alignSelf`, `maxWidth`, `flex`, and margins in
 * your style drive the button's box the same way they always did — and
 * the scale transform animates that whole box (background, padding,
 * border included). Wrapping the style on an inner view instead would
 * collapse full-width / self-aligned buttons to content size, so don't.
 */

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** How far to scale on press. 1.0 = none; default 0.96. */
  scaleTo?: number;
  /** Haptic kind on press-in. Default `light`. Pass `null` to mute. */
  haptic?: HapticKind | null;
};

// Animating the Pressable directly (rather than an inner View) keeps the
// component layout-identical to TouchableOpacity while still scaling the
// entire button on press.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press-in: fast, well-damped, zero overshoot — the control should
// "give" instantly under the finger.
const SPRING_IN = { mass: 0.5, damping: 20, stiffness: 420 } as const;
// Press-out: a touch livelier so the release reads as a physical
// rebound rather than a flat snap back to rest.
const SPRING_OUT = { mass: 0.6, damping: 14, stiffness: 320 } as const;

const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  scaleTo = 0.96,
  haptic = "light",
  onPressIn,
  onPressOut,
  children,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) fireHaptic(haptic);
      scale.value = withSpring(disabled ? 1 : scaleTo, SPRING_IN);
      onPressIn?.(e);
    },
    [haptic, scale, scaleTo, onPressIn, disabled],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(1, SPRING_OUT);
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
