import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import LottieView from "lottie-react-native";
import { Home, X } from "lucide-react-native";
import AppColors from "../../design_systems/colors";

export interface ErrorComponentProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  onGoHome?: () => void;
  onClose?: () => void;
  animationSize?: "small" | "medium" | "large";
  customAnimation?: any;
}

const { width, height } = Dimensions.get("window");

const ErrorComponent: React.FC<ErrorComponentProps> = ({
  title = "Uh Oh!",
  message = "Something seems to have gone wrong. Our developers are working on it.",
  showHomeButton = false,
  onGoHome,
  onClose,
  animationSize = "medium",
  customAnimation,
}) => {
  const translateY = React.useRef(new Animated.Value(height)).current;
  const gestureTranslateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
    backgroundColor: AppColors.basicWhite,
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateY: Animated.add(translateY, gestureTranslateY) }] },
        ]}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X
            size={Math.min(width, height) * 0.06}
            color={AppColors.secondaryDarkGreen}
          />
        </TouchableOpacity>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
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
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          {showHomeButton && onGoHome && (
            <TouchableOpacity style={styles.homeButton} onPress={onGoHome}>
              <Home
                size={Math.min(width, height) * 0.05}
                color={AppColors.basicWhite}
                style={styles.buttonIcon}
              />
              <Text style={styles.homeButtonText}>Go Home</Text>
            </TouchableOpacity>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    backgroundColor: AppColors.basicWhite,
    borderTopLeftRadius: Math.min(width, height) * 0.08,
    borderTopRightRadius: Math.min(width, height) * 0.08,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.015,
    paddingBottom: height * 0.12,
    maxHeight: height * 0.75,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandle: {
    width: Math.min(width, height) * 0.15,
    height: height * 0.008,
    backgroundColor: AppColors.basicBlack,
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
    backgroundColor: AppColors.basicWhite,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  homeButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.08,
    borderRadius: Math.min(width, height) * 0.015,
    minWidth: width * 0.75,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  homeButtonText: {
    color: AppColors.basicWhite,
    fontSize: Math.min(width, height) * 0.04,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
  buttonIcon: {
    marginRight: width * 0.02,
  },
});

export default ErrorComponent;
