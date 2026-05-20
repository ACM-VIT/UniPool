import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import styles, { SLIDE_WIDTH, HERO_SIZE } from "./OnboardingScreen.styles";
import AppColors from "../../design_systems/colors";
import { appHref } from "../../navigation/routes";
import {
  RouteHero,
  FairPriceHero,
  CampusVerifiedHero,
} from "./illustrations";

type Slide = {
  key: string;
  Hero: React.FC<{ size: number }>;
  eyebrow: string;
  headline: string;
  subhead: string;
};

/**
 * Onboarding panels. Three is the right number — enough to tell a
 * value story (what / how / why), short enough that users will
 * actually swipe through. Copy is concrete and only claims things we
 * actually ship today (verified email domain, posted per-seat fares,
 * UPI deeplink at trip end). No "drivers", because UniPool is
 * peer-to-peer: students offering seats to other students.
 *
 * Each slide shares the forest dark surface so the status bar never
 * flips and the pagination feels like one continuous canvas.
 */
const SLIDES: Slide[] = [
  {
    key: "match",
    Hero: RouteHero,
    eyebrow: "FIND",
    headline: "Going your way.",
    subhead:
      "Match with students heading the same direction. Campus commutes, airport runs, weekend trips home.",
  },
  {
    key: "fair",
    Hero: FairPriceHero,
    eyebrow: "PAY",
    headline: "Fair price. Split clean.",
    subhead:
      "Per-seat fare is posted up front. Settle directly with your host over UPI when the trip ends.",
  },
  {
    key: "trust",
    Hero: CampusVerifiedHero,
    eyebrow: "TRUST",
    headline: "Built for your campus.",
    subhead:
      "Verified student emails only. You see who's hosting and which institute they're from before you book.",
  },
];

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
        if (i !== index) setIndex(i);
      },
    },
  );

  const finishOnboarding = useCallback(
    async (target: "HomeScreen" | "AuthScreen") => {
      try {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
      } catch {}
      router.replace(appHref(target));
    },
    [router],
  );

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (index + 1) * SLIDE_WIDTH,
        animated: true,
      });
      return;
    }
    // Fallback only — the last slide actually renders a dual-button
    // row (Sign up / Sign in) instead of a single Continue, so this
    // path mostly catches the "user scrolled past the last slide on
    // the next-button-less Android back" edge case.
    finishOnboarding("AuthScreen");
  }, [index, finishOnboarding]);

  const skip = useCallback(() => {
    finishOnboarding("HomeScreen");
  }, [finishOnboarding]);

  const isLastSlide = index === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={AppColors.secondaryDarkGreen}
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
        {SLIDES.map((slide, i) => {
          // Two scroll-driven transforms per slide. As the slide
          // approaches centre it scales 0.86 → 1, fades 0.4 → 1 and
          // the hero floats up slightly. As it leaves, the reverse.
          // Subtle — same vibe as Robinhood / Revolut onboardings.
          const inputRange = [
            (i - 1) * SLIDE_WIDTH,
            i * SLIDE_WIDTH,
            (i + 1) * SLIDE_WIDTH,
          ];
          const heroScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.86, 1, 0.86],
            extrapolate: "clamp",
          });
          const heroOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: "clamp",
          });
          const heroTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [12, 0, 12],
            extrapolate: "clamp",
          });
          const textTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [24, 0, 24],
            extrapolate: "clamp",
          });
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });

          const Hero = slide.Hero;

          return (
            <View key={slide.key} style={styles.slide}>
              <Animated.View
                style={[
                  styles.heroWrap,
                  {
                    opacity: heroOpacity,
                    transform: [
                      { scale: heroScale },
                      { translateY: heroTranslateY },
                    ],
                  },
                ]}
              >
                <Hero size={HERO_SIZE} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.textBlock,
                  {
                    opacity: textOpacity,
                    transform: [{ translateY: textTranslateY }],
                  },
                ]}
              >
                <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.headline}>{slide.headline}</Text>
                <Text style={styles.subhead}>{slide.subhead}</Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* Top chrome — wordmark left, Skip right. Skip stays muted so
          it doesn't compete with the swipe-forward CTA below. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={styles.wordmark}>UniPool</Text>
        <TouchableOpacity
          onPress={skip}
          style={styles.skipBtn}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom chrome — page indicator that morphs the active dot
          into a wide lime pill, primary CTA matching the home
          sheet's Post-a-ride button, and a quiet sign-in link. */}
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
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.32, 1, 0.32],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>

        {/* Slides 1-2: single "Continue" CTA that advances the
            carousel. Slide 3: dual-button row — primary "Sign up"
            (lime fill) + outlined "Sign in" — mirrors the
            Robinhood / BlaBlaCar welcome-screen pattern. Both
            routes drop into the auth flow with the appropriate
            mode; AuthScreen handles new vs returning. */}
        {isLastSlide ? (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.ctaHalf]}
              activeOpacity={0.85}
              onPress={() => finishOnboarding("AuthScreen")}
            >
              <Text style={styles.primaryBtnText}>Sign up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, styles.ctaHalf]}
              activeOpacity={0.8}
              onPress={() => finishOnboarding("AuthScreen")}
            >
              <Text style={styles.outlineBtnText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={goNext}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default OnboardingScreen;
