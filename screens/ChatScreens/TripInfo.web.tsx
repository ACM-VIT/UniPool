// Web variant of the Trips list, backed by /chats/me. Two kinds of thread,
// matching the app's chat logic:
//   - chat_rooms: every ride you're on. Host + confirmed passengers share the
//     group ride chat; a PENDING passenger instead gets a 1:1 DM with the host
//     (they're not in the group yet); a rejected request has no chat.
//   - pending_requests: host-only — each person who asked to join one of your
//     rides, as a 1:1 DM so you can vet them before accepting.
// The row body opens the trip details; the chat affordance opens the right
// thread (group chat or DM) for that role.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../../components/web/WebShell";
import { useApi } from "../../utils/ApiUtil";
import { useUser } from "../../contexts/UserContext";
import { useAuthGate } from "../../contexts/AuthGate";
import { appHref } from "../../navigation/routes";
import { titleCaseLocation } from "../../components/web/format";
import { WEB, RADIUS, FONT, cardBorder } from "../../components/web/theme";

type LastMessage = { content?: string; sender?: string; sender_id?: string; timestamp?: string };
type ChatRoom = {
  id: string;
  start_location?: string;
  end_location?: string;
  start_time?: string;
  host_user_id?: string;
  host_user_name?: string;
  viewer_role?: string;
  last_message?: LastMessage;
  unread_count?: number;
};
type PendingRequest = {
  booking_id: string;
  ride_id: string;
  dm_room_id: string;
  requester_id: string;
  requester_name?: string;
  ride_start_location?: string;
  ride_end_location?: string;
  last_message?: LastMessage;
  unread_count?: number;
};
type ChatsResponse = { chat_rooms?: ChatRoom[]; pending_requests?: PendingRequest[] };

// Mirror of the backend's dmRoomID(a, b): "dm_" + the two user ids sorted.
const dmRoomFor = (a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `dm_${x}_${y}`;
};
const firstName = (full?: string) => (full || "").trim().split(/\s+/)[0] || "";

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
  if (role === "host") return "Hosting";
  if (role === "pending_passenger") return "Requested";
  if (role === "rejected_passenger") return "Declined";
  return "Joined";
};

const ChatBubble = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 5 H20 A1 1 0 0 1 21 6 V16 A1 1 0 0 1 20 17 H9 L4 21 V6 A1 1 0 0 1 5 5 Z" stroke={WEB.forest} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

const RouteLine: React.FC<{ origin?: string; dest?: string }> = ({ origin, dest }) => (
  <View style={styles.routeLine}>
    <Text style={styles.origin} numberOfLines={1}>{titleCaseLocation(origin) || "Ride"}</Text>
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={styles.arrow}>
      <Path d="M5 12 H19 M19 12 L13 6 M19 12 L13 18" stroke={WEB.inkLine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
    <Text style={styles.dest} numberOfLines={1}>{titleCaseLocation(dest)}</Text>
  </View>
);

const TripRow: React.FC<{ room: ChatRoom; onPress: () => void; onChat?: () => void; unread?: number; last?: boolean }> = ({ room, onPress, onChat, unread, last }) => {
  const preview = room.last_message?.content || (room.host_user_name ? `Hosted by ${room.host_user_name}` : "");
  const role = roleLabel(room.viewer_role);
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={styles.rowBody}>
          <RouteLine origin={room.start_location} dest={room.end_location} />
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
      {onChat ? (
        <Pressable style={({ hovered }: any) => [styles.chatIcon, hovered && styles.chatIconHover]} onPress={onChat} accessibilityLabel="Open chat">
          {unread ? <View style={styles.unreadDot} /> : null}
          <ChatBubble />
        </Pressable>
      ) : null}
    </View>
  );
};

const PendingRow: React.FC<{ req: PendingRequest; onPress: () => void; last?: boolean }> = ({ req, onPress, last }) => (
  <Pressable style={[styles.row, styles.rowMain, !last && styles.rowBorder]} onPress={onPress}>
    <View style={styles.requesterAvatar}>
      <Text style={styles.requesterInitial}>{(req.requester_name || "U").trim().charAt(0).toUpperCase()}</Text>
    </View>
    <View style={styles.rowBody}>
      <Text style={styles.requesterName} numberOfLines={1}>{req.requester_name || "A student"}</Text>
      <Text style={styles.preview} numberOfLines={1}>
        {req.last_message?.content || `Wants to join ${titleCaseLocation(req.ride_start_location)} to ${titleCaseLocation(req.ride_end_location)}`}
      </Text>
    </View>
    {req.unread_count ? <View style={styles.unreadDotInline} /> : null}
    <ChatBubble />
  </Pressable>
);

const TripsListScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest } = useAuthGate();
  const { user } = useUser();
  const viewerId = user?.id;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<ChatsResponse>("/chats/me");
      setRooms(Array.isArray(resp?.chat_rooms) ? resp.chat_rooms : []);
      setPending(Array.isArray(resp?.pending_requests) ? resp.pending_requests : []);
    } catch {
      setRooms([]);
      setPending([]);
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

  const openDetails = (rideId: string) => router.push(appHref("RideDetailsScreen", { rideId } as any));

  // Pick the right chat thread for a row based on the viewer's role.
  const chatForRoom = (room: ChatRoom): (() => void) | undefined => {
    const role = room.viewer_role;
    const title = `${titleCaseLocation(room.start_location) || "Ride"} to ${titleCaseLocation(room.end_location) || ""}`.trim();
    if (role === "rejected_passenger") return undefined; // no chat for a declined request
    if (role === "pending_passenger") {
      if (!viewerId || !room.host_user_id) return undefined;
      return () =>
        router.push(
          appHref("ChatMessages", {
            dmRoomId: dmRoomFor(viewerId, room.host_user_id as string),
            chatId: room.id,
            chatTitle: room.host_user_name ? `Chat with ${firstName(room.host_user_name)}` : "Host",
            chatSubtitle: title,
          } as any),
        );
    }
    // host or confirmed passenger -> the shared group ride chat
    return () =>
      router.push(
        appHref("ChatMessages", {
          chatId: room.id,
          chatTitle: title,
          chatSubtitle: room.host_user_name ? `Hosted by ${room.host_user_name}` : "Trip chat",
          isGroupChat: true,
        } as any),
      );
  };

  const openRequestDM = (req: PendingRequest) =>
    router.push(
      appHref("ChatMessages", {
        dmRoomId: req.dm_room_id,
        chatId: req.ride_id,
        chatTitle: req.requester_name ? `Chat with ${firstName(req.requester_name)}` : "Request",
        chatSubtitle: `${titleCaseLocation(req.ride_start_location) || "Ride"} to ${titleCaseLocation(req.ride_end_location) || ""}`.trim(),
      } as any),
    );

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
        ) : rooms.length === 0 && pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyBody}>Find a ride or post your own to get started.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("HomeScreen"))}>
              <Text style={styles.primaryBtnText}>Find a ride</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {pending.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Requests to your rides</Text>
                <View style={styles.list}>
                  {pending.map((req, i) => (
                    <PendingRow key={req.booking_id} req={req} last={i === pending.length - 1} onPress={() => openRequestDM(req)} />
                  ))}
                </View>
              </View>
            ) : null}

            {rooms.length > 0 ? (
              <View style={styles.section}>
                {pending.length > 0 ? <Text style={styles.sectionLabel}>Your rides</Text> : null}
                <View style={styles.list}>
                  {rooms.map((room, i) => (
                    <TripRow
                      key={room.id}
                      room={room}
                      last={i === rooms.length - 1}
                      unread={room.unread_count}
                      onPress={() => openDetails(room.id)}
                      onChat={chatForRoom(room)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </WebShell>
  );
};

export default TripsListScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingTop: 36, paddingBottom: 56 },
  title: { fontFamily: FONT.displayBlack, fontSize: 30, color: WEB.forest, letterSpacing: -0.8, marginBottom: 18 },

  center: { alignItems: "center", paddingVertical: 80 },
  emptyCard: { alignItems: "center", gap: 8, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, ...cardBorder },
  emptyTitle: { fontFamily: FONT.displayBlack, fontSize: 21, color: WEB.forest },
  emptyBody: { fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.inkMuted, textAlign: "center", marginBottom: 10 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 26, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  section: { marginBottom: 22 },
  sectionLabel: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },

  list: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", ...cardBorder },
  row: { flexDirection: "row", alignItems: "center" },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingLeft: 20, paddingRight: 10, minWidth: 0 },
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

  chatIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center", marginRight: 14 },
  chatIconHover: { backgroundColor: WEB.lime },
  unreadDot: { position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: WEB.orange, zIndex: 1 },
  unreadDotInline: { width: 9, height: 9, borderRadius: 5, backgroundColor: WEB.orange, marginRight: 4 },

  requesterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  requesterInitial: { fontFamily: FONT.black, fontSize: 16, color: WEB.lime },
  requesterName: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest },
});
