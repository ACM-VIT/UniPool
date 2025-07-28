import { ImageSourcePropType, TextStyle, ViewStyle } from 'react-native';

export interface UniversalSliderProps {
  onSlideComplete: () => void;
  text: string;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  
  sliderIcon: ImageSourcePropType;
  endIcon?: ImageSourcePropType;
  showEndIcon?: boolean;
  emojiIcon?: ImageSourcePropType;
  
  containerStyle?: ViewStyle;
  sliderStyle?: ViewStyle;
  textStyle?: TextStyle;
  sliderButtonStyle?: ViewStyle;
  
  backgroundColor?: string;
  borderColor?: string;
  sliderButtonColor?: string;
  textColor?: string;
  iconTintColor?: string;
}