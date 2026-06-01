// Web variant of the ride chat.
//
// The mobile chat is a realtime WebSocket thread with typing indicators,
// payment cards, and presence. Live web messaging is intentionally a
// fast-follow rather than part of this first web release, so the web
// route renders a clean, intentional page that points to the ride and
// to the app, instead of dropping a phone-shaped chat into the browser.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../../components/web/WebShell";
import Reveal from "../../components/web/Reveal";
import { useDecodedLocalSearchParams, appHref } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "../../components/web/theme";

const ChatMessagesWeb: React.FC = () => {
  const router = useRouter();
  const params = useDecodedLocalSearchParams<{ chatId?: string; chatTitle?: string }>();

  return (
    <WebShell active="TripsListScreen">
      <View style={styles.outer}>
        <Reveal style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 5 H20 A1 1 0 0 1 21 6 V16 A1 1 0 0 1 20 17 H9 L4 21 V6 A1 1 0 0 1 5 5 Z"
                  stroke={WEB.forest}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.title}>{params.chatTitle || "Ride chat"}</Text>
            <Text style={styles.body}>
              Live messaging lives in the UniPool app for now. You can still see the ride and request a seat here on the web.
            </Text>
            <View style={styles.actions}>
              {params.chatId ? (
                <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("RideDetailsScreen", { rideId: params.chatId } as any))}>
                  <Text style={styles.primaryBtnText}>View ride</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={() => router.push(appHref("TripsListScreen"))}>
                <Text style={styles.secondaryBtnText}>Back to trips</Text>
              </Pressable>
            </View>
          </View>
        </Reveal>
      </View>
    </WebShell>
  );
};

export default ChatMessagesWeb;

const styles = StyleSheet.create({
  outer: { width: "100%", alignItems: "center", paddingTop: 64, paddingBottom: 64 },
  cardWrap: { width: "100%", alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 460,
    alignItems: "center",
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    paddingVertical: 44,
    paddingHorizontal: 36,
    gap: 14,
    ...cardBorder,
  },
  iconWrap: { width: 60, height: 60, borderRadius: RADIUS.card, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: FONT.display, fontSize: 24, color: WEB.forest, textAlign: "center", letterSpacing: -0.4 },
  body: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 23, color: WEB.inkStrong, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 24, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },
  secondaryBtn: { backgroundColor: WEB.fieldFill, paddingHorizontal: 24, paddingVertical: 13, borderRadius: RADIUS.button },
  secondaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest },
});
