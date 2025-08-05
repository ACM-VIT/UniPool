import { ChatMessage } from "../screens/ChatScreens/ChatScreen.types";
import ApiUtil from "./ApiUtil";
import baseURL from "../config/urlconfig";

export default class ChatService {
  static async fetchMessages(apiUtil: ApiUtil, roomId: string): Promise<ChatMessage[]> {
    let endpoint: string;
    
    if (roomId.startsWith('dm_')) {
      endpoint = `/dm/${roomId}/messages`;
    } else {
      endpoint = `/chat/${roomId}/messages`;
    }
    
    const res = await apiUtil.get<{ messages: ChatMessage[] }>(endpoint);
    return res.messages || [];
  }

  static async sendMessage(
    apiUtil: ApiUtil,
    roomId: string,
    content: string,
  ): Promise<void> {
    let endpoint: string;
    
    if (roomId.startsWith('dm_')) {
      endpoint = `/dm/${roomId}/message`;
    } else {
      endpoint = `/chat/${roomId}/message`;
    }
    
    await apiUtil.post(endpoint, { content });
  }

  static openSocket(
    userId: string,
    roomId: string,
    onMessage: (evt: MessageEvent) => void,
  ): WebSocket {
    const httpBase = baseURL.replace(/\/$/, "");
    const derivedWsBase = httpBase.replace(/^http/,'ws');
    const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL || derivedWsBase}/ws?user_id=${userId}&room_id=${roomId}`;
        const ws = new WebSocket(wsUrl);
    ws.onmessage = onMessage;
    ws.onerror = (e) => {
        console.error('[WebSocket] error', e);
    };
    ws.onclose = (e) => {
        console.warn('[WebSocket] closed', e.code, e.reason);
    };
    return ws;
  }
}
