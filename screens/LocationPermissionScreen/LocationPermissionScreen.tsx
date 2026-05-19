import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Dimensions, StatusBar } from "react-native";
import * as Location from "expo-location";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useRouter } from "expo-router";
import styles from "./LocationPermissionScreen.styles";
import AppColors from "../../design_systems/colors";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import type { AppRouteTarget } from "../../navigation/routes";

const { width, height } = Dimensions.get("window");
const VISUAL = Math.min(width * 0.75, height * 0.38);

const Pulse: React.FC<{ size: number }> = ({ size }) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.stagger(900, [
        Animated.timing(pulse1, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drop, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(drop, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const r1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [size * 0.15, size * 0.48] });
  const op1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const r2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [size * 0.15, size * 0.48] });
  const op2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const dropY = drop.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  const dropOp = drop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} viewBox="0 0 320 320" fill="none">
          <Defs>
            <LinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={AppColors.primaryLightGreen} stopOpacity="0.10" />
              <Stop offset="1" stopColor={AppColors.primaryLightGreen} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          <Circle cx="160" cy="160" r="150" fill="url(#mapBg)" />
          <Path d="M30 200 Q 160 140, 290 200" stroke={AppColors.secondaryDarkGreen} strokeOpacity="0.12" strokeWidth="2" fill="none" />
          <Path d="M40 240 Q 160 180, 280 240" stroke={AppColors.secondaryDarkGreen} strokeOpacity="0.10" strokeWidth="2" fill="none" />
          <Path d="M40 100 L 280 100" stroke={AppColors.secondaryDarkGreen} strokeOpacity="0.06" strokeWidth="2" strokeDasharray="6 6" fill="none" />
          <Path d="M40 130 L 280 130" stroke={AppColors.secondaryDarkGreen} strokeOpacity="0.06" strokeWidth="2" strokeDasharray="6 6" fill="none" />
        </Svg>
      </View>
      <Animated.View
        style={{
          position: "absolute",
          width: r1,
          height: r1,
          borderRadius: 999,
          backgroundColor: AppColors.primaryLightGreen,
          opacity: op1,
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: r2,
          height: r2,
          borderRadius: 999,
          backgroundColor: AppColors.primaryLightGreen,
          opacity: op2,
        }}
      />
      <Animated.View
        style={{
          transform: [{ translateY: dropY }],
          opacity: dropOp,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size * 0.34} height={size * 0.34} viewBox="0 0 80 100" fill="none">
          <Path
            d="M40 4 C 60 4, 76 20, 76 40 C 76 64, 40 96, 40 96 C 40 96, 4 64, 4 40 C 4 20, 20 4, 40 4 Z"
            fill={AppColors.secondaryDarkGreen}
          />
          <Circle cx="40" cy="38" r="14" fill={AppColors.primaryLightGreen} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const LocationPermissionScreen: React.FC = () => {
  const router = useRouter();
  const routeParams = useDecodedLocalSearchParams<{ returnTo?: AppRouteTarget }>();
  const returnTo = routeParams.returnTo;
  const goHome = () => {
    if (returnTo) {
      router.replace(targetHref(returnTo));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const handleAllow = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {}
    goHome();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLightGreen} />
      <View style={styles.visualContainer}>
        <Pulse size={VISUAL} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.headline}>Find rides{"\n"}near you.</Text>
        <Text style={styles.subhead}>
          We use your location to match you with carpools on your route, and to show drivers where to pick you up.
        </Text>
        <View style={styles.bullets}>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Only used while you're using UniPool.</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Hidden from other riders until you book.</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleAllow}>
        <Text style={styles.primaryBtnText}>Allow location</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={goHome}>
        <Text style={styles.secondaryBtnText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LocationPermissionScreen;
