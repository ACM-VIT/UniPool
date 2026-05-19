import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import AppColors from "../design_systems/colors";
import { haptic } from "./PressableScale";

/**
 * Brand-styled replacement for `Alert.alert`. The native iOS / Android
 * dialogs use system fonts and pop chrome (rounded white card, blue
 * buttons on iOS, etc.) that breaks the rest of the visual system.
 *
 * Use the static `show()` API the same way you'd use `Alert.alert`:
 *
 *   BrandedAlert.show({
 *     title: "Couldn't save",
 *     body: "Try again in a moment.",
 *     buttons: [
 *       { label: "Cancel", style: "cancel" },
 *       { label: "Retry", style: "primary", onPress: () => retry() },
 *     ],
 *   });
 *
 * For the modal to render, mount <BrandedAlertHost /> once at the
 * top of the app (we do this in App.tsx). The static API talks to
 * the mounted host via a small ref-based dispatcher.
 */

export type AlertButtonStyle = "primary" | "cancel" | "destructive";

export type AlertButton = {
  label: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

export type AlertOptions = {
  title: string;
  body?: string;
  buttons?: AlertButton[];
  /** Whether tapping the dimmed backdrop dismisses the alert (with
   *  no button onPress invoked). Defaults to true for single-button
   *  alerts, false for multi-button (so users can't accidentally
   *  bypass a confirmation). */
  dismissOnBackdrop?: boolean;
};

// Module-level dispatcher. The host registers itself by setting
// `dispatcher.handler`; the static `show()` calls it. This keeps the
// API call-site dead simple — no need to thread context everywhere.
type Handler = (opts: AlertOptions) => void;
const dispatcher: { handler: Handler | null } = { handler: null };

// Shape match for RN's `Alert.alert` so callsites can be migrated
// with a drop-in import swap. The original `text` field becomes
// `label`; `onPress` and `style` carry over unchanged.
type AlertCompatButton = {
  text: string;
  onPress?: () => void;
  style?: "cancel" | "destructive" | "default";
};

const BrandedAlert = {
  show(opts: AlertOptions) {
    if (dispatcher.handler) {
      dispatcher.handler(opts);
    } else if (__DEV__) {
      console.warn(
        "[BrandedAlert] No host mounted — falling back to console.\n",
        opts.title,
        opts.body ?? "",
      );
    }
  },

  // Drop-in replacement for `Alert.alert(title, message?, buttons?)`.
  // Lets us sed-replace existing `Alert.alert(...)` callsites without
  // touching their button arrays.
  alert(title: string, body?: string, buttons?: AlertCompatButton[]) {
    BrandedAlert.show({
      title,
      body,
      buttons: buttons?.map((b) => ({
        label: b.text,
        onPress: b.onPress,
        style:
          b.style === "cancel"
            ? "cancel"
            : b.style === "destructive"
              ? "destructive"
              : "primary",
      })),
    });
  },
};

export default BrandedAlert;

// --- Host -----------------------------------------------------------

/**
 * Mount this once at the top of the app. It listens for `show()`
 * calls and renders the modal.
 */
export const BrandedAlertHost: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<AlertOptions | null>(null);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatcher.handler = (next) => {
      setOpts(next);
      setVisible(true);
    };
    return () => {
      dispatcher.handler = null;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Light tap as the alert lands — confirms the system has
      // something to say. Use `warning` haptic when the alert is
      // destructive-looking; default `selection` is unobtrusive
      // enough for everything else.
      haptic(
        opts?.buttons?.some((b) => b.style === "destructive")
          ? "warning"
          : "selection",
      );
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 80,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity, opts]);

  const close = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 110,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setOpts(null);
    });
  };

  const onButtonPress = (btn: AlertButton) => {
    close();
    // Defer the user's onPress to the next tick so the close
    // animation finishes before any navigation kicks in.
    if (btn.onPress) setTimeout(btn.onPress, 80);
  };

  if (!opts) return null;

  const buttons: AlertButton[] =
    opts.buttons && opts.buttons.length > 0
      ? opts.buttons
      : [{ label: "OK", style: "primary" }];

  const allowBackdropDismiss =
    opts.dismissOnBackdrop ?? buttons.length <= 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => allowBackdropDismiss && close()}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => allowBackdropDismiss && close()}
        />
        <Animated.View
          style={[
            styles.card,
            { opacity, transform: [{ scale }] },
          ]}
        >
          <Text style={styles.title}>{opts.title}</Text>
          {opts.body ? <Text style={styles.body}>{opts.body}</Text> : null}

          <View
            style={[
              styles.buttonRow,
              buttons.length === 1 && styles.buttonRowSingle,
            ]}
          >
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={`${btn.label}-${i}`}
                style={[
                  styles.btn,
                  btn.style === "primary" && styles.btnPrimary,
                  btn.style === "destructive" && styles.btnDestructive,
                  btn.style === "cancel" && styles.btnCancel,
                  // No explicit style → default to cancel for the
                  // first button and primary for subsequent ones,
                  // matching `Alert.alert`'s convention.
                  !btn.style && i === 0 && styles.btnCancel,
                  !btn.style && i > 0 && styles.btnPrimary,
                ]}
                onPress={() => onButtonPress(btn)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.btnLabel,
                    btn.style === "primary" && styles.btnLabelPrimary,
                    btn.style === "destructive" && styles.btnLabelDestructive,
                    btn.style === "cancel" && styles.btnLabelCancel,
                    !btn.style && i === 0 && styles.btnLabelCancel,
                    !btn.style && i > 0 && styles.btnLabelPrimary,
                  ]}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 12,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 19,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.78,
    textAlign: "center",
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  buttonRowSingle: {
    // A single OK button stays full-width-ish for a cleaner shape.
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  btnCancel: {
    backgroundColor: "rgba(38,59,51,0.10)",
  },
  btnDestructive: {
    backgroundColor: "#FF6B5B",
  },
  btnLabel: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  btnLabelPrimary: {
    color: AppColors.primaryLightGreen,
  },
  btnLabelCancel: {
    color: AppColors.secondaryDarkGreen,
  },
  btnLabelDestructive: {
    color: AppColors.basicWhite,
  },
});
