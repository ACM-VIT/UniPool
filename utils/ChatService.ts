import { ChatMessage } from "../screens/ChatScreens/ChatScreen.types";
import ApiUtil from "./ApiUtil";
import baseURL from "../config/urlconfig";
import { getAuth, getIdTokenResult } from "@react-native-firebase/auth";

export type FetchMessagesResult = {
  messages: ChatMessage[];
  hasMore: boolean;
};

const MARK_READ_DEDUPE_MS = 5_000;

const markReadAttempts = new Map<
  string,
  {
    lastAttemptAt: number;
    inFlight?: Promise<void>;
  }
>();

const postReadMarker = async (apiUtil: ApiUtil, chatId: string): Promise<void> => {
  try {
    // Either a ride UUID (group chat) or a `dm_<a>_<b>` room id —
    // pick the matching backend endpoint so unread badges clear for
    // both chat types. Pending-request DMs need this so the host's
    // pending section count drops the moment they open the thread.
    //
    // Uses `postSilent` so a backend hiccup on `/read` doesn't hijack
    // the screen with the global "Uh Oh!" error sheet.
    if (chatId.startsWith("dm_")) {
      await apiUtil.postSilent(`/dm/${chatId}/read`, {});
    } else {
      await apiUtil.postSilent(`/chat/${chatId}/read`, {});
    }
  } catch (err) {
    // Mark-read is a UX nicety; failing silently is correct so we
    // don't surface noisy errors over a transient network blip.
    console.warn("[ChatService] markRideRead failed", err);
  }
};

export default class ChatService {
  /**
   * Fetch a page of messages for a room. The backend returns them
   * newest-to-oldest within a page; callers append to the existing
   * list (older messages prepend, newer arrive over the WebSocket).
   *
   * `before` is an RFC3339 timestamp used as a cursor — pass the
   * timestamp of the oldest message currently in memory to load the
   * page that came before it. `limit` defaults to 50; the backend
   * caps at 200.
   */
  static async fetchMessages(
    apiUtil: ApiUtil,
    roomId: string,
    opts: { before?: string; limit?: number } = {},
  ): Promise<FetchMessagesResult> {
    const base = roomId.startsWith("dm_")
      ? `/dm/${roomId}/messages`
      : `/chat/${roomId}/messages`;

    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.before) params.set("before", opts.before);
    const qs = params.toString();
    const endpoint = qs ? `${base}?${qs}` : base;

    const res = await apiUtil.get<{ messages: ChatMessage[]; has_more?: boolean }>(endpoint);
    return {
      messages: res.messages || [],
      hasMore: !!res.has_more,
    };
  }

  static async sendMessage(
    apiUtil: ApiUtil,
    roomId: string,
    content: string,
  ): Promise<void> {
    const endpoint = roomId.startsWith("dm_")
      ? `/dm/${roomId}/message`
      : `/chat/${roomId}/message`;
    await apiUtil.post(endpoint, { content });
  }

  /**
   * Mark a ride chat read up to "now" for the current user. Fired
   * whenever the chat is opened or refocused — the backend keeps an
   * upsert-style `chat_reads` row so the unread badge on the chat
   * list stays accurate without the frontend tracking it locally.
   */
  static async markRideRead(apiUtil: ApiUtil, chatId: string): Promise<void> {
    const now = Date.now();
    const existing = markReadAttempts.get(chatId);

    if (existing?.inFlight) {
      return existing.inFlight;
    }

    if (existing && now - existing.lastAttemptAt < MARK_READ_DEDUPE_MS) {
      return;
    }

    let attempt: Promise<void>;
    attempt = postReadMarker(apiUtil, chatId).finally(() => {
      const current = markReadAttempts.get(chatId);
      if (current?.inFlight === attempt) {
        markReadAttempts.set(chatId, { lastAttemptAt: current.lastAttemptAt });
      }
    });

    markReadAttempts.set(chatId, {
      lastAttemptAt: now,
      inFlight: attempt,
    });

    return attempt;
  }

  static async openSocket(
    userId: string,
    roomId: string,
    onMessage: (evt: MessageEvent) => void,
  ): Promise<WebSocket> {
    const httpBase = baseURL.replace(/\/$/, "");
    const derivedWsBase = httpBase.replace(/^http/, "ws");
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      throw new Error("Cannot open chat socket without a signed-in user");
    }
    const tokenResult = await getIdTokenResult(currentUser);
    const params = new URLSearchParams({
      user_id: userId,
      room_id: roomId,
      token: tokenResult.token,
    });
    const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL || derivedWsBase}/ws?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = onMessage;
    ws.onerror = (e) => {
      console.error("[WebSocket] error", e);
    };
    ws.onclose = (e) => {
      console.warn("[WebSocket] closed", e.code, e.reason);
    };
    return ws;
  }
}
