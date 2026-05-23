import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { haptic } from "./PressableScale";

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
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [modalHeight, setModalHeight] = useState(initialModalHeight);

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
      modalHeight - (Platform.OS === "ios" ? insets.top : 0) - SHEET_TOP_GAP,
      MIN_MEASURED_HEIGHT,
    );

  useEffect(() => {
    if (visible) {
      haptic("selection");
      // Force start position before the spring. If the previous
      // close animation was cancelled mid-flight when the Modal
      // unmounted, these values can be stuck open and the next
      // open would render with no animation.
      translateY.setValue(SCREEN_HEIGHT);
      backdrop.setValue(0);
      // Same shape as AuthSheet: backdrop fades in, sheet springs
      // up. No secondary content fade — that was reading as a
      // delayed pop-in over the already-animating sheet, which the
      // user called out as feeling weird.
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
        <KeyboardAvoidingView
          // `behavior="height"` on Android (not `undefined`) because a
          // transparent Modal sits above the OS-resized window. We then
          // measure this KAV after it shrinks and cap the bottom sheet to
          // that measured space, so oversized content cannot push the
          // title/handle above the visible modal area.
          //
          // `alignItems: 'center'` centres the inner sheet card under
          // its `maxWidth: 540`, so on iPad the sheet reads as a
          // phone-shape surface instead of spanning the entire
          // tablet canvas. On phones the maxWidth is wider than the
          // window so this is a no-op for the existing layout.
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}
          pointerEvents="box-none"
          onLayout={handleModalLayout}
        >
          <Animated.View
            style={{
              width: "100%",
              maxWidth: 540,
              backgroundColor: surfaceColor ?? AppColors.basicWhite,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              // Plain 14pt top padding. With statusBarTranslucent OFF on
              // Android, the Modal sits below the system chrome on its
              // own, so we don't need to push the content down ourselves
              // any more.
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
                backgroundColor: "rgba(38,59,51,0.18)",
                marginBottom: 18,
              }}
            />

            {dismissible ? (
              <TouchableOpacity
                onPress={() => canDismiss && onDismiss()}
                disabled={!canDismiss}
                activeOpacity={0.6}
                style={{
                  position: "absolute",
                  // Plain 22pt offset — paired with the 14pt paddingTop
                  // above. No Android special-case since the Modal sits
                  // below the status bar now (statusBarTranslucent off).
                  top: 22,
                  right: 18,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(38,59,51,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 4,
                }}
              >
                <Svg width={14} height={14} viewBox="0 0 16 16">
                  <Path
                    d="M3 3 L 13 13 M13 3 L 3 13"
                    stroke={AppColors.secondaryDarkGreen}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            ) : null}

            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default SheetShell;

const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

/**
 * Shared style tokens for sheet content (title, body, inputs,
 * buttons, OTP-style code field). Exported so individual sheets
 * can compose them without re-defining the brand surface.
 */
export const sheetUi = {
  sheetTitle: {
    fontFamily: "NunitoSans_800ExtraBold" as const,
    fontSize: 26,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 6,
    paddingRight: 44,
  },
  sheetBody: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    marginBottom: 22,
  },
  inputWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: "NunitoSans_700Bold" as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase" as const,
  },
  input: {
    backgroundColor: "rgba(38,59,51,0.05)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold" as const,
    borderWidth: 1,
    borderColor: "rgba(38,59,51,0.10)",
  },
  inputCode: {
    fontSize: 26,
    letterSpacing: 12,
    textAlign: "center" as const,
    fontFamily: "NunitoSans_800ExtraBold" as const,
    paddingVertical: 16,
  },
  inputHint: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 6,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold" as const,
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  linkBtn: {
    paddingVertical: 10,
    alignItems: "center" as const,
  },
  linkBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold" as const,
    fontSize: 13.5,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
};
