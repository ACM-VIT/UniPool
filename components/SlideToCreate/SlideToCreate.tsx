import React from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
} from "react-native";
import Slider from "react-native-slide-to-unlock";
import { SlideToCreateProps } from "./SlideToCreate.types";
import styles from "./SlideToCreate.styles";
import AppColors from "../../design_systems/colors";

const SlideToCreate: React.FC<SlideToCreateProps> = ({
  onSlideComplete,
  isLoading = false,
  text = "Slide to create ride",
  loadingText = "Creating ride...",
  disabled = false,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.secondaryDarkGreen} />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.slideContainer}>
      <Slider
        childrenContainer={{
          backgroundColor: AppColors.basicBlack,
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
        containerStyle={styles.sliderContainer}
        sliderElement={
          <View style={styles.sliderButton}>
            <Image 
              source={require("../../assets/arrow-square-left.png")} 
              style={styles.slideIcon} 
            />
          </View>
        }
      >
        <View style={styles.slideTextContainer}>
          <Text style={styles.slideText}>{text}</Text>
          <Image 
            source={require("../../assets/smiling-emoji.png")} 
            style={styles.emojiIcon} 
          />
        </View>
      </Slider>
    </View>
  );
};

export default SlideToCreate;
