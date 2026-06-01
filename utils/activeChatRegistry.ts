// Tracks the single chat room currently visible in the foreground.
// The notification handler uses it to suppress banners for messages the user
// can already read in the open conversation.

let activeChatRoomId: string | null = null;

/**
 * Set the active room id: ride UUID for group chat or `dm_<uid>_<uid>` for DM.
 *
 * Pass null, or call clearActiveChat, when the chat screen unmounts.
 */
export function setActiveChat(roomId: string | null): void {
  activeChatRoomId = typeof roomId === "string" && roomId.length > 0 ? roomId : null;
}

export function clearActiveChat(): void {
  activeChatRoomId = null;
}

function getActiveChat(): string | null {
  return activeChatRoomId;
}

/**
 * Returns true when an incoming notification targets the active chat room.
 */
export function isNotificationForActiveChat(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!activeChatRoomId || !data) return false;
  const type = typeof data.type === "string" ? data.type : "";
  if (type === "chat_message") {
    const rideId = typeof data.ride_id === "string" ? data.ride_id : "";
    return rideId === activeChatRoomId;
  }
  if (type === "direct_message") {
    const dmId = typeof data.dm_room_id === "string" ? data.dm_room_id : "";
    return dmId === activeChatRoomId;
  }
  return false;
}
