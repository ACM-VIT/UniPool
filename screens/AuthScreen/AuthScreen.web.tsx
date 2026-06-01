// Web variant of the auth screen. A split sign-in: a forest brand panel
// (the app's dark auth surface) beside a lime canvas carrying the
// sign-in card.
//
// On the web we use the Firebase popup flow directly (signInWithPopup),
// which is the idiomatic browser path, rather than the native Google
// Sign-In SDK. After sign-in we check the backend user row: existing
// users go home (or back to where they were), new users go to the
// sign-up step. Sign in with Apple is native only and is omitted here.
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import Atmosphere from "../../components/web/Atmosphere";
import Reveal from "../../components/web/Reveal";
import { useApi } from "../../utils/ApiUtil";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder, floatShadow } from "../../components/web/theme";

const GoogleGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.6-.4-3.5z" />
    <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <Path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.6 2.5-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 7.3-5.3 7.3-15 0-1.5-.2-2.6-.4-3.5z" />
  </Svg>
);

const BrandPanel = () => (
  <View style={styles.brandPanel}>
    <Atmosphere />
    <View style={styles.brandPanelInner}>
      <Pressable style={styles.brandTop} onPress={() => {}}>
        <View style={styles.brandDotLime} />
        <Text style={styles.brandTextLime}>UniPool</Text>
      </Pressable>

      <View>
        <Reveal>
          <Text style={styles.panelTitle}>Your campus,{"\n"}carpooled.</Text>
        </Reveal>
        <Reveal delay={120}>
          <Text style={styles.panelSub}>
            Verified students, fair per seat fares, and rides that are actually going your way.
          </Text>
        </Reveal>
      </View>

      <Reveal delay={220}>
        <View style={styles.panelRoute}>
          <Svg width={40} height={120} viewBox="0 0 40 120">
            <Circle cx="20" cy="14" r="9" fill="none" stroke={WEB.lime} strokeWidth={3.5} />
            <Circle cx="20" cy="14" r="3" fill={WEB.lime} />
            <Path d="M20 28 V 92" stroke={WEB.lime} strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" />
            <Path d="M20 86 C 20 86, 8 96, 8 105 A 12 12 0 1 0 32 105 C 32 96, 20 86, 20 86 Z" fill={WEB.lime} />
            <Circle cx="20" cy="105" r="4.5" fill={WEB.forest} />
          </Svg>
          <View style={styles.panelRouteText}>
            <Text style={styles.panelRouteStop}>VIT Main Gate</Text>
            <Text style={styles.panelRouteStopMuted}>Chennai Airport</Text>
          </View>
        </View>
      </Reveal>
    </View>
  </View>
);

const AuthScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const params = useDecodedLocalSearchParams<{ returnTo?: { screen: string; params?: any } }>();
  const { width } = useWindowDimensions();
  const stacked = width < 920;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goAfterAuth = () => {
    if (params.returnTo && params.returnTo.screen) {
      router.replace(targetHref(params.returnTo as any));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithPopup(getAuth(), new GoogleAuthProvider());
      const firebaseUser = result.user;
      try {
        await apiUtil.getForUserUncached("/user/details?summary=1", firebaseUser);
        goAfterAuth();
      } catch (err: any) {
        const signupRequired = err?.response?.status === 404;
        if (signupRequired) {
          router.replace(appHref("SignUpScreen", { returnTo: params.returnTo } as any));
        } else {
          goAfterAuth();
        }
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        // The visitor closed the Google popup; nothing to report.
      } else {
        setError("Could not sign in right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, stacked && styles.rootStacked]}>
      {!stacked && <BrandPanel />}

      <View style={styles.formSide}>
        {stacked && (
          <Pressable style={styles.brandTopMobile} onPress={() => router.push(appHref("HomeScreen"))}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>UniPool</Text>
          </Pressable>
        )}
        <Reveal delay={stacked ? 60 : 180} style={styles.formCenter}>
          <View style={styles.card}>
            <Text style={styles.title}>Sign in to UniPool</Text>
            <Text style={styles.subtitle}>Find rides, post your own, and chat with the students you are travelling with.</Text>

            <Pressable style={styles.googleBtn} onPress={handleGoogle} disabled={busy} accessibilityRole="button">
              {busy ? (
                <ActivityIndicator color={WEB.forest} />
              ) : (
                <>
                  <GoogleGlyph />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.legal}>
              By continuing you agree to UniPool's{" "}
              <Text style={styles.link} onPress={() => router.push(appHref("TermsOfServiceScreen"))}>Terms</Text>
              {" and "}
              <Text style={styles.link} onPress={() => router.push(appHref("PrivacyPolicyScreen"))}>Privacy Policy</Text>.
            </Text>
          </View>
        </Reveal>
      </View>
    </View>
  );
};

export default AuthScreenWeb;

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: "100vh" as unknown as number, flexDirection: "row" },
  rootStacked: { flexDirection: "column" },

  brandPanel: { width: "44%", maxWidth: 560, overflow: "hidden" },
  brandPanelInner: { flex: 1, padding: 48, justifyContent: "space-between" },
  brandTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandDotLime: { width: 13, height: 13, borderRadius: 7, backgroundColor: WEB.lime },
  brandTextLime: { fontFamily: FONT.display, fontSize: 22, color: WEB.cream, letterSpacing: -0.3 },
  panelTitle: { fontFamily: FONT.display, fontSize: 34, lineHeight: 38, color: WEB.cream, letterSpacing: -0.8 },
  panelSub: { fontFamily: FONT.semibold, fontSize: 16, lineHeight: 25, color: WEB.onForestMuted, marginTop: 16, maxWidth: 340 },
  panelRoute: { flexDirection: "row", alignItems: "center", gap: 18 },
  panelRouteText: { gap: 24 },
  panelRouteStop: { fontFamily: FONT.black, fontSize: 17, color: WEB.cream },
  panelRouteStopMuted: { fontFamily: FONT.black, fontSize: 17, color: WEB.onForestFaint },

  formSide: { flex: 1, overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: WEB.page },
  brandTopMobile: { position: "absolute", top: 24, left: 24, flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: WEB.lime, borderWidth: 2.5, borderColor: WEB.forest },
  brandText: { fontFamily: FONT.display, fontSize: 21, color: WEB.forest, letterSpacing: -0.3 },
  formCenter: { width: "100%", alignItems: "center" },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 32,
    ...cardBorder,
    ...floatShadow,
  },
  title: { fontFamily: FONT.display, fontSize: 24, color: WEB.forest, letterSpacing: -0.5 },
  subtitle: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 22, color: WEB.inkStrong, marginTop: 10, marginBottom: 26 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 56,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: WEB.forest,
    backgroundColor: WEB.cream,
  },
  googleText: { fontFamily: FONT.black, fontSize: 16, color: WEB.forest },
  error: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.orange, marginTop: 14, textAlign: "center" },
  legal: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 19, color: WEB.inkMuted, marginTop: 22, textAlign: "center" },
  link: { color: WEB.forest, textDecorationLine: "underline" },
});
