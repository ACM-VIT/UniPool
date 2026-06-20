import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StatusBar,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AppColors from "../../design_systems/colors";
import { useThemeColors } from "../../contexts/ThemeContext";
import { useApi } from "../../utils/ApiUtil";
import { useTabletContentStyle } from "../../utils/responsive";
import LoadingComponent from "../../components/LoadingComponent";
import EmptyState from "../../components/EmptyState";
import RouteStack from "../../components/RouteStack";
import PressableScale from "../../components/PressableScale";
import { appHref } from "../../navigation/routes";

const clockIcon = require("../../assets/clock.png");

// Responsive sizing helpers — mirrors RideCard so the chat row and
// the ride card share the same proportions, padding, and type scale.
const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const getFontSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};
const getIconSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

type ChatRoom = {
  id: string;
  title: string;
  start_location: string;
  end_location: string;
  start_time: string;
  subtitle: string;
  participants: string;
  host_user_id: string;
  host_user_name: string;
  host_profile_picture_url?: string;
  host_is_verified?: boolean;
  chat_name?: string;
  viewer_role:
    | "host"
    | "confirmed_passenger"
    | "pending_passenger"
    | "rejected_passenger"
    | "passenger";
  notifications_muted?: boolean;
  unread_count?: number;
  last_message?: {
    id: string;
    content: string;
    sender: string;
    sender_id: string;
    timestamp: string;
  };
};

type ChatRoomRow = ChatRoom & {
  role: ReturnType<typeof roleBadge>;
  preview: string;
  ts: string;
  tripDateTime: { time: string; date: string };
  unread: boolean;
  isPending: boolean;
  showRolePill: boolean;
  hostFirstName: string;
};

type ChatListItem =
  | { type: "pending_header"; key: string }
  | { type: "pending_request"; key: string; request: PendingRequestRow; isLast: boolean }
  | { type: "active_header"; key: string }
  | { type: "chat"; key: string; room: ChatRoomRow; isLast: boolean };

// Host-only section returned by /chats/me — one row per pending
// booking on a ride the viewer hosts, paired with the DM thread used
// to talk to that requester before the accept/reject decision.
type PendingRequestRow = {
  booking_id: string;
  ride_id: string;
  dm_room_id: string;
  requester_id: string;
  requester_name: string;
  requester_profile_picture_url?: string;
  requester_is_verified?: boolean;
  ride_start_location: string;
  ride_end_location: string;
  ride_start_time: string;
  requested_at: string;
  unread_count?: number;
  last_message?: {
    content: string;
    sender_id: string;
    timestamp: string;
  };
};

type Props = {
  setNavBarVariant?: (variant: 0 | 1 | 2) => void;
};

let chatListTimeFormatter: Intl.DateTimeFormat | null = null;
  try {
    chatListTimeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    chatListTimeFormatter = null;
  }

let chatListShortDateFormatter: Intl.DateTimeFormat | null = null;
  try {
    chatListShortDateFormatter = new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
    });
  } catch {
    chatListShortDateFormatter = null;
  }

let chatListTripDateFormatter: Intl.DateTimeFormat | null = null;
  try {
    chatListTripDateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    chatListTripDateFormatter = null;
  }

let chatListTripTimeFormatter: Intl.DateTimeFormat | null = null;
  try {
    chatListTripTimeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    chatListTripTimeFormatter = null;
  }

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  if (same) return chatListTimeFormatter?.format(d) ?? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return chatListShortDateFormatter?.format(d) ?? d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
};

