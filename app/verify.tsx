import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";
import { appHref } from "../navigation/routes";
import { useApi } from "../utils/ApiUtil";
import { haptic } from "../components/PressableScale";

type Phase = "pending" | "success" | "error";

/**
 * Landing route for the academic-verification magic link
 * (`unipool://verify?t=<token>`). Takes ownership of the whole
 * exchange + acknowledgement so the moment of verification feels
 * deliberate instead of a quiet toast that fired mid-flow.
 *
 * Design notes
 * ────────────
 * Centred lime canvas. Small celebration mark — a lime disc with a
 * forest check stroke and a soft halo — paired with personal
 * "Hi {name}" eyebrow + a confident "You're verified." headline.
 * Institute appears inline beneath the headline as a quiet line
 * (not a pill) so the screen reads as one calm column instead of a
 * stack of separate components. Single `Continue` CTA always lands
 * on Home — the flow can originate from Personal Information or the
 * signup "Complete your profile" step, and Home is the neutral
 * stable surface in either case.
 *
 * Cold-launch and warm-launch both route here because expo-router
 * resolves the URL to this file directly; the old global URL
 * listener has been removed to avoid double-firing.
 */
export default function VerifyDeepLinkRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiUtil, triggerRevalidation } = useApi();
  const params = useLocalSearchParams<{ t?: string; token?: string }>();

  const [phase, setPhase] = useState<Phase>("pending");
  const [user, setUser] = useState<{
    name?: string;
    institute?: { name?: string } | null;
    institute_email?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handledRef = useRef<string | null>(null);

  // Animation drivers. Two springs (mark + check) drive the
  // celebration; the copy/CTA block settles in a beat later.
  const markScale = useRef(new Animated.Value(0.7)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.6)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyTranslate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const token = (params.t || params.token) as string | undefined;
    if (!token) {
      setPhase("error");
      setErrorMessage(
        "This verification link is missing a token. Open the most recent email and tap the button again.",
      );
      return;
    }
    if (handledRef.current === token) return;
    handledRef.current = token;

    (async () => {
      try {
        const resp = await apiUtil.post<
          { status: string; user?: any },
          { token: string }
        >("/user/verify/confirm", { token });

        let nextUser = resp?.user || null;
        if (!nextUser) {
          try {
            const details = await apiUtil.get<{ user: any }>("/user/details");
            nextUser = details?.user || null;
          } catch {
            // Non-fatal — fall through to generic success copy.
          }
        }

        setUser(nextUser);
        triggerRevalidation();
        haptic("success");
        setPhase("success");
      } catch (err: any) {
        haptic("error");
        const message =
          err?.response?.data?.error ||
          "This link expired or was already used. Request a new one from your profile and try again.";
        setErrorMessage(message);
        setPhase("error");
      }
    })();
  }, [params.t, params.token, apiUtil, triggerRevalidation]);

  useEffect(() => {
    if (phase !== "success") return;
    Animated.parallel([
      // Halo — soft outward expansion, fades partway in.
      Animated.timing(haloOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(haloScale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      // Mark — disc scales + fades together.
      Animated.timing(markOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(markScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      // Check — pops after the disc is up.
      Animated.sequence([
        Animated.delay(160),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
      // Copy block — settles a beat after the mark to feel
      // deliberate, not noisy.
      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(copyOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(copyTranslate, {
            toValue: 0,
            friction: 9,
            tension: 90,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [phase]);

  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const instituteName = user?.institute?.name;
  const verifiedEmail = user?.institute_email;

  const goHome = () => router.replace(appHref("HomeScreen") as any);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {phase === "pending" ? (
        <View style={styles.pendingCenter}>
          <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} />
          <Text style={styles.pendingText}>Verifying your link…</Text>
        </View>
      ) : phase === "error" ? (
        <View style={styles.errorCenter}>
          <View style={styles.errorMark}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Path
                d="M7 7 L 17 17 M17 7 L 7 17"
                stroke="#D24432"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <Text style={styles.headline}>Couldn't verify</Text>
          <Text style={styles.bodyText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={goHome}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.successCenter}>
          {/* Mark: soft halo behind a lime disc, forest check inside.
              Two layers ride independent spring timing so the halo
              expands first and the disc + check land on top with a
              confident pop. */}
          <View style={styles.markWrap}>
            <Animated.View
              style={[
                styles.halo,
                {
                  opacity: haloOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.disc,
                { opacity: markOpacity, transform: [{ scale: markScale }] },
              ]}
            >
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5.5 12.5 L 10.5 17.5 L 18.5 7.5"
                    stroke={AppColors.secondaryDarkGreen}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.copy,
              {
                opacity: copyOpacity,
                transform: [{ translateY: copyTranslate }],
              },
            ]}
          >
            {firstName ? (
              <Text style={styles.greeting}>
                Hi {firstName}
                <Text style={styles.wave}>  👋</Text>
              </Text>
            ) : null}
            <Text style={styles.headline}>You're verified.</Text>
            {instituteName ? (
              <View style={styles.instituteRow}>
                <View style={styles.instituteCheckDot}>
                  <Svg width={9} height={9} viewBox="0 0 12 12">
                    <Path
                      d="M2.2 6.4 L 4.8 9 L 9.8 3.2"
                      stroke={AppColors.primaryLightGreen}
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.instituteText} numberOfLines={2}>
                  {instituteName}
                </Text>
              </View>
            ) : null}
            {verifiedEmail ? (
              <Text style={styles.emailLine} numberOfLines={1}>
                via {verifiedEmail}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View
            style={{
              opacity: copyOpacity,
              transform: [{ translateY: copyTranslate }],
              width: "100%",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.85}
              onPress={goHome}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const MARK_SIZE = 84;
const HALO_SIZE = 160;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
    justifyContent: "center",
  },

  /* Pending */
  pendingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  pendingText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    letterSpacing: 0.2,
  },

  /* Success */
  successCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markWrap: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  halo: {
    position: "absolute",
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  disc: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  copy: {
    alignItems: "center",
    width: "100%",
    marginBottom: 32,
  },
  greeting: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  wave: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
  },
  headline: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 36,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.8,
    textAlign: "center",
    marginBottom: 14,
  },
  instituteRow: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 8,
    paddingHorizontal: 8,
  },
  instituteCheckDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  instituteText: {
    flexShrink: 1,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.1,
    textAlign: "center",
  },
  emailLine: {
    marginTop: 8,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    letterSpacing: 0.2,
  },

  /* Body copy (shared by error state) */
  bodyText: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 26,
  },

  /* CTA — one button, forest fill, neutral copy ("Continue") so it
     works whether the user arrived from Personal Information OR the
     signup "Complete your profile" flow. Always lands on Home. */
  cta: {
    height: 54,
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  ctaText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },

  /* Error */
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  errorMark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,107,91,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});
