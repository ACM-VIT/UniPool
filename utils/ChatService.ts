import { ChatMessage } from "../screens/ChatScreens/ChatScreen.types";
import ApiUtil from "./ApiUtil";

export default class ChatService {
  static async fetchMessages(apiUtil: ApiUtil, rideId: string): Promise<ChatMessage[]> {
    const res = await apiUtil.get<{ messages: ChatMessage[] }>(`/chat/${rideId}/messages`);
    return res.messages || [];
  }

  static async sendMessage(
    apiUtil: ApiUtil,
    rideId: string,
    content: string,
  ): Promise<void> {
    await apiUtil.post(`/chat/${rideId}/message`, { content });
  }

  static openSocket(
    userId: string,
    roomId: string,
    onMessage: (evt: MessageEvent) => void,
  ): WebSocket {
    const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:3000"}/ws?user_id=${userId}&room_id=${roomId}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = onMessage;
    return ws;
  }
}
