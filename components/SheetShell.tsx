import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { haptic } from "./PressableScale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onDismiss: () => void;
  busy?: boolean;
  /** When false, suppresses the close X and backdrop dismissal so
   *  the user can only finish via in-content buttons. */
  dismissible?: boolean;
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
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      haptic("selection");
      content.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(160),
          Animated.spring(content, {
            toValue: 1,
            damping: 18,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(content, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const settleStyle = {
    opacity: content,
    transform: [
      {
        translateY: content.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  const canDismiss = dismissible && !busy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ ...fill, justifyContent: "flex-end" }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            backgroundColor: AppColors.basicWhite,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            transform: [{ translateY }],
            shadowColor: AppColors.basicBlack,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.22,
            shadowRadius: 28,
            elevation: 18,
            // Cap the sheet so it never extends behind the (translucent)
            // status bar when the keyboard forces it tall on Android.
            // Without this the title row got clipped under the system
            // chrome on smaller / shorter Android screens.
            maxHeight: SCREEN_HEIGHT - insets.top - 8,
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

          <Animated.View style={settleStyle}>{children}</Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
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
