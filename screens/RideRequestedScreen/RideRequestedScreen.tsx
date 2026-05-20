import React, { useEffect, useRef } from "react";
import { Animated, View, Image, Easing } from "react-native";
import { useRouter } from "expo-router";
import styles from "./RideRequestedScreen.styles";
import { appHref } from "../../navigation/routes";

// Confirmation interstitial. Lands with a spring scale + fade-in,
// holds long enough that the user actually registers the moment,
// then fades out into the trips list. Total time on screen:
//   ~180ms entrance + 2400ms hold + 140ms exit fade = ~2.7s.
// Falls comfortably in the 2-3s "this happened" beat.
const HOLD_MS = 2400;
const RideRequestedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const router = useRouter();

  // Entrance: scale + fade. Read as a confident "done!" pulse instead
  // of a slideshow image.
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.setNavBarVariant) props.setNavBarVariant(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 90,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      // Exit fade so the navigation transition doesn't snap.
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        router.navigate(appHref("BookingScreen"));
      });
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant, router]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/request.png")}
        style={[styles.create, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
};

export default RideRequestedScreen;
