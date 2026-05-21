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
  /**
   * Keep the thumb pinned at the end of the track after a successful
   * slide, instead of auto-springing it back to the left after 100ms.
   * Caller is then responsible for either dismounting the slider or
   * resetting the parent state — useful for sliders whose
   * `onSlideComplete` kicks off an async action (accept/reject
   * passenger, etc.) and the slider should LOOK "armed" while the
   * action is in flight.
   */
  holdAtEnd?: boolean;
}

export type SlideToCreateProps = UniversalSliderProps;
