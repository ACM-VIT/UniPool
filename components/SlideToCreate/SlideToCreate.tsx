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
  // Light-mode defaults match the historical brand pairing (lime track,
  // forest thumb, black text). The hook below re-paints these only
  // when the consumer hasn't passed an explicit override AND we're in
  // dark mode — so callers that intentionally style the slider (e.g.
  // the secondary "decline" sliders) still win.
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

  // Theme-aware defaults — only used when the caller doesn't pass
  // an explicit prop.
  //
  // Light mode: historical brand pairing — lime track, forest thumb,
  // forest text. The slider IS the brand action moment.
  //
  // Dark mode: lime track shouts against the charcoal canvas and
  // pulls the eye away from everything else on screen, which is
  // the opposite of the calm dark palette we're going for. Switch
  // the defaults to a raised-charcoal track (navFill) with the lime
  // surfacing only on the thumb + thumb glyph — same Spotify-green-
  // on-dark-grey pattern the rest of the dark palette uses for
  // brand splashes.
  const isDark = colors.mode === "dark";
  const resolvedBg =
    backgroundColor ?? (isDark ? colors.navFill : AppColors.primaryLightGreen);
  // Light mode: keep the historical forest border (= textPrimary).
  // Dark mode: the bright cream border read as a "white box" framing
  // the slider — switch to a subtle hairline that's barely there so
  // the track blends with the canvas.
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
        
        // Prevent sliding beyond boundaries
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
        // Slide completed
        Animated.spring(translateX, {
          toValue: maxTranslation,
          useNativeDriver: false,
        }).start(() => {
          onSlideComplete();
          // Auto-snap-back UNLESS the caller asked us to hold the
          // thumb at the end. Holding is the right call when
          // `onSlideComplete` is async and the slider should LOOK
          // armed until the parent dismisses it — without holdAtEnd
          // the thumb would zip back to the left mid-API-call, which
          // looks broken.
          if (holdAtEnd) {
            // Bring the text opacity back to 1 even though the thumb
            // stays pinned right. During the drag we fade text to 0
            // (so "Slide to accept user" doesn't fight the thumb);
            // without this reset, the parent's loading message
            // ("Accepting...", "Rejecting...", "Removing...") would
            // be invisible — the slider would just look blank with
            // the thumb sitting at the end. The text container is
            // positioned in the middle of the track and the thumb at
            // maxTranslation only overlaps it by ~2pt, so the
            // centered loading copy reads cleanly.
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
        {/* Background Text with Animated Opacity */}
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