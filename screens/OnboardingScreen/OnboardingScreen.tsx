import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import AsyncStorage from "../../utils/safeAsyncStorage";
import PressableScale from "../../components/PressableScale";
import { haptic } from "../../components/haptics";
import { useRouter } from "expo-router";
import styles, { SLIDE_WIDTH, HERO_SIZE } from "./OnboardingScreen.styles";
import { useThemeColors } from "../../contexts/ThemeContext";
import { appHref } from "../../navigation/routes";
import { shouldShowPermissionsPrompt } from "../../utils/permissionsPrompt";
import { useTabletContentStyle } from "../../utils/responsive";
import {
  RouteHero,
  FairPriceHero,
  CampusVerifiedHero,
} from "./illustrations";

type Slide = {
  key: string;
  Hero: React.FC<{ size: number }>;
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
    headline: "Going your way.",
    subhead: "Match with students heading the same direction.",
  },
  {
    key: "fair",
    Hero: FairPriceHero,
    headline: "Fair price. Split clean.",
    subhead: "Per-seat fare up front. Settle over UPI.",
  },
  {
    key: "trust",
    Hero: CampusVerifiedHero,
    headline: "Built for your campus.",
    subhead: "Verified student emails. Know who you're riding with.",
  },
];

const OnboardingScreen: React.FC = () => {
  const { replace } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const colors = useThemeColors();
  // Animated.ScrollView is required for native-driver scroll events on Fabric.
  const scrollRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // JS-thread mirror of the scroll offset, used solely by the page
  // indicator. The dots animate `width`, which the native animated
  // module can't drive — so they read from this non-native value while
  // `scrollX` stays on the native driver for the hero parallax above.
  const scrollXDots = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        scrollXDots.setValue(x);
        const i = Math.round(x / SLIDE_WIDTH);
        if (i !== index) setIndex(i);
      },
    },
  );

  const finishOnboarding = useCallback(
    async (target: "HomeScreen" | "AuthScreen") => {
      // Onboarding cleared — a small "you're in" confirmation as we hand off.
      haptic("success");
      try {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
      } catch {}

      // Route first-launch home entry through the combined permissions sheet
      // when the prompt has not been cleared yet.
      let needsPermissionsStep = false;
      if (target === "HomeScreen") {
        try {
          needsPermissionsStep = await shouldShowPermissionsPrompt();
        } catch {
          needsPermissionsStep = true;
        }
      }

      if (needsPermissionsStep) {
        replace(
          appHref("LocationPermissionScreen", {
            returnTo: { screen: target },
          } as any) as any,
        );
        return;
      }
      replace(appHref(target));
    },
    [replace],
  );

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (index + 1) * SLIDE_WIDTH,
        animated: true,
      });
      return;
    }
    // Keep onboarding guest-first; auth appears later at gated actions.
    finishOnboarding("HomeScreen");
  }, [index, finishOnboarding]);

  const skip = useCallback(() => {
    finishOnboarding("HomeScreen");
  }, [finishOnboarding]);

  const isLastSlide = index === SLIDES.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.navFill }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.navFill}
      />

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {SLIDES.map((slide, i) => {
          // Scroll-driven scale, opacity, and lift for the active slide.
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
                <Text style={[styles.headline, { color: colors.textOnDark }]}>{slide.headline}</Text>
                <Text style={[styles.subhead, { color: colors.textOnDark }]}>{slide.subhead}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Top chrome — wordmark left, Skip right. Skip stays muted so
          it doesn't compete with the swipe-forward CTA below. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={[styles.wordmark, { color: colors.primary }]}>UniPool</Text>
        <PressableScale
          onPress={skip}
          style={styles.skipBtn}
          hitSlop={8}
          haptic={null}
        >
          <Text style={[styles.skipText, { color: colors.textOnDark }]}>Skip</Text>
        </PressableScale>
      </View>

      {/* Bottom chrome — page indicator that morphs the active dot
          into a wide lime pill, primary CTA matching the home
          sheet's Post-a-ride button, and a quiet sign-in link. */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, i) => {
            const inputRange = [
              (i - 1) * SLIDE_WIDTH,
              i * SLIDE_WIDTH,
              (i + 1) * SLIDE_WIDTH,
            ];
            const dotWidth = scrollXDots.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollXDots.interpolate({
              inputRange,
              outputRange: [0.32, 1, 0.32],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={slide.key}
                style={[
                  styles.dot,
                  { backgroundColor: colors.primary, width: dotWidth, opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>

        {/* Single primary CTA across every slide. Slides 1-2 advance
            the carousel; the last slide hands off to the auth flow
            (Apple / Google handle new vs returning automatically,
            so we don't surface that decision in the UI). Action-led
            label across the board matches the pattern used by
            Endel, Emma, Craft, Elevate, IRL, Babbel, etc. on their
            final onboarding screens. */}
        <PressableScale
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={goNext}
        >
          <Text style={[styles.primaryBtnText, { color: colors.textOnAccent }]}>
            {isLastSlide ? "Get started" : "Continue"}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
};

export default OnboardingScreen;
