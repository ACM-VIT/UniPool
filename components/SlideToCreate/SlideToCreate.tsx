import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Animated,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { UniversalSliderProps } from "./SlideToCreate.types";
import styles from "./SlideToCreate.styles";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";

const UniversalSlider: React.FC<UniversalSliderProps> = ({
  onSlideComplete,
  text,
  isLoading = false,
  loadingText = "Processing...",
  disabled = false,
  sliderIcon,
  endIcon,
  showEndIcon = true,
  emojiIcon,
  containerStyle,
  sliderStyle,
  textStyle,
  sliderButtonStyle,
  // Default colors mirror the brand action slider; callers can override them.
  backgroundColor,
  borderColor,
  sliderButtonColor,
  textColor,
  iconTintColor,
  holdAtEnd = false,
}) => {
  const colors = useThemeColors();
  const [sliderWidth, setSliderWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [isSliding, setIsSliding] = useState(false);

  // Resolve theme-aware defaults only when the caller has not provided colors.
  const isDark = colors.mode === "dark";
  const resolvedBg =
    backgroundColor ?? (isDark ? colors.navFill : AppColors.primaryLightGreen);
  // Keep dark-mode borders subtle so the track blends with the canvas.
  const resolvedBorder =
    borderColor ?? (isDark ? "rgba(237,236,231,0.10)" : colors.textPrimary);
  const resolvedButton =
    sliderButtonColor ?? (isDark ? colors.primary : colors.textPrimary);
  const resolvedText =
    textColor ?? (isDark ? colors.textPrimary : colors.textOnAccent);
  const resolvedIconTint =
    iconTintColor ?? (isDark ? colors.textOnAccent : colors.primary);

  const dynamicStyles = {
    container: {
      backgroundColor: resolvedBg,
      borderColor: resolvedBorder,
    },
    sliderButton: {
      backgroundColor: resolvedButton,
    },
    text: {
      color: resolvedText,
    },
    loadingContainer: {
      backgroundColor: resolvedBg,
      borderColor: resolvedBorder,
    },
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        const maxTranslation = sliderWidth - 60; // Account for button width (56) + padding (4)
        
        if (translationX < 0) {
          translateX.setValue(0);
        } else if (translationX > maxTranslation) {
          translateX.setValue(maxTranslation);
        }

        const fadeStartPoint = maxTranslation * 0.2;
        const fadeEndPoint = maxTranslation * 0.6;
        
        let opacity = 1;
        if (translationX > fadeStartPoint) {
          const fadeProgress = (translationX - fadeStartPoint) / (fadeEndPoint - fadeStartPoint);
          opacity = Math.max(0, 1 - fadeProgress);
        }
        
        textOpacity.setValue(opacity);
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;
    
    if (state === State.END) {
      const maxTranslation = sliderWidth - 60;
      const threshold = maxTranslation * 0.8; // 80% of the available slide distance
      
      if (translationX >= threshold && !disabled) {
        Animated.spring(translateX, {
          toValue: maxTranslation,
          useNativeDriver: false,
        }).start(() => {
          onSlideComplete();
          // Keep the thumb pinned for async parent flows until loading takes over.
          if (holdAtEnd) {
            // Restore centered copy while the thumb remains at the end.
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }).start();
            return;
          }
          setTimeout(() => {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: false,
              }),
              Animated.timing(textOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              })
            ]).start();
          }, 100);
        });
      } else {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          })
        ]).start();
      }
      setIsSliding(false);
    } else if (state === State.BEGAN) {
      setIsSliding(true);
    }
  };

  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  if (isLoading) {
    return (
      <View style={[
        styles.loadingContainer,
        dynamicStyles.loadingContainer,
        containerStyle
      ]}>
        <ActivityIndicator size="large" color={resolvedButton} accessibilityLabel="Loading" />
        <Text style={[
          styles.loadingText,
          dynamicStyles.text,
          textStyle
        ]}>
          {loadingText}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.slideContainer, containerStyle]}>
      <View 
        style={[
          styles.customSliderContainer,
          dynamicStyles.container,
          sliderStyle
        ]}
        onLayout={onLayout}
      >
        {/* Background text with animated opacity. */}
        <Animated.View 
          style={[
            styles.customSlideTextContainer,
            { opacity: textOpacity }
          ]}
        >
          <Text style={[
            styles.customSlideText,
            dynamicStyles.text,
            textStyle
          ]}>
            {text}
          </Text>
          {emojiIcon && (
            <Image
              source={emojiIcon}
              style={styles.emojiIcon}
            />
          )}
          {showEndIcon && endIcon && (
            <Image
              source={endIcon}
              style={styles.endIcon}
            />
          )}
        </Animated.View>
        
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={!disabled}
        >
          <Animated.View
            style={[
              styles.customSliderButton,
              dynamicStyles.sliderButton,
              sliderButtonStyle,
              {
                transform: [{ translateX }],
              }
            ]}
          >
            <Image
              source={sliderIcon}
              style={styles.customSliderButtonImage}
            />
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

export default UniversalSlider;
