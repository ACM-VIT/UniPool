// Web ride chat — a real message thread, backed by the REST chat API with
// light polling (WebSockets are a fast-follow). Fills the viewport via
// WebShell's fullBleed mode: a fixed header, a scrolling message list, and
// a pinned composer. Mirrors the app's chat surface: own messages on the
// right in forest, others on the left in cream with a name + avatar, and
// system lines (payment markers etc.) centered.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../../components/web/WebShell";
import { useApi } from "../../utils/ApiUtil";
import { useUser } from "../../contexts/UserContext";
import { useAuthGate } from "../../contexts/AuthGate";
import { useDecodedLocalSearchParams, appHref } from "../../navigation/routes";
import { WEB, RADIUS, FONT } from "../../components/web/theme";

type Msg = {
  id: string;
  content: string;
  sender_id: string;
  timestamp: string;
  kind?: string;
  sender?: { name?: string; profile_picture_url?: string };
  _pending?: boolean;
};

type MessagesResponse = { messages?: Msg[] };

// Backend normal messages use kind "user" (the default), plus "text"/"message"
// from optimistic sends — only payment markers are true system rows. Matching
// on an allowlist (not "anything that isn't text/message") keeps a normal
// "user" message from rendering as a centered system pill.
const isSystem = (m: Msg) => m.kind === "payment_marker" || m.kind === "payment_ack";

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};

const Avatar: React.FC<{ name?: string }> = ({ name }) => (
  <View style={styles.avatar}>
    <Text style={styles.avatarInitial}>{(name || "U").trim().charAt(0).toUpperCase()}</Text>
  </View>
);

const ChatMessagesWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const params = useDecodedLocalSearchParams<{ chatId?: string; dmRoomId?: string; chatTitle?: string; chatSubtitle?: string }>();
  // A ride chat (host + confirmed passengers) uses /chat/:ride_id; a DM
  // (a pending passenger and the host) uses /dm/:dm_room_id. The screen is
  // the same — only the endpoint base differs.
  const rideId = params.chatId;
  const dmRoomId = params.dmRoomId;
  const convoId = dmRoomId || rideId;
  const base = dmRoomId ? `/dm/${dmRoomId}` : `/chat/${rideId}`;
  const viewerId = user?.id;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const lastSigRef = useRef("");
  const stoppedRef = useRef(false);

  const load = useCallback(async () => {
    if (!convoId || isGuest || stoppedRef.current) return;
    try {
      const resp = await apiUtil.get<MessagesResponse>(`${base}/messages?mark_read=1`);
      const next = Array.isArray(resp?.messages) ? resp.messages : [];
      // Only re-render when the thread actually changed (avoids polling jank).
      const sig = `${next.length}:${next[next.length - 1]?.id ?? ""}`;
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setMessages(next);
      }
    } catch (err: any) {
      // No access to this chat (not a member yet, or signed out) — stop the
      // poll loop and show a quiet locked state instead of hammering 401s.
      const status = err?.response?.status;
      if (status === 401 || status === 403 || /\b40[13]\b/.test(String(err?.message || ""))) {
        stoppedRef.current = true;
        setNoAccess(true);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUtil, base, convoId, isGuest]);

  useEffect(() => {
    if (!convoId || isGuest) {
      setLoading(false);
      return;
    }
    stoppedRef.current = false;
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [convoId, isGuest, load]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending || !convoId) return;
    setSending(true);
    setText("");
    const temp: Msg = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: viewerId || "me",
      timestamp: new Date().toISOString(),
      kind: "text",
      sender: { name: user?.name || "You" },
      _pending: true,
    };
    setMessages((m) => [...m, temp]);
    try {
      await apiUtil.post(`${base}/message`, { content });
      lastSigRef.current = "";
      await load();
    } catch {
      setText(content);
      setMessages((m) => m.filter((x) => x.id !== temp.id));
    } finally {
      setSending(false);
    }
  };

  const title = params.chatTitle || "Ride chat";
  const subtitle = params.chatSubtitle || "Trip chat";

  return (
    <WebShell active="TripsListScreen" fullBleed>
      <View style={styles.shell}>
        <View style={styles.column}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.push(appHref("TripsListScreen"))} accessibilityLabel="Back to trips">
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M15 5 L8 12 L15 19" stroke={WEB.forest} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>
            </View>
            {rideId ? (
              <Pressable style={styles.viewRide} onPress={() => router.push(appHref("RideDetailsScreen", { rideId } as any))}>
                <Text style={styles.viewRideText}>View ride</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Messages */}
          {isGuest ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Sign in to open this chat</Text>
              <Text style={styles.emptyBody}>Ride chats are private to the people on the trip.</Text>
              <Pressable style={styles.lockBtn} onPress={() => router.push(appHref("AuthScreen"))}>
                <Text style={styles.lockBtnText}>Sign in</Text>
              </Pressable>
            </View>
          ) : noAccess ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Chat unavailable</Text>
              <Text style={styles.emptyBody}>You can chat here once you've joined this ride.</Text>
            </View>
          ) : loading ? (
            <View style={styles.center}><ActivityIndicator color={WEB.forest} /></View>
          ) : messages.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>Say hi and sort out the pickup details.</Text>
            </View>
          ) : (
            <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {messages.map((m, i) => {
                if (isSystem(m)) {
                  return m.content ? (
                    <View key={m.id} style={styles.systemRow}>
                      <Text style={styles.systemText}>{m.content}</Text>
                    </View>
                  ) : null;
                }
                const mine = !!viewerId && m.sender_id === viewerId;
                const prev = messages[i - 1];
                const showName = !mine && (!prev || prev.sender_id !== m.sender_id || isSystem(prev));
                return (
                  <View key={m.id} style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}>
                    {!mine && (showName ? <Avatar name={m.sender?.name} /> : <View style={styles.avatarSpacer} />)}
                    <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
                      {showName ? <Text style={styles.senderName}>{m.sender?.name || "Student"}</Text> : null}
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, m._pending && styles.bubblePending]}>
                        <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{m.content}</Text>
                      </View>
                      <Text style={[styles.time, mine && styles.timeMine]}>{fmtTime(m.timestamp)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Composer */}
          {!isGuest && !noAccess ? (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={WEB.inkMuted}
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                editable={!!convoId}
                returnKeyType="send"
              />
              <Pressable
                style={({ hovered }: any) => [styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled, hovered && text.trim() && styles.sendBtnHover]}
                onPress={send}
                disabled={!text.trim() || sending}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M4 12 L20 4 L13 20 L11 13 Z" fill={WEB.forest} />
                </Svg>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </WebShell>
  );
};

export default ChatMessagesWeb;

const styles = StyleSheet.create({
  shell: { flex: 1, alignItems: "center", width: "100%", paddingHorizontal: 16 },
  column: { flex: 1, width: "100%", maxWidth: 760 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: WEB.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: WEB.hairline },
  headerTitle: { fontFamily: FONT.black, fontSize: 16, color: WEB.forest, letterSpacing: -0.2 },
  headerSub: { fontFamily: FONT.semibold, fontSize: 12.5, color: WEB.inkMuted, marginTop: 1 },
  viewRide: { backgroundColor: WEB.forest, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 },
  viewRideText: { fontFamily: FONT.black, fontSize: 13, color: WEB.lime },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: FONT.black, fontSize: 16, color: WEB.forest, textAlign: "center" },
  emptyBody: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.inkMuted, textAlign: "center" },
  lockBtn: { marginTop: 10, backgroundColor: WEB.forest, borderRadius: RADIUS.button, paddingHorizontal: 24, paddingVertical: 12 },
  lockBtnText: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.lime },

  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 18, gap: 4 },

  systemRow: { alignItems: "center", paddingVertical: 8 },
  systemText: { fontFamily: FONT.semibold, fontSize: 12.5, color: WEB.inkMuted, backgroundColor: WEB.surface, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, overflow: "hidden", textAlign: "center" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 6 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: FONT.black, fontSize: 12, color: WEB.lime },
  avatarSpacer: { width: 28 },
  bubbleWrap: { maxWidth: "74%", alignItems: "flex-start" },
  bubbleWrapMine: { alignItems: "flex-end" },
  senderName: { fontFamily: FONT.bold, fontSize: 12, color: WEB.midOlive, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: WEB.forest, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: WEB.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: WEB.hairline },
  bubblePending: { opacity: 0.6 },
  bubbleText: { fontFamily: FONT.semibold, fontSize: 14.5, lineHeight: 20 },
  bubbleTextMine: { color: WEB.cream },
  bubbleTextOther: { color: WEB.forest },
  time: { fontFamily: FONT.semibold, fontSize: 10.5, color: WEB.inkMuted, marginTop: 3, marginLeft: 4 },
  timeMine: { marginLeft: 0, marginRight: 4 },

  composer: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderTopWidth: 1, borderTopColor: WEB.hairline },
  input: { flex: 1, height: 48, borderRadius: RADIUS.pill, backgroundColor: WEB.surface, paddingHorizontal: 18, fontFamily: FONT.semibold, fontSize: 15, color: WEB.forest, borderWidth: 1, borderColor: WEB.hairline, outlineStyle: "none" as any },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: WEB.lime, alignItems: "center", justifyContent: "center" },
  sendBtnHover: { backgroundColor: "#C2E15C" },
  sendBtnDisabled: { backgroundColor: WEB.inkSubtle },
});
