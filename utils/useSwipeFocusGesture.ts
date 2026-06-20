import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { Presets } from "../components/haptics";

export type SwipeFocusGestureOptions = {
  /** Fired when the user swipes up past the threshold (e.g. focus an input). */
  onSwipeUp: () => void;
  /** Fired when the user swipes down past the threshold (e.g. dismiss the keyboard). */
  onSwipeDown: () => void;
  /** Vertical travel (px) before the pan activates. Default 48. */
  activeOffsetY?: number;
  /** Horizontal travel (px) that cancels the gesture so it doesn't fight
   *  sideways scrolls. Default 32. */
  failOffsetX?: number;
  /** Minimum total vertical travel for the swipe to count on release.
   *  Defaults to `activeOffsetY`. */
  minTranslationY?: number;
};

/**
 * A vertical pan gesture that fires callbacks on swipe-up / swipe-down.
 * Built for the drag-to-dismiss / drag-to-focus feel on the prompt and
 * chat inputs, but kept generic so it stays reusable.
 *
 * The gesture's `onEnd` runs on the UI thread, so two things happen
 * there with no JS round-trip: the soft confirmation haptic fires
 * instantly (Pulsar presets are worklet-safe), and `scheduleOnRN`
 * bridges the focus/blur callback back to the JS thread where React
 * refs live. That split is what makes the keyboard feel like it's
 * following your finger rather than reacting a frame late.
 */
export function useSwipeFocusGesture({
  onSwipeUp,
  onSwipeDown,
  activeOffsetY = 48,
  failOffsetX = 32,
  minTranslationY,
}: SwipeFocusGestureOptions) {
  const minY = minTranslationY ?? activeOffsetY;

  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-activeOffsetY, activeOffsetY])
        .failOffsetX([-failOffsetX, failOffsetX])
        .onEnd((e) => {
          "worklet";
          if (Math.abs(e.translationY) < minY) return;

          if (e.translationY > 0) {
            scheduleOnRN(onSwipeDown);
          } else {
            scheduleOnRN(onSwipeUp);
          }

          // Pulsar presets are worklet-safe — fire directly on the UI thread.
          Presets.System.impactSoft();
        }),
    [onSwipeUp, onSwipeDown, activeOffsetY, failOffsetX, minY],
  );
}
