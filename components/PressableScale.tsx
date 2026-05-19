import React, { useCallback, useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Drop-in `Pressable` replacement that adds the kind of tactile
 * polish iOS gets for free:
 *
 *   1. A subtle scale-down (1 → 0.96) on press-in, spring back on
 *      press-out. Tuned tight so it feels "alive" without feeling
 *      mushy.
 *   2. An optional haptic tap on press-in. Default: `Light` selection
 *      feedback. Pass `haptic="medium"` for buttons that commit a
 *      bigger action (book, post, sign in), or `haptic={null}` to
 *      silence it.
 *
 * Use this for every button, list row, or tappable card across the
 * app. The scale is GPU-driven (`useNativeDriver: true`) so the JS
 * thread can be busy without the press feel suffering.
 */

type HapticKind = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

const fire = async (kind: HapticKind | null) => {
  if (kind == null) return;
  try {
    switch (kind) {
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "selection":
        await Haptics.selectionAsync();
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics aren't available on every device (older Androids,
    // simulators) — silently skip rather than crash.
  }
};

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** How far to scale on press. 1.0 = none; default 0.96. */
  scaleTo?: number;
  /** Haptic kind on press-in. Default `light`. Pass `null` to mute. */
  haptic?: HapticKind | null;
};

const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  scaleTo = 0.96,
  haptic = "light",
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      fire(haptic);
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
      onPressIn?.(e);
    },
    [haptic, scale, scaleTo, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 6,
      }).start();
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      {(state) => (
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {typeof children === "function" ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
};

export default PressableScale;

// Re-export a thin `haptic()` function so callers that just want
// haptic feedback (without the scale) — e.g. tab presses, gesture
// snaps — can fire one without adding a wrapper component.
export const haptic = fire;
