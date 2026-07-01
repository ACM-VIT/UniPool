// Branded 404 for unmatched routes. On web this is a lime-canvas "wrong turn"
// screen with a Back-to-home CTA (replacing expo-router's default unbranded
// page that exposed the dev sitemap); on native it stays a plain neutral
// screen since unmatched routes are essentially never hit there.
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { appHref } from "../navigation/routes";

const isWeb = Platform.OS === "web";
const LIME = "#B5D750";
const FOREST = "#263B33";

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: isWeb ? LIME : "#FFFFFF" }]}>
      <Text style={[styles.code, !isWeb && { color: FOREST }]}>404</Text>
      <Text style={styles.title}>This page took a wrong turn.</Text>
      <Text style={styles.body}>The page you're looking for doesn't exist or has moved.</Text>
      <Pressable style={styles.btn} onPress={() => router.replace(appHref("HomeScreen"))}>
        <Text style={styles.btnText}>Back to home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: isWeb ? ("100vh" as unknown as number) : undefined, alignItems: "center", justifyContent: "center", padding: 32 },
  code: { fontFamily: "NunitoSans_800ExtraBold", fontSize: 72, color: FOREST, letterSpacing: -2, opacity: 0.9 },
  title: { fontFamily: "NunitoSans_800ExtraBold", fontSize: 24, color: FOREST, marginTop: 8, textAlign: "center", letterSpacing: -0.5 },
  body: { fontFamily: "NunitoSans_600SemiBold", fontSize: 15, color: "#2C3A2E", marginTop: 10, textAlign: "center", maxWidth: 360, lineHeight: 22 },
  btn: { marginTop: 26, backgroundColor: FOREST, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 28 },
  btnText: { fontFamily: "NunitoSans_800ExtraBold", fontSize: 15, color: LIME },
});
