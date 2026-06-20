import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { haptic } from "./haptics";
import PressableScale from "./PressableScale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_TOP_GAP = 8;
const MIN_MEASURED_HEIGHT = 1;

const initialModalHeight =
  Platform.OS === "android"
    ? Math.max(SCREEN_HEIGHT - (StatusBar.currentHeight ?? 0), MIN_MEASURED_HEIGHT)
    : SCREEN_HEIGHT;

type Props = {
  visible: boolean;
  onDismiss: () => void;
  busy?: boolean;
  /** When false, suppresses the close X and backdrop dismissal so
   *  the user can only finish via in-content buttons. */
  dismissible?: boolean;
  /** Override the inner sheet surface colour. Defaults to white
   *  (used by every edit / verify sheet). Brand-canvas sheets like
   *  chat settings + report can pass `primaryLightGreen` so the
   *  forest cards inside read against the same lime as the home
   *  sheet instead of a hard white slab. */
  surfaceColor?: string;
  children: React.ReactNode;
};

/**
 * Slide-up overlay used as the chrome for every in-app editing sheet
 * (UPI, academic verification, future tweaks). Picks up the same
 * design language as AuthSheet: dim backdrop, grab handle, close X,
 * spring entry, soft content settle on appear. Putting the chrome
 * in one place keeps modals visually consistent.
 */
const SheetShell: React.FC<Props> = ({
  visible,
  onDismiss,
  busy,
  dismissible = true,
  surfaceColor,
  children,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [modalHeight, setModalHeight] = useState(initialModalHeight);
  // iOS keyboard height, tracked manually. We deliberately do NOT use
  // KeyboardAvoidingView on iOS: a KAV with `behavior="padding"` inside
  // a transparent Modal double-counts the keyboard frame, which shoved
  // the bottom sheet ~a full keyboard-height too high (content ended up
  // clipped under the status bar when returning from another app with
  // the keyboard re-opening). Tracking the height ourselves and padding
  // the flex-end container by exactly that much lifts the sheet to sit
  // flush on the keyboard, once. Android keeps the KeyboardAvoidingView
  // (`behavior="height"`) because its transparent Modal sits over an
  // OS-resized window and that path already behaves.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const onFrame = (e: { endCoordinates: { screenY: number } }) => {
      const h = Math.max(0, SCREEN_HEIGHT - e.endCoordinates.screenY);
      setKeyboardHeight(h);
    };
    const showSub = Keyboard.addListener("keyboardWillChangeFrame", onFrame);
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset the tracked keyboard height whenever the sheet closes so a
  // stale value can't offset the next open.
  useEffect(() => {
    if (!visible) setKeyboardHeight(0);
  }, [visible]);

  const handleModalLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      setModalHeight(nextHeight);
    }
  }, []);

  // Android transparent Modals do not reliably receive a non-zero
  // safe-area inset, and `behavior="height"` changes the available
  // modal height when the keyboard opens. Capping the sheet against
  // the laid-out KeyboardAvoidingView keeps the sheet inside the
  // residual visible area instead of letting tall content overflow
  // upward behind the system status bar. iOS keeps using the safe-area
  // top inset because its Modal/KAV path does preserve that context.
  const sheetMaxHeight =
    Math.max(
      modalHeight
        - (Platform.OS === "ios" ? insets.top : 0)
        // On iOS the flex-end container is padded by the keyboard
        // height, so the space available to the card is the screen
        // minus the keyboard. Subtract it so tall content caps to the
        // visible area above the keyboard instead of overflowing up.
        - (Platform.OS === "ios" ? keyboardHeight : 0)
        - SHEET_TOP_GAP,
      MIN_MEASURED_HEIGHT,
    );

  useEffect(() => {
    if (visible) {
      haptic("selection");
      // Reset animated values before each open in case close was interrupted.
      translateY.setValue(SCREEN_HEIGHT);
      backdrop.setValue(0);
      // Match AuthSheet: backdrop fades in while the sheet springs up.
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Belt and braces — guarantee the values land at their
        // off-screen target so the next open's reset above is paired
        // with a known final state.
        translateY.setValue(SCREEN_HEIGHT);
        backdrop.setValue(0);
      });
    }
  }, [visible]);

  const canDismiss = dismissible && !busy;

  // The bottom-sheet card. Extracted so it can be dropped into either
  // the iOS padded container or the Android KeyboardAvoidingView
  // without duplicating the markup.
  const sheetCard = (
    <Animated.View
      style={{
        width: "100%",
        maxWidth: 540,
        backgroundColor: surfaceColor ?? colors.surfaceElevated,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        // Plain 14pt top padding. With statusBarTranslucent OFF on
        // Android, the Modal sits below the system chrome on its own,
        // so we don't need to push the content down ourselves.
        paddingTop: 14,
        paddingBottom: Platform.OS === "ios" ? 36 : 24,
        transform: [{ translateY }],
        shadowColor: AppColors.basicBlack,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
        elevation: 18,
        maxHeight: sheetMaxHeight,
      }}
    >
      {/* Grab handle */}
      <View
        style={{
          alignSelf: "center",
          width: 44,
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.inkLine,
          marginBottom: 18,
        }}
      />

      {dismissible ? (
        // Dismiss control — no outcome haptic; the press-in scale is enough.
        <PressableScale
          onPress={() => canDismiss && onDismiss()}
          disabled={!canDismiss}
          haptic={null}
          style={{
            position: "absolute",
            top: 22,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.inkSubtle,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4,
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path
              d="M3 3 L 13 13 M13 3 L 3 13"
              stroke={colors.textPrimary}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </Svg>
        </PressableScale>
      ) : null}

      {children}
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      // Keep Android Modal layout below the status bar. The dynamic
      // height cap below handles the keyboard-shrunk space; this prop
      // prevents the modal itself from starting behind system chrome.
      statusBarTranslucent={Platform.OS === "ios"}
      onRequestClose={() => canDismiss && onDismiss()}
    >
      <Animated.View
        style={{ ...fill, backgroundColor: "rgba(0,0,0,0.42)", opacity: backdrop }}
      >
        <Pressable
          style={fill}
          onPress={() => canDismiss && onDismiss()}
          disabled={!canDismiss}
        />
      </Animated.View>

      <View style={fill} pointerEvents="box-none">
        {Platform.OS === "ios" ? (
          // iOS: plain flex-end container padded by the tracked keyboard
          // height. No KeyboardAvoidingView — see the keyboardHeight
          // comment above for why the KAV double-counted here.
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              alignItems: "center",
              paddingBottom: keyboardHeight,
            }}
            pointerEvents="box-none"
            onLayout={handleModalLayout}
          >
            {sheetCard}
          </View>
        ) : (
          <KeyboardAvoidingView
            // `behavior="height"` on Android because a transparent Modal
            // sits above the OS-resized window. We measure this KAV after
            // it shrinks and cap the bottom sheet to that space, so
            // oversized content cannot push the title/handle above the
            // visible modal area.
            //
            // `alignItems: 'center'` centres the inner sheet card under
            // its `maxWidth: 540`, so on iPad the sheet reads as a
            // phone-shape surface instead of spanning the entire tablet
            // canvas.
            behavior="height"
            style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}
            pointerEvents="box-none"
            onLayout={handleModalLayout}
          >
            {sheetCard}
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

export default SheetShell;

const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