// Trip departure time + date for the card's right column. Mirrors
// RideCard's `1700 hrs` + date pairing so the chat list speaks the
// same vocabulary as the rest of the app.
const formatTripDateTime = (iso: string): { time: string; date: string } => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { time: "", date: "" };
  const time = `${chatListTripTimeFormatter?.format(d) ?? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`} hrs`;
  const date = chatListTripDateFormatter?.format(d) ?? d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { time, date };
};

const roleBadge = (role: ChatRoom["viewer_role"]) => {
  switch (role) {
    case "host":
      return { label: "HOSTING", fg: AppColors.primaryLightGreen, bg: AppColors.secondaryDarkGreen };
    case "pending_passenger":
      return { label: "PENDING", fg: "#1B2C26", bg: "#FFB47A" };
    case "rejected_passenger":
      return { label: "DECLINED", fg: AppColors.basicWhite, bg: "#FF6B5B" };
    default:
      return null;
  }
};

/**
 * Trip chat list. Each row IS a RideCard — same surface, padding,
 * dotted-line route block, clock + time. We just swap the bottom
 * half: instead of "seats available" / vehicle PNG, the card carries
 * the conversation's last-message preview + unread state. Keeps the
 * chat list visually consistent with the booking screen so the user
 * recognises trips by the same shape across the app.
 *
 * Pending-passenger trips are included server-side, so a rider who
 * has only requested (not been accepted into) the ride can still
 * message the host from this list — those rows render in the calm
 * greyed-out state RideCard already uses for pending bookings.
 */
// Canonical DM room ID used by `/dm/:dm_room_id/*`. Same convention as
// PassengerInfo's helper — sorting the UUIDs makes the room ID a
// stable function of the pair so both sides land in the same room.
const makeDMRoomId = (a: string, b: string): string => {
  const sorted = [a, b].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

const TripsListScreen: React.FC<Props> = ({ setNavBarVariant }) => {
  const router = useRouter();
  const themeColors = useThemeColors();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const { apiUtil } = useApi();
  const insets = useSafeAreaInsets();
  // iPad-only: phone-shape centred column so the chat list cards
  // don't stretch the full 1032pt canvas. Hook returns null on
  // phones — mobile layout untouched.
  const tabletContentStyle = useTabletContentStyle();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (setNavBarVariant) setNavBarVariant(0);
  }, [setNavBarVariant]);

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<{
        chat_rooms: ChatRoom[];
        pending_requests?: PendingRequestRow[];
        viewer_user_id?: string;
      }>("/chats/me");
      const list = Array.isArray(resp?.chat_rooms) ? resp.chat_rooms : [];
      setChats(list);
      setPendingRequests(Array.isArray(resp?.pending_requests) ? resp!.pending_requests! : []);
      if (resp?.viewer_user_id) setViewerUserId(resp.viewer_user_id);
    } catch (err) {
      console.warn("[ChatList] fetch failed", err);
    }
  }, [apiUtil]);

  // Refresh whenever the screen comes into focus — covers the case
  // where the user just sent a message in a thread and comes back to
  // the list, expecting the last-message preview to be current.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!hasLoadedRef.current) setLoading(true);
        await load();
        hasLoadedRef.current = true;
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openPendingRequest = useCallback((pr: PendingRequestRow) => {
    router.navigate(appHref("ChatMessages", {
      chatId: pr.dm_room_id,
      chatTitle: pr.requester_name || "Pending request",
      userId: viewerUserId || undefined,
      // No subtitle — route + date now live in the centered empty-
      // state card on the chat screen so the header stays light.
      // The receiving screen reads pendingRideStartLocation / End /
      // Time to render that card.
      isGroupChat: false,
      otherUserId: pr.requester_id,
      pendingHostInquiry: true,
      // Mark explicitly: the HOST is viewing a requester's thread.
      // The passenger-side openChat() path below leaves this false,
      // so ChatMessages can pick the right copy + show accept/reject
      // controls only for the host.
      viewerIsHost: true,
      pendingRideId: pr.ride_id,
      // Reusing `pendingHostName` as the "other party's display name"
      // — for the host, that's the requester (Priya); for the
      // passenger, the host. The param name is a historical artefact.
      pendingHostName: pr.requester_name,
      pendingRideStartLocation: pr.ride_start_location,
      pendingRideEndLocation: pr.ride_end_location,
      pendingRideStartTime: pr.ride_start_time,
      hostPendingRequestBookingId: pr.booking_id,
    } as any));
  }, [router, viewerUserId]);

  const openChat = useCallback((room: ChatRoom) => {
    // Pending passengers haven't joined the ride yet — they shouldn't
    // see (or be able to message into) the group thread. Route them to
    // a 1:1 DM with the host instead, using the existing
    // `dm_<sorted_uuids>` infrastructure. Once accepted they'll see the
    // group chat in this same list.
    if (room.viewer_role === "pending_passenger" && viewerUserId) {
      router.navigate(appHref("ChatMessages", {
        chatId: makeDMRoomId(viewerUserId, room.host_user_id),
        chatTitle: room.host_user_name || "Host",
        userId: viewerUserId || undefined,
        // Subtitle dropped — route + date are now shown by the
        // centered empty-state card on the chat screen.
        isGroupChat: false,
        otherUserId: room.host_user_id,
        pendingHostInquiry: true,
        pendingRideId: room.id,
        pendingHostName: room.host_user_name,
        pendingRideStartLocation: room.start_location,
        pendingRideEndLocation: room.end_location,
        pendingRideStartTime: room.start_time,
      }));
      return;
    }

    // Short destination — strip anything after the first comma so
    // "Powell Street BART Station, San Francisco" → "Powell Street
    // BART Station". The header doesn't need the city repeated.
    const shortDest = ((room.end_location || "").split(",")[0] || "").trim();
    router.navigate(appHref("ChatMessages", {
      chatId: room.id,
      // Short destination title fits the narrow chat header.
      chatTitle: room.chat_name || (shortDest ? `Trip to ${shortDest}` : "Trip"),
      userId: viewerUserId || undefined,
      // Trip metadata lives one tap away in chat settings.
      isGroupChat: true,
      hostUserId: room.host_user_id,
      viewerRole: room.viewer_role,
      notificationsMuted: !!room.notifications_muted,
    } as any));
  }, [router, viewerUserId]);

  const chatRows = useMemo<ChatRoomRow[]>(
    () =>
      chats.map((room) => {
        const role = roleBadge(room.viewer_role);
        const lastMsg = room.last_message;
        const isPending = room.viewer_role === "pending_passenger";
        return {
          ...room,
          role,
          preview: lastMsg
            ? `${room.viewer_role === "host" || lastMsg.sender_id === room.host_user_id ? "" : `${lastMsg.sender}: `}${lastMsg.content}`
            : "No messages yet",
          ts: lastMsg ? formatTimestamp(lastMsg.timestamp) : "",
          tripDateTime: formatTripDateTime(room.start_time),
          unread: !!room.unread_count && room.unread_count > 0,
          isPending,
          // DECLINED still needs a label — the user has to know their
          // request was actively rejected. Pending uses a whole-card visual
          // treatment instead of a pill.
          showRolePill: !!role && room.viewer_role !== "pending_passenger" && room.viewer_role !== "host",
          hostFirstName: (room.host_user_name || "").trim().split(/\s+/)[0] || "the host",
        };
      }),
    [chats],
  );

  const renderChatRow = useCallback((item: ChatRoomRow, isLast: boolean) => {
    const role = item.role;

    return (
      <PressableScale
        style={[
          styles.card,
          themeColors.mode === "dark" && { backgroundColor: themeColors.surface, borderColor: themeColors.inkSubtle },
          item.isPending && styles.cardPending,
          !isLast && styles.chatCardSpacer,
        ]}
        onPress={() => openChat(item)}
      >
        <View style={styles.topContainer}>
          {/* Shared RouteStack — pin → dashed connector → arrow. The
              pending state swaps to a coral accent against the peach
              card so it still reads as "needs your attention" without
              breaking the icon language. */}
          <View style={styles.routeContainer}>
            <RouteStack
              tone="onLime"
              accentColor={item.isPending ? "#D24432" : themeColors.textPrimary}
              textColor={themeColors.textPrimary}
              start={item.start_location}
              end={item.end_location}
              numberOfLines={2}
              compact
              // styles.locationText bakes `color: basicBlack` which
              // wins over the `textColor` prop above because RouteStack
              // applies textStyle LAST in the style array. Append the
              // themed colour here so the chat-list location text
              // reads correctly in both modes.
              textStyle={[styles.locationText, { color: themeColors.textPrimary }]}
            />
          </View>

          {/* Right column — trip date + time. The peach surface and
              the CTA row below already say "pending" loudly enough;
              no extra status pill is needed in this slot. */}
          <View style={styles.detailsContainer}>
            <View style={styles.timeContainer}>
              <Image
                source={clockIcon}
                style={[styles.timeIcon, { tintColor: themeColors.textSecondary }]}
                resizeMode="contain"
              />
              <Text style={[styles.detailText, { color: themeColors.textPrimary }]}>
                {item.tripDateTime.time}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: themeColors.textSecondary }]}>
              {item.tripDateTime.date}
            </Text>
            {!item.isPending && item.showRolePill && role ? (
              <View style={[styles.rolePill, { backgroundColor: role.bg }]}>
                <Text style={[styles.rolePillText, { color: role.fg }]}>{role.label}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom sub-cell. For pending, this becomes a clear
            "tap to message host" CTA — the entire point of the row.
            For confirmed/hosting, it's the last-message preview. */}
        {item.isPending ? (
          <View style={[styles.bottomContainer, styles.bottomContainerPending]}>
            <View style={styles.pendingCtaIcon}>
              <Text style={styles.pendingCtaIconGlyph}>›</Text>
            </View>
            <Text style={styles.pendingCtaText} numberOfLines={2}>
              Message {item.hostFirstName} while you wait for approval
            </Text>
          </View>
        ) : (
          <View style={styles.bottomContainer}>
            <Text
              style={[
                styles.preview,
                { color: item.unread ? themeColors.textPrimary : themeColors.textSecondary },
                item.unread && styles.previewUnread,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.preview}
            </Text>
            <View style={styles.bottomRight}>
              {item.ts ? (
                <Text style={[styles.previewTimestamp, item.unread && styles.previewTimestampUnread]}>
                  {item.ts}
                </Text>
              ) : null}
              {item.unread ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {(item.unread_count || 0) > 99 ? "99+" : item.unread_count}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </PressableScale>
    );
  }, [openChat]);

  const unreadTotal = useMemo(
    () => chatRows.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [chatRows],
  );

  const listItems = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    if (pendingRequests.length > 0) {
      items.push({ type: "pending_header", key: "pending-header" });
      pendingRequests.forEach((request, index) => {
        items.push({
          type: "pending_request",
          key: `pending-${request.booking_id}`,
          request,
          isLast: index === pendingRequests.length - 1,
        });
      });
      if (chatRows.length > 0) {
        items.push({ type: "active_header", key: "active-header" });
      }
    }
    chatRows.forEach((room, index) => {
      items.push({
        type: "chat",
        key: `chat-${room.id}`,
        room,
        isLast: index === chatRows.length - 1,
      });
    });
    return items;
  }, [chatRows, pendingRequests]);

  const renderListItem = useCallback(({ item }: { item: ChatListItem }) => {
    switch (item.type) {
      case "pending_header":
        return (
          <Text style={[
            styles.pendingSectionTitle,
            themeColors.mode === "dark" && { color: themeColors.textSecondary, opacity: 1 },
          ]}>
            Pending requests
          </Text>
        );
      case "pending_request":
        return (
          <PendingRequestCard
            request={item.request}
            isLast={item.isLast}
            onPress={() => openPendingRequest(item.request)}
          />
        );
      case "active_header":
        return (
          <Text style={[
            styles.activeChatsLabel,
            themeColors.mode === "dark" && { color: themeColors.textSecondary, opacity: 1 },
          ]}>
            Active chats
          </Text>
        );
      case "chat":
        return renderChatRow(item.room, item.isLast);
      default:
        return null;
    }
  }, [openPendingRequest, renderChatRow, themeColors]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        backgroundColor={themeColors.statusBarBackground}
        barStyle={themeColors.statusBarStyle}
      />

      {/* Centred phone-shape column on iPad so the Chats list reads
          at a digestible width instead of stretching the lime canvas.
          On phone `tabletContentStyle` is null so this is just
          `flex: 1`. */}
      <View style={[{ flex: 1 }, tabletContentStyle]}>
      {/* Header — bold title with an optional unread count chip on
          the right (Linear / Things inbox idiom). No subtitle —
          headers do their job by being clear, not by talking. */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Chats</Text>
          {unreadTotal > 0 ? (
            <View style={styles.headerUnreadChip}>
              <Text style={styles.headerUnreadChipText}>
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {loading ? (
        <LoadingComponent />
      ) : chatRows.length === 0 && pendingRequests.length === 0 ? (
        <EmptyState
          // Cropped emoji-only version — the full no-rides.png has
          // "Uh Oh! No Rides Available" baked into the image, which
          // collided with our own title + body below it.
          image={require("../../assets/no-rides-emoji.png")}
          imageSize={140}
          title="No trip chats yet"
          body="Book a seat or post a ride and the conversation will land here."
          ctaLabel="Find a ride"
          onPressCta={() => router.navigate(appHref("HomeScreen"))}
        />
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(it) => it.key}
          renderItem={renderListItem}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppColors.secondaryDarkGreen}
            />
          }
        />
      )}
      </View>
    </View>
  );
};

