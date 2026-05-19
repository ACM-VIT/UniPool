import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import styles, { SLIDE_WIDTH } from "./OnboardingScreen.styles";
import AppColors from "../../design_systems/colors";
import VerifiedIllustration from "./VerifiedIllustration";
import { appHref } from "../../navigation/routes";

const { width, height } = Dimensions.get("window");
const ILLUSTRATION_HEIGHT = Math.min(width * 0.78, height * 0.42);

type Slide = {
  key: string;
  background: "dark" | "light";
  illustration?: ImageSourcePropType;
  lottie?: any;
  illustrationStyle?: { width?: number | string; height?: number | string };
  headline: string;
  subhead: string;
  primaryLabel: string;
};

/**
 * Slide order intentionally builds the value story:
 *   1. What is it? — "people on your route"
 *   2. Why use it? — "fair, posted prices"
 *   3. Why trust it? — "verified, every trip"
 *
 * Copy avoids "drivers" (UniPool is peer-to-peer — passengers
 * matching other passengers who happen to be driving) and stays
 * grounded in concrete user actions: post, browse, book.
 */
const SLIDES: Slide[] = [
  {
    key: "match",
    background: "dark",
    illustration: require("../../assets/Beep Beep Motorcycle.png"),
    illustrationStyle: { width: width * 0.78, height: ILLUSTRATION_HEIGHT },
    headline: "Going the same way?",
    subhead: "Find people taking your route, daily commute or one-off trip.",
    primaryLabel: "Next",
  },
  {
    key: "fair",
    background: "dark",
    illustration: require("../../assets/ramp.png"),
    illustrationStyle: { width: width * 0.86, height: ILLUSTRATION_HEIGHT },
    headline: "Pay your share.",
    subhead: "The per-seat price is posted before you book. No surprises, no surge.",
    primaryLabel: "Next",
  },
  {
    // NOTE: The only animated "sunglasses" asset in the repo is the static
    // `cool-emoji.png`. `bookings.json` is the sad-face Lottie used in the
    // empty BookingScreen — it visually contradicts "Verified, every
    // trip." If a dedicated sunglasses Lottie ships into assets/, swap
    // `illustration` for `lottie: require('../../assets/<file>.json')`
    // and drop the bobbing animation below.
    key: "trust",
    background: "light",
    illustration: require("../../assets/cool-emoji.png"),
    illustrationStyle: { width: width * 0.5, height: width * 0.5 },
    headline: "Verified, every trip.",
    // No ratings feature ships today, so the subhead can't promise
    // one. Anchor instead on the actual verification surface area:
    // real names from sign-up, real students at the same university.
    subhead: "Real names, real students, sharing the route with you.",
    primaryLabel: "Get started",
  },
];

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const currentSlide = SLIDES[index];

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
        if (i !== index) setIndex(i);
      },
    }
  );

  const finishOnboarding = useCallback(
    async (target: "HomeScreen" | "AuthScreen") => {
      try {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
      } catch {}
      router.replace(appHref(target));
    },
    [router]
  );

  const goNext = useCallback(async () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * SLIDE_WIDTH, animated: true });
      return;
    }
    // Final CTA — drop the user into the app as a guest. They can
    // sign in later when they hit a gated action.
    finishOnboarding("HomeScreen");
  }, [index, finishOnboarding]);

  const skip = useCallback(async () => {
    finishOnboarding("HomeScreen");
  }, [finishOnboarding]);

  const signIn = useCallback(async () => {
    finishOnboarding("AuthScreen");
  }, [finishOnboarding]);

  const isLight = currentSlide.background === "light";

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isLight ? AppColors.basicWhite : AppColors.secondaryDarkGreen },
      ]}
    >
      <StatusBar
        barStyle={isLight ? "dark-content" : "light-content"}
        backgroundColor={isLight ? AppColors.basicWhite : AppColors.secondaryDarkGreen}
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {SLIDES.map((slide) => {
          const slideIsLight = slide.background === "light";
          return (
            <View
              key={slide.key}
              style={[styles.slide, slideIsLight && styles.slideLight]}
            >
              <View style={styles.illustration}>
                {slide.lottie ? (
                  <View style={{ overflow: "hidden", borderRadius: 24 }}>
                    <LottieView
                      source={slide.lottie}
                      autoPlay
                      loop
                      resizeMode="contain"
                      style={slide.illustrationStyle as any}
                    />
                    {/* Cover the Lottielab free-tier watermark stamped in the
                        bottom-right of the artboard. */}
                    <View
                      style={{
                        position: "absolute",
                        right: 8,
                        bottom: 8,
                        width: 92,
                        height: 22,
                        backgroundColor: AppColors.basicWhite,
                      }}
                      pointerEvents="none"
                    />
                  </View>
                ) : slide.key === "trust" ? (
                  // Static SVG hero — the slide is a declarative
                  // promise ("Verified, every trip"), not a playful
                  // moment, so motion would undersell it.
                  <VerifiedIllustration size={width * 0.62} />
                ) : (
                  <Image
                    source={slide.illustration!}
                    style={slide.illustrationStyle as any}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.textBlock}>
                <Text style={[styles.headline, slideIsLight && styles.headlineDark]}>
                  {slide.headline}
                </Text>
                <Text style={[styles.subhead, slideIsLight && styles.subheadDark]}>
                  {slide.subhead}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={[styles.wordmark, isLight && { color: AppColors.secondaryDarkGreen }]}>
          Uni
          <Text
            style={[
              styles.wordmarkPool,
              isLight && { color: AppColors.primaryLightGreen },
            ]}
          >
            Pool
          </Text>
        </Text>
        <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.6}>
          <Text
            style={[
              styles.skipText,
              isLight && { color: AppColors.secondaryDarkGreen, opacity: 0.6 },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SLIDE_WIDTH,
              i * SLIDE_WIDTH,
              (i + 1) * SLIDE_WIDTH,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            const bg = isLight ? AppColors.secondaryDarkGreen : AppColors.primaryLightGreen;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity, backgroundColor: bg },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={goNext}
        >
          <Text style={styles.primaryBtnText}>{currentSlide.primaryLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={signIn}
        >
          <Text
            style={[
              styles.secondaryBtnText,
              isLight && styles.secondaryBtnTextDark,
            ]}
          >
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen;
