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

const UniversalSlider: React.FC<UniversalSliderProps> = ({
  onSlideComplete,
  text,
  isLoading = false,
  loadingText = "Processing...",
  disabled = false,
  sliderIcon,
  endIcon,
  showEndIcon = true,
  emojiIcon, // <-- new prop
  containerStyle,
  sliderStyle,
  textStyle,
  sliderButtonStyle,
  backgroundColor = AppColors.primaryLightGreen,
  borderColor = AppColors.secondaryDarkGreen,
  sliderButtonColor = AppColors.secondaryDarkGreen,
  textColor = AppColors.basicBlack,
  iconTintColor = AppColors.primaryLightGreen,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSliding, setIsSliding] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor,
      borderColor,
    },
    sliderButton: {
      backgroundColor: sliderButtonColor,
    },
    text: {
      color: textColor,
    },
    loadingContainer: {
      backgroundColor,
      borderColor,
    },
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        // Prevent sliding beyond boundaries
        if (translationX < 0) {
          translateX.setValue(0);
        } else if (translationX > sliderWidth - 60) {
          translateX.setValue(sliderWidth - 60);
        }
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;
    
    if (state === State.END) {
      const threshold = sliderWidth * 0.8; // 80% of the way
      
      if (translationX >= threshold && !disabled) {
        // Slide completed
        Animated.spring(translateX, {
          toValue: sliderWidth - 60,
          useNativeDriver: false,
        }).start(() => {
          onSlideComplete();
          // Reset after completion
          setTimeout(() => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          }, 100);
        });
      } else {
        // Slide back to start
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
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
        <ActivityIndicator size="large" color={sliderButtonColor} />
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
        {/* Background Text */}
        <View style={styles.customSlideTextContainer}>
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
        </View>
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