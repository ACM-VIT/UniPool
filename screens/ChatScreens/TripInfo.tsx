import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "../../navigation/router-compat";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import LoadingComponent from "../../components/LoadingComponent";
import EmptyState from "../../components/EmptyState";

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

type Props = {
  navigation?: any;
  setNavBarVariant?: (n: number) => void;
};

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  if (same) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
};

// Trip departure time + date for the card's right column. Mirrors
// RideCard's `1700 hrs` + date pairing so the chat list speaks the
// same vocabulary as the rest of the app.
const formatTripDateTime = (iso: string): { time: string; date: string } => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { time: "", date: "" };
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm} hrs`;
  const date = d.toLocaleDateString(undefined, {
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

const TripsListScreen: React.FC<Props> = ({ navigation, setNavBarVariant }) => {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const { apiUtil } = useApi();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (setNavBarVariant) setNavBarVariant(0);
  }, [setNavBarVariant]);

  // Need the viewer's UUID so pending rows can compute a host DM room
  // ID (`dm_<min(a,b)>_<max(a,b)>`) and open a real 1:1 with the host
  // instead of dumping the user into the ride's group chat.
  useEffect(() => {
    apiUtil
      .get<{ user: { id: string } }>("/user/details")
      .then((r) => setViewerUserId(r.user.id))
      .catch((e) => console.warn("[ChatList] user/details failed", e));
  }, [apiUtil]);

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<{ chat_rooms: ChatRoom[] }>("/chats/me");
      const list = Array.isArray(resp?.chat_rooms) ? resp.chat_rooms : [];
      setChats(list);
    } catch (err) {
      console.warn("[ChatList] fetch failed", err);
    }
  }, [apiUtil]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Refresh whenever the screen comes into focus — covers the case
  // where the user just sent a message in a thread and comes back to
  // the list, expecting the last-message preview to be current.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openChat = (room: ChatRoom) => {
    const dateSub = new Date(room.start_time).toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

    // Pending passengers haven't joined the ride yet — they shouldn't
    // see (or be able to message into) the group thread. Route them to
    // a 1:1 DM with the host instead, using the existing
    // `dm_<sorted_uuids>` infrastructure. Once accepted they'll see the
    // group chat in this same list.
    if (room.viewer_role === "pending_passenger" && viewerUserId) {
      navigation?.navigate("ChatMessages", {
        chatId: makeDMRoomId(viewerUserId, room.host_user_id),
        chatTitle: room.host_user_name || "Host",
        chatSubtitle: `${room.start_location} → ${room.end_location} · ${dateSub}`,
        isGroupChat: false,
        otherUserId: room.host_user_id,
        // Tells ChatMessages to render the "your request is pending —
        // host-only conversation" banner instead of the safety strip.
        pendingHostInquiry: true,
        pendingRideId: room.id,
        pendingHostName: room.host_user_name,
      });
      return;
    }

    navigation?.navigate("ChatMessages", {
      chatId: room.id,
      chatTitle: `${room.start_location} → ${room.end_location}`,
      chatSubtitle: dateSub,
      isGroupChat: true,
      hostUserId: room.host_user_id,
      viewerRole: room.viewer_role,
    });
  };

  const renderRow = ({ item }: { item: ChatRoom }) => {
    const role = roleBadge(item.viewer_role);
    const lastMsg = item.last_message;
    const preview = lastMsg
      ? `${item.viewer_role === "host" || lastMsg.sender_id === item.host_user_id ? "" : lastMsg.sender + ": "}${lastMsg.content}`
      : "No messages yet";
    const ts = lastMsg ? formatTimestamp(lastMsg.timestamp) : "";
    const tripDateTime = formatTripDateTime(item.start_time);
    const unread = !!item.unread_count && item.unread_count > 0;
    const isPending = item.viewer_role === "pending_passenger";
    // DECLINED still needs a label — the user has to know their
    // request was actively rejected. Pending uses a whole-card visual
    // treatment instead of a pill.
    const showRolePill = !!role && item.viewer_role !== "pending_passenger" && item.viewer_role !== "host";
    const hostFirstName =
      (item.host_user_name || "").trim().split(/\s+/)[0] || "the host";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, isPending && styles.cardPending]}
        onPress={() => openChat(item)}
      >
        <View style={styles.topContainer}>
          {/* Route block — outlined dot → dotted connector → filled
              dot, matching RideCard / RideDetailsSelector /
              PreviousTripsCompressed. One route idiom across the
              whole app. */}
          <View style={styles.routeContainer}>
            <View style={styles.locationContainer}>
              <View style={[styles.dotOutline, isPending && styles.dotOutlinePending]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {item.start_location}
              </Text>
            </View>
            <View style={styles.routeConnector}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[styles.routeConnectorDash, isPending && styles.routeConnectorDashPending]}
                />
              ))}
            </View>
            <View style={styles.locationContainer}>
              <View style={[styles.dotFilled, isPending && styles.dotFilledPending]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {item.end_location}
              </Text>
            </View>
          </View>

          {/* Right column — trip date + time. The peach surface and
              the CTA row below already say "pending" loudly enough;
              no extra status pill is needed in this slot. */}
          <View style={styles.detailsContainer}>
            <View style={styles.timeContainer}>
              <Image source={clockIcon} style={styles.timeIcon} resizeMode="contain" />
              <Text style={styles.detailText}>{tripDateTime.time}</Text>
            </View>
            <Text style={styles.dateText}>{tripDateTime.date}</Text>
            {!isPending && showRolePill ? (
              <View style={[styles.rolePill, { backgroundColor: role.bg }]}>
                <Text style={[styles.rolePillText, { color: role.fg }]}>{role.label}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom sub-cell. For pending, this becomes a clear
            "tap to message host" CTA — the entire point of the row.
            For confirmed/hosting, it's the last-message preview. */}
        {isPending ? (
          <View style={[styles.bottomContainer, styles.bottomContainerPending]}>
            <View style={styles.pendingCtaIcon}>
              <Text style={styles.pendingCtaIconGlyph}>›</Text>
            </View>
            <Text style={styles.pendingCtaText} numberOfLines={2}>
              Message {hostFirstName} while you wait for approval
            </Text>
          </View>
        ) : (
          <View style={styles.bottomContainer}>
            <Text
              style={[styles.preview, unread && styles.previewUnread]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {preview}
            </Text>
            <View style={styles.bottomRight}>
              {ts ? (
                <Text style={[styles.previewTimestamp, unread && styles.previewTimestampUnread]}>
                  {ts}
                </Text>
              ) : null}
              {unread ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {(item.unread_count || 0) > 99 ? "99+" : item.unread_count}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const unreadTotal = chats.reduce(
    (sum, c) => sum + (c.unread_count || 0),
    0,
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      {/* Header — bold title with an optional unread count chip on
          the right (Linear / Things inbox idiom). No subtitle —
          headers do their job by being clear, not by talking. */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Chats</Text>
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
      ) : chats.length === 0 ? (
        <EmptyState
          image={require("../../assets/no-rides.png")}
          title="No trip chats yet"
          body="Book a seat or post a ride and the conversation will land here."
          ctaLabel="Find a ride"
          onPressCta={() => navigation?.navigate("HomeScreen")}
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(it) => it.id}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  separator: { height: hp(1.5) },

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
