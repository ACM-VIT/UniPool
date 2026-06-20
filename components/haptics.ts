/**
 * UniPool haptics — the app's single source of tactile feedback.
 *
 * Engine: react-native-pulsar (Software Mansion). Every preset below
 * is a *worklet*, which is precisely why we moved off expo-haptics: a
 * Pulsar preset can fire on the UI thread directly from inside a
 * reanimated / gesture-handler worklet (e.g. the keyboard
 * drag-to-dismiss) with no JS-thread round-trip — so there's no
 * perceptible lag between the gesture and the tap you feel. The exact
 * same functions still work when called the ordinary way from a
 * JS-thread `onPress`, so every existing call site keeps working
 * unchanged.
 *
 * Taste rule — do not break it: haptics confirm STATE CHANGES and
 * DECISIONS (a toggle flips, a form submits, a booking commits, a
 * destructive action is confirmed). They are NOT for navigation,
 * scrolling, or idle taps. A haptic on everything is noise that makes
 * the app feel cheap; the whole point is that the user only notices
 * one when it's missing.
 */
import { Presets } from "react-native-pulsar";

export type HapticKind =
  | "light" //     smallest acknowledgement — a row / card press
  | "soft" //      gentle, diffuse tick — gesture nudges, drag handles
  | "medium" //    a committed tap — primary buttons (book, post, sign in)
  | "heavy" //     a weighty release — slide-to-create, large commits
  | "rigid" //     crisp, mechanical — segmented toggles
  | "selection" // value changed in a picker / segmented control
  | "success" //   an operation completed (booking confirmed, ride posted)
  | "warning" //   a recoverable caution (validation, "are you sure?")
  | "error"; //    an operation failed or was rejected

/**
 * Fire a semantic haptic. Marked `'worklet'` so it is callable from
 * BOTH the JS thread (a normal `onPress`) and the UI thread (inside a
 * gesture / animation worklet). Pulsar's presets are native and
 * synchronous, and no-op gracefully on simulators and devices without
 * a haptic engine — the `try/catch` is belt-and-suspenders for the
 * rare platform that throws rather than ignoring.
 */
export function haptic(kind: HapticKind | null): void {
  "worklet";
  if (kind == null) return;
  try {
    switch (kind) {
      case "light":
        Presets.System.impactLight();
        return;
      case "soft":
        Presets.System.impactSoft();
        return;
      case "medium":
        Presets.System.impactMedium();
        return;
      case "heavy":
        Presets.System.impactHeavy();
        return;
      case "rigid":
        Presets.System.impactRigid();
        return;
      case "selection":
        Presets.System.selection();
        return;
      case "success":
        Presets.System.notificationSuccess();
        return;
      case "warning":
        Presets.System.notificationWarning();
        return;
      case "error":
        Presets.System.notificationError();
        return;
    }
  } catch {
    // No haptic engine on this device / simulator — silently skip.
  }
}

/**
 * Direct access to Pulsar's preset bank for worklet contexts that want
 * a texture not covered by `HapticKind` (Android primitives, custom
 * compositions). Prefer `haptic(kind)` for the common cases so the
 * semantic vocabulary stays small and consistent.
 */
export { Presets } from "react-native-pulsar";
