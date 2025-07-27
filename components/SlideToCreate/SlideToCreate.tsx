import React from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
} from "react-native";
import Slider from "react-native-slide-to-unlock";
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
  console.log('SlideToCreate text prop:', text);
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
      <Slider
        childrenContainer={{
          backgroundColor: AppColors.primaryLightGreen,
          borderRadius: 15,
          height: 60,
        }}
        onSlideStart={() => {
          // Optional: Handle slide start
        }}
        onSlideEnd={() => {
          // Optional: Handle slide end
        }}
        onEndReached={() => {
          if (!disabled) {
            onSlideComplete();
          }
        }}
        containerStyle={[
          styles.sliderContainer,
          dynamicStyles.container,
          sliderStyle
        ]}
        sliderElement={
          <Image
            source={sliderIcon}
            style={styles.sliderButtonImage}
          />
        }
      >
        <View style={styles.slideTextContainer}>
          <Text style={[
            styles.slideText,
            { color: '#222', textShadowColor: '#fff', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
            textStyle
          ]}>
            {text}
          </Text>
          {showEndIcon && endIcon && (
            <Image
              source={endIcon}
              style={styles.endIcon}
            />
          )}
        </View>
      </Slider>
    </View>
  );
};

export default UniversalSlider;