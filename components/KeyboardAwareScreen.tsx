import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/**
 * The app's default scroll container for any screen with text inputs.
 *
 * Wraps `react-native-keyboard-controller`'s `KeyboardAwareScrollView`,
 * which is the fix for the single most user-hostile thing a
 * cross-platform app does: covering the field you're typing in. As the
 * keyboard animates in, the view tracks its height frame-for-frame and
 * keeps the focused input — plus a comfortable margin — visible. The
 * submit button no longer hides, you don't have to scroll to see what
 * you typed, and a drag down dismisses the keyboard intentionally
 * instead of jarringly.
 *
 * Prefer this over a bare `ScrollView` + `KeyboardAvoidingView` for
 * forms. For a footer button that must hug the keyboard, pair the
 * screen body here with a `KeyboardStickyView` footer (imported
 * directly from `react-native-keyboard-controller`).
 */

type KeyboardAwareScreenProps = {
  children: React.ReactNode;
  /** Padding etc. for the scroll content. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Outer style for the scroll view itself. */
  style?: StyleProp<ViewStyle>;
  /**
   * Gap kept between the focused input and the top of the keyboard.
   * Default 24 — enough that the field never sits flush against the
   * keyboard.
   */
  bottomOffset?: number;
  /**
   * Whether taps outside an input dismiss the keyboard. Default
   * `handled` so buttons inside the form still fire on the first tap.
   */
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  showsVerticalScrollIndicator?: boolean;
};

const KeyboardAwareScreen: React.FC<KeyboardAwareScreenProps> = ({
  children,
  contentContainerStyle,
  style,
  bottomOffset = 24,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator = false,
}) => {
  return (
    <KeyboardAwareScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </KeyboardAwareScrollView>
  );
};

export default KeyboardAwareScreen;
