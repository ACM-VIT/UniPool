import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import LottieView from "lottie-react-native";
import { Home, X } from "lucide-react-native";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";
import PressableScale from "../PressableScale";
import { haptic } from "../haptics";

export interface ErrorComponentProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  onGoHome?: () => void;
  onClose?: () => void;
  animationSize?: "small" | "medium" | "large";
  customAnimation?: any;
}

const { width: rawWidth, height: rawHeight } = Dimensions.get("window");
// Tablet branch only: phones keep their real window dimensions so the
// `width * 0.NN` / `height * 0.NN` sizing math scales naturally across
// iPhone SE → 16 Pro Max. On tablets we substitute an iPhone 14/15
// reference (390 × 844) so the error sheet's title, illustration, and
// CTA don't inflate ~2.6× on a 1032pt iPad.
const isTablet = rawWidth >= 768;
const width = isTablet ? 390 : rawWidth;
const height = isTablet ? 844 : rawHeight;

const ErrorComponent: React.FC<ErrorComponentProps> = ({
  title = "Uh Oh!",
  message = "Something seems to have gone wrong. Our developers are working on it.",
  showHomeButton = false,
  onGoHome,
  onClose,
  animationSize = "medium",
  customAnimation,
}) => {
  const colors = useThemeColors();
  const translateY = React.useRef(new Animated.Value(height)).current;
  const gestureTranslateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // The sheet only appears when something failed — confirm that with
    // a single error haptic as it slides up.
    haptic("error");
    Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  // Compute the desired width/height for the Lottie container
  const { width: animW, height: animH } = React.useMemo(() => {
    const base = Math.min(width, height) * 0.6;
    let w = base, h = base;
    if (animationSize === "small") {
      w = base * 0.75; h = base * 0.75;
    } else if (animationSize === "large") {
      w = base * 1.4; h = base * 1.4;
    }
    return { width: w, height: h };
  }, [animationSize]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: gestureTranslateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = e.nativeEvent;
      if (translationY > 100 || velocityY > 500) {
        Animated.timing(translateY, {
          toValue: height,
          duration: 300,
          useNativeDriver: false,
        }).start(() => onClose && onClose());
      } else {
        Animated.spring(gestureTranslateY, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  const animationSource = customAnimation || require("../../assets/error_anim.json");

  const overlayStyle = {
    position: "absolute" as const,
    bottom: animH * 0.1,
    right: animW * 0.01,
    width: animW * 0.27,
    height: animH * 0.1,
    // Cover for the Lottie watermark — must match the sheet surface.
    // In dark mode override to surfaceElevated; light mode uses the
    // module-scope `content.backgroundColor` (lime) unchanged.
    ...(colors.mode === "dark" ? { backgroundColor: colors.surfaceElevated } : {}),
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          colors.mode === "dark" && { backgroundColor: colors.surfaceElevated },
          { transform: [{ translateY: Animated.add(translateY, gestureTranslateY) }] },
        ]}
      >
        <PressableScale
          style={[styles.closeButton, { backgroundColor: colors.navFill }]}
          onPress={onClose}
          haptic={null}
        >
          <X
            size={Math.min(width, height) * 0.06}
            color={colors.navIconInactive}
          />
        </PressableScale>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={styles.dragHandleArea}>
            <View style={[styles.dragHandle, { backgroundColor: colors.inkLine }]} />
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>

        <View style={styles.animationContainer}>
          <View style={[styles.animationWrapper, { width: animW, height: animH }]}>
            <LottieView
              source={animationSource}
              autoPlay
              loop
              style={styles.animation}
              resizeMode="contain"
            />
            <View style={overlayStyle} />
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={[styles.message, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>{message}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          {showHomeButton && onGoHome && (
            <PressableScale
              style={[
                styles.homeButton,
                { backgroundColor: colors.mode === "dark" ? colors.primary : colors.textPrimary },
              ]}
              onPress={onGoHome}
              haptic="medium"
            >
              <Home
                size={Math.min(width, height) * 0.05}
                color={colors.mode === "dark" ? colors.textOnAccent : colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={[styles.homeButtonText, { color: colors.mode === "dark" ? colors.textOnAccent : colors.primary }]}>Go Home</Text>
            </PressableScale>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "flex-end",
    // Centre the inner card on iPad so the sheet is phone-shape and
    // not stretched across 1032pt of canvas. On phone this is a
    // no-op because the card's maxWidth (440pt) is wider than the
    // window. The dim backdrop still spans the full screen.
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    // Phone-shape envelope. iPad gets a 440pt card centred against
    // the backdrop; iPhones stay full-width since their window is
    // ≤430pt.
    width: "100%",
    maxWidth: 440,
    // Lime brand sheet — the error sheet sits in the same surface
    // family as Auth, SignUp, LocationPermission. Forest content
    // (title/message/CTA) reads strongly on lime.
    backgroundColor: AppColors.primaryLightGreen,
    borderTopLeftRadius: Math.min(width, height) * 0.08,
    borderTopRightRadius: Math.min(width, height) * 0.08,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.015,
    paddingBottom: height * 0.12,
    maxHeight: height * 0.75,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.22,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandle: {
    width: Math.min(width, height) * 0.15,
    height: height * 0.008,
    // Base color only; override inline with colors.inkLine at render.
    backgroundColor: "rgba(38,59,51,0.30)",
    borderRadius: 3,
    alignSelf: "center",
    opacity: 0.3,
  },
  dragHandleArea: {
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.1,
    alignItems: "center",
    marginBottom: height * 0.008,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: height * 0.02,
  },
  title: {
    fontSize: Math.min(width, height) * 0.07,
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
    fontFamily: "Trap-Bold",
  },
  animationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.03,
  },
  animationWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: height * 0.04,
    paddingHorizontal: width * 0.02,
  },
  message: {
    fontSize: Math.min(width, height) * 0.035,
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
    lineHeight: Math.min(width, height) * 0.045,
    opacity: 0.8,
    fontFamily: "NunitoSans_400Regular",
  },
  closeButton: {
    position: "absolute",
    top: height * 0.02,
    right: width * 0.04,
    zIndex: 10,
    width: Math.min(width, height) * 0.08,
    height: Math.min(width, height) * 0.08,
    borderRadius: Math.min(width, height) * 0.04,
    // Forest dot close — sits on the lime sheet like a stop-button.
    backgroundColor: AppColors.secondaryDarkGreen,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  homeButton: {
    // Forest CTA on the lime sheet — same button system as Home,
    // SignUp, LocationPermission.
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.08,
    borderRadius: 14,
    minWidth: width * 0.75,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  homeButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: Math.min(width, height) * 0.04,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },
  buttonIcon: {
    marginRight: width * 0.02,
  },
});

export default ErrorComponent;
