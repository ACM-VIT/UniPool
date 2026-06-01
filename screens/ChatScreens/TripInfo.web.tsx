// Web variant of the Trips list. The mobile screen is the chat-thread
// list; on the web it reads as "your trips": each ride you host or have
// joined, with its route and latest activity. Backed by /chats/me. A
// quiet white list with hairline-divided rows on the cream page.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../../components/web/WebShell";
import { useApi } from "../../utils/ApiUtil";
import { useAuthGate } from "../../contexts/AuthGate";
import { appHref } from "../../navigation/routes";
import { titleCaseLocation } from "../../components/web/format";
import { WEB, RADIUS, FONT, cardBorder } from "../../components/web/theme";

type ChatRoom = {
  id: string;
  start_location?: string;
  end_location?: string;
  start_time?: string;
  host_user_name?: string;
  viewer_role?: string;
  last_message?: string;
  last_message_text?: string;
  last_message_at?: string;
  unread_count?: number;
};

type ChatsResponse = { chat_rooms?: ChatRoom[]; viewer_user_id?: string };

const fmtWhen = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

const roleLabel = (role?: string) => {
  if (!role) return "";
  if (role.includes("host")) return "Hosting";
  if (role.includes("pending")) return "Requested";
  return "Joined";
};

const TripRow: React.FC<{ room: ChatRoom; onPress: () => void; last?: boolean }> = ({ room, onPress, last }) => {
  const preview = room.last_message_text || room.last_message || (room.host_user_name ? `Hosted by ${room.host_user_name}` : "");
  const role = roleLabel(room.viewer_role);
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <View style={styles.rowBody}>
        <View style={styles.routeLine}>
          <Text style={styles.origin} numberOfLines={1}>{titleCaseLocation(room.start_location) || "Ride"}</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={styles.arrow}>
            <Path d="M5 12 H19 M19 12 L13 6 M19 12 L13 18" stroke={WEB.inkLine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.dest} numberOfLines={1}>{titleCaseLocation(room.end_location)}</Text>
        </View>
        {preview ? <Text style={styles.preview} numberOfLines={1}>{preview}</Text> : null}
      </View>
      <View style={styles.meta}>
        {role ? (
          <View style={[styles.rolePill, role === "Hosting" && styles.rolePillHost]}>
            <Text style={[styles.roleText, role === "Hosting" && styles.roleTextHost]}>{role}</Text>
          </View>
        ) : null}
        <Text style={styles.when}>{fmtWhen(room.start_time)}</Text>
      </View>
    </Pressable>
  );
};

const TripsListScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest } = useAuthGate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<ChatsResponse>("/chats/me");
      setRooms(Array.isArray(resp?.chat_rooms) ? resp.chat_rooms : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [apiUtil]);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    void load();
  }, [isGuest, load]);

  if (isGuest) {
    return (
      <WebShell active="TripsListScreen">
        <View style={styles.wrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sign in to see your trips</Text>
            <Text style={styles.emptyBody}>Every ride you host or join shows up here, with its chat.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("AuthScreen"))}>
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell active="TripsListScreen">
      <View style={styles.wrap}>
        <Text style={styles.title}>Your trips</Text>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={WEB.forest} /></View>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyBody}>Find a ride or post your own to get started.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("HomeScreen"))}>
              <Text style={styles.primaryBtnText}>Find a ride</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {rooms.map((room, i) => (
              <TripRow
                key={room.id}
                room={room}
                last={i === rooms.length - 1}
                onPress={() => router.push(appHref("RideDetailsScreen", { rideId: room.id } as any))}
              />
            ))}
          </View>
        )}
      </View>
    </WebShell>
  );
};

export default TripsListScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingTop: 36, paddingBottom: 56 },
  title: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6, marginBottom: 18 },

  center: { alignItems: "center", paddingVertical: 80 },
  emptyCard: { alignItems: "center", gap: 8, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, ...cardBorder },
  emptyTitle: { fontFamily: FONT.display, fontSize: 21, color: WEB.forest },
  emptyBody: { fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.inkMuted, textAlign: "center", marginBottom: 10 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 26, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  list: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", ...cardBorder },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  rowBody: { flex: 1, minWidth: 0 },
  routeLine: { flexDirection: "row", alignItems: "center" },
  origin: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest, flexShrink: 0, maxWidth: "52%" },
  dest: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest, flexShrink: 1, flex: 1 },
  arrow: { marginHorizontal: 7 },
  preview: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: 4 },
  meta: { alignItems: "flex-end", gap: 7 },
  rolePill: { backgroundColor: WEB.fieldFill, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill },
  rolePillHost: { backgroundColor: WEB.lime },
  roleText: { fontFamily: FONT.black, fontSize: 10.5, color: WEB.inkStrong },
  roleTextHost: { color: WEB.forest },
  when: { fontFamily: FONT.semibold, fontSize: 12, color: WEB.inkMuted },
});
