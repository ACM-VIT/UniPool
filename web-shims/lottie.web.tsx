// Web alias for "lottie-react-native".
//
// The library's own web build depends on @lottiefiles/dotlottie-react,
// which is not installed and pulls in a heavier wasm player. The app
// only uses LottieView for a few JSON animations (loaders, the auth
// artboard, error illustrations) with source/autoPlay/loop/style. We
// render those with lottie-web, which plays a JSON animationData object
// directly. colorFilters and resizeMode are accepted and ignored; they
// do not affect these particular animations on web.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import lottie, { AnimationItem } from "lottie-web";

type LottieSource = string | number | Record<string, unknown>;

type LottieViewProps = {
  source: LottieSource;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  // Accepted for parity with the native component; not used on web.
  colorFilters?: unknown;
  resizeMode?: string;
};

export type LottieRef = {
  play: () => void;
  pause: () => void;
  reset: () => void;
};

const LottieView = forwardRef<LottieRef, LottieViewProps>(function LottieView(
  { source, autoPlay = false, loop = false, speed, style },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const isUrl = typeof source === "string";
    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop,
      autoplay: autoPlay,
      animationData: isUrl ? undefined : (source as object),
      path: isUrl ? (source as string) : undefined,
    });
    if (speed) animation.setSpeed(speed);
    animationRef.current = animation;
    return () => {
      animation.destroy();
      animationRef.current = null;
    };
    // Re-create only when the animation source changes.
  }, [source, loop, autoPlay, speed]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => animationRef.current?.play(),
      pause: () => animationRef.current?.pause(),
      reset: () => animationRef.current?.goToAndStop(0, true),
    }),
    [],
  );

  return (
    <View style={style}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </View>
  );
});

export default LottieView;
