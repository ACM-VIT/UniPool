// Web variant of the auth screen. A clean, centered single-column sign-in
// on the lime canvas, with a "Welcome." hero and a forest card carrying the
// Google button.
//
// Sign-in uses Google Identity Services (the native "Sign in with Google"
// button): GIS returns a Google ID token, which we exchange for a Firebase
// session via a backend-issued Firebase custom token. This avoids the
// firebaseapp.com popup/redirect handler entirely, so web sign-in does not
// depend on Firebase authorized-domain OAuth settings.
//
// Metro aliases "@react-native-firebase/auth" to web-shims/firebase-auth.ts
// (the firebase/auth web SDK) so these modular calls work unchanged.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { useApi } from "../../utils/ApiUtil";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { WEB, RADIUS, FONT, floatShadow } from "../../components/web/theme";
import { signInToFirebaseWithGoogleIdToken } from "../../utils/webGoogleAuth";

// Web OAuth 2.0 client ID (same one the mobile app passes to
// GoogleSignin.configure as webClientId).
const WEB_CLIENT_ID = "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com";

const BackArrow = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 5 L8 12 L15 19" stroke={WEB.forest} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AuthScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const params = useDecodedLocalSearchParams<{ returnTo?: { screen: string; params?: any }; reason?: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const gisRef = useRef<HTMLDivElement | null>(null);

  const goAfterAuth = () => {
    if (params.returnTo && params.returnTo.screen) {
      router.replace(targetHref(params.returnTo as any));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const authMessage = (err: any): string => {
    const code = err?.code || "";
    if (code === "auth/network-request-failed")
      return "Network error reaching Google. Check your connection and try again.";
    if (err?.status === 401)
      return "Google sign-in could not be verified. Please try again.";
    return code ? `Sign-in failed (${code}). Please try again.` : "Could not sign in right now. Please try again.";
  };

  // Existing users go home / back where they were; new users to sign-up.
  const finishAuth = async (firebaseUser: any) => {
    try {
      await apiUtil.getForUserUncached("/user/details?summary=1", firebaseUser);
      goAfterAuth();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        router.replace(appHref("SignUpScreen", { returnTo: params.returnTo } as any));
      } else {
        goAfterAuth();
      }
    }
  };

  // GIS callback: exchange the Google ID token for a Firebase session.
  const handleCredential = async (response: any) => {
    const idToken = response?.credential;
    if (!idToken) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signInToFirebaseWithGoogleIdToken(idToken);
      await finishAuth(result.user);
    } catch (err: any) {
      setError(authMessage(err));
      setBusy(false);
    }
  };

  // Load Google Identity Services and render the native button.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const render = () => {
      const g = (window as any).google;
      if (cancelled || !g?.accounts?.id || !gisRef.current) return;
      try {
        g.accounts.id.initialize({ client_id: WEB_CLIENT_ID, callback: handleCredential, ux_mode: "popup" });
        gisRef.current.innerHTML = "";
        g.accounts.id.renderButton(gisRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: 360,
        });
        setGisReady(true);
      } catch {
        setError("Google sign-in could not load. Refresh and try again.");
      }
    };
    if ((window as any).google?.accounts?.id) {
      render();
      return () => { cancelled = true; };
    }
    let script = document.getElementById("gis-client") as HTMLScriptElement | null;
    const onError = () => {
      if (!cancelled) setError("Google sign-in could not load. Refresh and try again.");
    };
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "gis-client";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    script.addEventListener("error", onError);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, wide && styles.topRowAbsolute]}>
        <Pressable style={styles.backBtn} onPress={() => router.push(appHref("HomeScreen"))} accessibilityLabel="Back to home">
          <BackArrow />
        </Pressable>
        <Text style={styles.wordmark}>UniPool</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.center}>
        <Image source={require("../../assets/unipool-hero.png")} style={styles.art} resizeMode="contain" />
        <View style={[styles.heroBlock, wide && styles.heroBlockWide]}>
          <Text style={styles.heroTitle}>Welcome.</Text>
          <Text style={[styles.heroSub, wide && styles.heroSubCenter]}>
            {params.reason
              ? `Sign in ${params.reason}.`
              : "Find a ride, share a seat, and split the fare with students taking your route."}
          </Text>
        </View>

        <View style={styles.authBlock}>
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={WEB.cream} />
            </View>
          ) : (
            <>
              {/* Google Identity Services renders its native button here. */}
              <div ref={gisRef} style={{ display: "flex", justifyContent: "center", minHeight: gisReady ? 44 : 0 }} />
              {!gisReady && (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={WEB.cream} />
                </View>
              )}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.legal}>
            By continuing you agree to UniPool's{" "}
            <Text style={styles.link} onPress={() => router.push(appHref("TermsOfServiceScreen"))}>Terms</Text>
            {" and "}
            <Text style={styles.link} onPress={() => router.push(appHref("PrivacyPolicyScreen"))}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AuthScreenWeb;

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: "100vh" as unknown as number, backgroundColor: WEB.page, paddingHorizontal: 24, paddingVertical: 22 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRowAbsolute: { position: "absolute" as any, top: 22, left: 24, right: 24, zIndex: 2 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: WEB.surfaceElevated, alignItems: "center", justifyContent: "center", ...floatShadow },
  wordmark: { fontFamily: FONT.black, fontSize: 19, color: WEB.forest, letterSpacing: -0.5 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 26, paddingVertical: 36 },
  art: { width: 300, height: 188, maxWidth: "100%" as any },
  heroBlock: { width: "100%", maxWidth: 460, gap: 12 },
  heroBlockWide: { alignItems: "center" },
  heroTitle: { fontFamily: FONT.displayBlack, fontSize: 44, color: WEB.forest, letterSpacing: -1.2 },
  heroSub: { fontFamily: FONT.semibold, fontSize: 16, lineHeight: 25, color: WEB.inkStrong, maxWidth: 420, textAlign: "left" },
  heroSubCenter: { textAlign: "center" },

  authBlock: { width: "100%", maxWidth: 460, backgroundColor: WEB.forest, borderRadius: RADIUS.sheet, padding: 26, ...floatShadow },
  busyRow: { height: 54, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 14, textAlign: "center" },
  legal: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 19, color: WEB.onForestMuted, marginTop: 18, textAlign: "center" },
  link: { color: WEB.cream, textDecorationLine: "underline" },
});
