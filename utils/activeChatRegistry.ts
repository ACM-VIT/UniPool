// Tiny module-scoped registry of "what chat is the user currently
// looking at?". Read by the global expo-notifications handler in
// app/_layout.tsx to suppress incoming push banners for messages
// the user can already see in the open conversation.
//
// The server already does the same suppression — fanOutChatNotification
// and fanOutDMNotification both filter recipients against the WebSocket
// presence map before sending FCM. This registry is the belt-and-
// suspenders for races where the push lands faster than the WebSocket
// join completes, or where the recipient's app was foregrounded with
// a stale FCM payload queued.
//
// Single-value registry — RN apps only have one foreground chat at
// any time; the chat screen rotates the value on mount/unmount.

let activeChatRoomId: string | null = null;

/**
 * Set the chat room the user is currently looking at. Pass the
 * canonical room id: for a ride chat that's the ride UUID as a
 * plain string; for a DM that's the full `dm_<uid>_<uid>` token
 * (matches the data.ride_id / data.dm_room_id values the FCM
 * payload carries).
 *
 * Pass `null` (or call clearActiveChat) when the chat screen
 * unmounts so subsequent pushes for that room are no longer
 * suppressed.
 */
export function setActiveChat(roomId: string | null): void {
  activeChatRoomId = typeof roomId === "string" && roomId.length > 0 ? roomId : null;
}

export function clearActiveChat(): void {
  activeChatRoomId = null;
}

export function getActiveChat(): string | null {
  return activeChatRoomId;
}

/**
 * Returns true iff the notification payload (from
 * Notifications.getPresentedNotificationsAsync or the handler's
 * incoming notification.request.content.data) targets the chat
 * the user is currently viewing. Suppress the banner in that case.
 *
 * Handles both ride-chat (`ride_id`) and DM (`dm_room_id`)
 * payloads, matching the data keys the backend's FCM helpers set.
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