// Compact card surfaced under "Pending requests" on the host's chat
// list. One row per requester awaiting an accept/reject decision; tap
// opens the DM with that requester.
const PendingRequestCard: React.FC<{
  request: PendingRequestRow;
  isLast: boolean;
  onPress: () => void;
}> = ({ request, isLast, onPress }) => {
  const themeColors = useThemeColors();
  const isDark = themeColors.mode === "dark";
  const unread = (request.unread_count || 0) > 0;
  const firstName = (request.requester_name || "").trim().split(/\s+/)[0] || "Someone";
  // Short destination — strip the part after the first comma so long
  // names like "Powell Street BART Station, San Francisco" become
  // "Powell Street BART Station" instead of mid-name truncating.
  const shortDest = ((request.ride_end_location || "").split(",")[0] || "").trim();
  const tripLabel = shortDest ? `Trip to ${shortDest}` : "Trip request";
  const preview = request.last_message
    ? request.last_message.content
    : `Tap to chat with ${firstName} before deciding`;
  // Dark mode equivalent of the peach `#FFF1DF` alert tile — a warm
  // dark surface with a hint of peach undertone so the "this needs
  // your attention" personality survives without screaming a cream
  // card on the charcoal canvas. Subtle warm border instead of the
  // peach saturation does the heavy lifting.
  const darkPendingCard = isDark
    ? {
        backgroundColor: "#241F1B",
        borderWidth: 1,
        borderColor: "rgba(255,200,150,0.10)",
      }
    : null;
  return (
    <PressableScale
      style={[styles.pendingCard, !isLast && styles.pendingCardSpacer, darkPendingCard]}
      onPress={onPress}
    >
      {/* Avatar + initial-letter fallback removed — the requester
          name + route already identify the row, and the initial
          read as visually random next to a real ride card. Unread
          state is now communicated via the pill on the right
          instead of a tiny dot floating off an avatar. */}
      <View style={styles.pendingCardBody}>
        <View style={styles.pendingTopRow}>
          <Text style={[styles.pendingRequesterName, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
            {request.requester_name || "Someone"}
          </Text>
          {unread ? <View style={styles.pendingUnreadPill} /> : null}
        </View>
        <Text style={[styles.pendingRouteText, isDark && { color: themeColors.textSecondary, opacity: 1 }]} numberOfLines={1}>
          {tripLabel}
        </Text>
        <Text
          style={[
            styles.pendingPreview,
            unread && styles.pendingPreviewUnread,
            isDark && { color: themeColors.textSecondary, opacity: unread ? 1 : 1 },
          ]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      <View style={styles.pendingCardRight}>
        <Text style={[styles.pendingCardChevron, isDark && { color: themeColors.textSecondary, opacity: 1 }]}>›</Text>
      </View>
    </PressableScale>
  );
};

// Chat rows borrow RideCard's visual idiom — dotted-line route block
// on the left, clock + time on the right, all on a white card with
// the same shadow + radius. The bottom row (preview + unread) is a
// hairline-divided sub-cell that adds the chat-specific content
// without disturbing the rest of the card's geometry. Pending uses
// the same calm grey treatment RideCard already uses.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },

  header: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 34,
    letterSpacing: -0.9,
    color: AppColors.secondaryDarkGreen,
    lineHeight: 38,
  },
  // Small forest chip with lime number — glanceable unread total at
  // the top of the screen. Sits next to the title like the inbox
  // counters in Things / Linear / Notion.
  headerUnreadChip: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUnreadChipText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: 6,
    paddingBottom: 140,
  },
  chatCardSpacer: {
    marginBottom: hp(1.5),
  },

  /* Host-only "Pending requests" section that sits above the regular
     chat list. Tight peach-tinted card stack so the host can scan
     waiting requesters at a glance. */
  // Section labels — match the canonical HomeScreen `sectionTitle`
  // style ("Where'd you like to go?", "Your trips", etc.). Bold
  // weight, sentence-case, soft opacity, no uppercase / no
  // letter-spacing inflation. Keeps the chat tab visually coherent
  // with the rest of the app.
  pendingSectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 2,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
    letterSpacing: -0.05,
  },
  activeChatsLabel: {
    marginTop: hp(2),
    marginBottom: 6,
    paddingHorizontal: 2,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.85,
    letterSpacing: -0.05,
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1DF",
    borderRadius: wp(3),
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  pendingCardSpacer: {
    marginBottom: 8,
  },
  // Avatar styles removed along with the avatar block in PendingRequestCard.
  // Unread is now a small lime pill in the top row of the card body
  // instead of a tiny dot anchored off an avatar.
  pendingCardBody: {
    flex: 1,
    minWidth: 0,
  },
  pendingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingUnreadPill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B5B",
  },
  pendingRequesterName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  pendingRouteText: {
    marginTop: 2,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
  },
  pendingPreview: {
    marginTop: 4,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
  },
  pendingPreviewUnread: {
    fontFamily: "NunitoSans_800ExtraBold",
    opacity: 1,
  },
  pendingCardRight: {
    paddingHorizontal: 4,
  },
  pendingCardChevron: {
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    marginTop: -4,
  },

  // RideCard surface: white tile, rounded, soft shadow.
  card: {
    width: "100%",
    backgroundColor: AppColors.basicWhite,
    borderRadius: wp(3),
    padding: wp(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Pending state is its own surface. Warm peach (the same family as
  // the PENDING coral pill) signals "waiting on host" without
  // muting the row. Shadow is killed so it doesn't bleed a dark band
  // onto the lime canvas above the card — that read as a phantom
  // strip in earlier iterations.
  cardPending: {
    backgroundColor: "#FFF1DF",
    shadowOpacity: 0,
    elevation: 0,
  },
  // Outlined / filled route dots get a coral tint on pending cards
  // so the whole route block reads in the same warm palette as the
  // card surface — not jarring forest dots on a peach background.
  dotOutlinePending: {
    borderColor: "#C46A2D",
  },
  dotFilledPending: {
    backgroundColor: "#C46A2D",
  },
  routeConnectorDashPending: {
    backgroundColor: "#C46A2D",
  },
  // CTA sub-cell that replaces the last-message preview on pending
  // rows. The whole point of the row is to nudge the user to message
  // the host, so the bottom half is a literal "tap to message" cell.
  bottomContainerPending: {
    borderTopColor: "rgba(196,106,45,0.30)",
    alignItems: "center",
  },
  pendingCtaIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCtaIconGlyph: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    lineHeight: 20,
    marginLeft: 2,
  },
  pendingCtaText: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: getFontSize(13, 13.5, 14),
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.1,
  },

  topContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  // Route block — same dimensions / spacing as RideCard.
  routeContainer: {
    flex: 1,
    marginRight: wp(2),
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(0.5),
  },
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    marginRight: wp(2.5),
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppColors.secondaryDarkGreen,
    marginRight: wp(2.5),
  },
  routeConnector: {
    marginLeft: 4.5,
    marginVertical: 2,
    width: 2,
    alignItems: "center",
    justifyContent: "space-between",
    height: hp(2.2),
  },
  routeConnectorDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  locationText: {
    flex: 1,
    fontSize: getFontSize(14, 16, 17),
    fontFamily: "NunitoSans_600SemiBold",
    lineHeight: getFontSize(18, 20, 22),
    color: AppColors.basicBlack,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // Right column — trip time + date, with optional role pill below.
  detailsContainer: {
    alignItems: "flex-end",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeIcon: {
    width: getIconSize(13, 14, 14),
    height: getIconSize(13, 14, 14),
    tintColor: AppColors.secondaryDarkGreen,
  },
  detailText: {
    fontSize: getFontSize(12.5, 13.5, 14),
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    letterSpacing: -0.1,
  },
  dateText: {
    marginTop: 4,
    fontSize: getFontSize(11, 11.5, 12),
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.basicBlack,
    opacity: 0.6,
    letterSpacing: 0.2,
  },
  rolePill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rolePillText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.6,
  },

  // Hairline-divided bottom sub-cell with the conversation info.
  // Reads as part of the same card without competing with the route.
  bottomContainer: {
    marginTop: hp(1.4),
    paddingTop: hp(1.2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preview: {
    flex: 1,
    fontSize: getFontSize(12.5, 13.5, 14),
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicBlack,
    opacity: 0.62,
    lineHeight: 18,
  },
  previewUnread: {
    fontFamily: "NunitoSans_700Bold",
    opacity: 0.95,
  },
  bottomRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewTimestamp: {
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
    color: AppColors.basicBlack,
    opacity: 0.45,
  },
  previewTimestampUnread: {
    color: AppColors.secondaryDarkGreen,
    opacity: 1,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 11,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 72,
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.4,
    color: AppColors.secondaryDarkGreen,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyCta: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyCtaText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default TripsListScreen;
