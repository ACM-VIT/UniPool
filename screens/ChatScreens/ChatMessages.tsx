import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Host as ExpoHost, TextInput as ExpoTextInput, useNativeState } from "@expo/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import PaymentChatCard from '../../components/PaymentChatCard';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';
import { useUser } from '../../contexts/UserContext';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useTabletContentStyle } from '../../utils/responsive';
import { passengerSeatsLeft } from '../../utils/seatMath';
import ChatService from '../../utils/ChatService';
import { setActiveChat, clearActiveChat } from '../../utils/activeChatRegistry';
import BrandedAlert from "../../components/BrandedAlert";
import ChevronBack from "../../components/ChevronBack";
import RouteStack from "../../components/RouteStack";
import ShareRideSheet from "../../components/ShareRideSheet";
import SheetShell, { sheetUi } from "../../components/SheetShell";
import { useDecodedLocalSearchParams } from "../../navigation/routes";
import { scheduleIdleTask, type ScheduledIdleTask } from "../../utils/scheduleIdleTask";

/**
 * Quick-reply chips shown above the keyboard when the input is empty.
 * Ordered for ride logistics: greet, status, location, ETA. Lifted from
 * the Gojek "Quick chat", Bolt onboarding chips, and Uber "I'm here" /
 * "Be right there" patterns we sourced from Mobbin.
 */
const QUICK_REPLIES = [
  '👋',
  "On my way",
  "I'm here",
  "5 min late",
  "Where are you?",
  "Thanks!",
];
const PROFILE_RETRY_DELAY_MS = 30_000;
const REPORT_REASONS: Array<{ key: string; label: string }> = [
  { key: 'safety', label: 'Safety concern' },
  { key: 'harassment', label: 'Harassment or hate' },
  { key: 'scam', label: 'Scam or fraud' },
  { key: 'spam', label: 'Spam' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'other', label: 'Something else' },
];
const NOOP = () => {};

const SENDER_PALETTE = [
  '#B5D750',
  '#F09E5C',
  '#FFD166',
  '#A5D9C5',
  '#9EC9F0',
  '#E6A5D3',
  '#C6B7F3',
  '#FF8E72',
];
const senderColorCache = new Map<string, string>();

const getSenderColor = (id?: string): string => {
  if (!id) return SENDER_PALETTE[0];
  const cached = senderColorCache.get(id);
  if (cached) return cached;
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const color = SENDER_PALETTE[h % SENDER_PALETTE.length];
  if (senderColorCache.size > 512) senderColorCache.clear();
  senderColorCache.set(id, color);
  return color;
};

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  role?: 'admin' | 'member';
}

type UserProfile = { name: string; avatar?: string };

interface RideDetails {
  id: string;
  title: string;
  destination: string;
  departure: string;
  date: string;
  time: string;
  startTimeIso?: string;
  price?: string;
  driverName?: string;
  totalSeats?: number;
  availableSeats?: number;
  hostUserId?: string;
  isUserHost?: boolean;
}

type ChatRouteParams = {
  chatId?: string;
  chatRoom?: { id: string; title?: string; subtitle?: string };
  chatTitle?: string;
  chatSubtitle?: string;
  userId?: string;
  isGroupChat?: boolean;
  otherUserId?: string;
  // Host of the ride this chat is attached to. Used to detect when
  // the viewer is the host (e.g. for the host-empty-state card).
  hostUserId?: string;
  viewerRole?: string;
  notificationsMuted?: boolean;
  // Set when TripsListScreen opens a 1:1 with the host because the
  // viewer's booking is still pending. Used to swap the safety
  // strip for an explicit "you're messaging the host while your
  // request is pending" explainer.
  pendingHostInquiry?: boolean;
  // True when the HOST is viewing the requester's DM (gives them
  // accept/reject controls). False/undefined = passenger view.
  viewerIsHost?: boolean;
  pendingRideId?: string;
  pendingHostName?: string;
  hostPendingRequestBookingId?: string;
  // Ride context now travels here instead of the header subtitle —
  // rendered inside the centered empty-state card so the header
  // stays minimal (just the other party's name + back + menu).
  pendingRideStartLocation?: string;
  pendingRideEndLocation?: string;
  pendingRideStartTime?: string;
};

type ChatRow =
  | { kind: 'msg'; message: ChatMessage; id: string }
  | { kind: 'sep'; label: string; id: string }
  | { kind: 'safety'; id: string };

// "Ride with X" / "Ride with X, Y" / "Ride with X, Y & N others".
// The route already lives on the trip card the user came from — the
// chat header's job is to remind them WHO they're talking to, not to
// repeat the route. Falls back to the raw chat title when we don't
// have participants yet (initial paint) or in DMs (where chat title
// is the other person's name).
/**
 * BroadcastPulse — small animated radio-wave icon. Lime concentric
 * rings pulse outward from a static lime dot, signaling "your ride
 * is live and broadcasting." Renders inside the host empty-state
 * card. Two staggered rings so the motion reads as continuous, not
 * a single heartbeat.
 */
const BroadcastPulse: React.FC = () => {
  const a = React.useRef(new Animated.Value(0)).current;
  const b = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.stagger(900, [
        Animated.timing(a, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(b, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [a, b]);

  const ring = (v: Animated.Value) => ({
    width: v.interpolate({ inputRange: [0, 1], outputRange: [18, 60] }),
    height: v.interpolate({ inputRange: [0, 1], outputRange: [18, 60] }),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#B5D750',
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    position: 'absolute' as const,
  });

  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
      <Animated.View style={ring(a)} />
      <Animated.View style={ring(b)} />
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          backgroundColor: '#B5D750',
        }}
      />
    </View>
  );
};

const composeRideWithTitle = (others: { name?: string }[], fallback: string): string => {
  if (others.length === 0) return fallback;
  const firstNames = others
    .map((p) => (p.name || '').trim().split(/\s+/)[0])
    .filter(Boolean);
  if (firstNames.length === 0) return fallback;
  if (firstNames.length === 1) return `Ride with ${firstNames[0]}`;
  if (firstNames.length === 2) return `Ride with ${firstNames[0]} & ${firstNames[1]}`;
  const remaining = firstNames.length - 2;
  return `Ride with ${firstNames[0]}, ${firstNames[1]} & ${remaining} other${remaining === 1 ? '' : 's'}`;
};

const formatChatTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date =
    timestamp instanceof Date
      ? timestamp
      : typeof timestamp === 'number'
        ? new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
        : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return chatTimeFormatter
    ? chatTimeFormatter.format(date)
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const chatTimeFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
})();

const chatDateSeparatorFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return null;
  }
})();

const chatRideDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return null;
  }
})();

const chatDayKey = (date: Date): number =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

const toChatDate = (timestamp: ChatMessage['timestamp']): Date => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp as any);
  return Number.isFinite(date.getTime()) ? date : new Date();
};

const formatChatDateSeparator = (date: Date, todayKey: number, yesterdayKey: number): string => {
  const key = chatDayKey(date);
  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';
  return chatDateSeparatorFormatter
    ? chatDateSeparatorFormatter.format(date)
    : date.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
};

const formatChatRideDate = (date: Date): string =>
  chatRideDateFormatter
    ? chatRideDateFormatter.format(date)
    : date.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

const formatChatRideWhen = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return `${formatChatRideDate(date)} · ${formatChatTime(date)}`;
};

const buildChatRows = (msgs: ChatMessage[]): ChatRow[] => {
  const rows: ChatRow[] = [{ kind: 'safety', id: 'safety-banner' }];
  let prevDayKey = 0;
  const today = new Date();
  const todayKey = chatDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = chatDayKey(yesterday);

  for (const m of msgs) {
    const date = toChatDate(m.timestamp);
    const key = chatDayKey(date);
    if (key !== prevDayKey) {
      rows.push({
        kind: 'sep',
        label: formatChatDateSeparator(date, todayKey, yesterdayKey),
        id: `sep-${key}`,
      });
      prevDayKey = key;
    }
    rows.push({ kind: 'msg', message: m, id: m.id });
  }
  return rows;
};

const messageTimestampKey = (msg: ChatMessage): number => {
  const timestamp = msg.timestamp as any;
  if (timestamp instanceof Date) return timestamp.getTime();
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const areStringListsEqual = (a?: string[], b?: string[]): boolean => {
  const left = a || [];
  const right = b || [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

const areMessageMetadataEqual = (
  a?: Record<string, any>,
  b?: Record<string, any>,
): boolean => {
  if (a === b) return true;
  const left = a || {};
  const right = b || {};
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!Object.is(left[key], right[key])) return false;
  }
  return true;
};

const areMessageListsEquivalent = (a: ChatMessage[], b: ChatMessage[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.text !== right.text ||
      left.senderId !== right.senderId ||
      left.senderName !== right.senderName ||
      left.kind !== right.kind ||
      left.status !== right.status ||
      left.timeLabel !== right.timeLabel ||
      messageTimestampKey(left) !== messageTimestampKey(right) ||
      !areStringListsEqual(left.readBy, right.readBy) ||
      !areMessageMetadataEqual(left.metadata, right.metadata)
    ) {
      return false;
    }
  }
  return true;
};

const processBackendMessage = (backendMsg: any, currentUserId: string): ChatMessage => {
  const messageId =
    backendMsg.id ||
    backendMsg.message_id ||
    backendMsg.temp_id ||
    `local_${Date.now()}_${Math.random()}`;
  const content = backendMsg.content || backendMsg.text || backendMsg.message || '';
  const senderId = backendMsg.sender_id || backendMsg.senderId || backendMsg.user_id || backendMsg.from_user_id || '';
  const senderName = backendMsg.sender_name || backendMsg.senderName || backendMsg.user_name || backendMsg.sender?.name;
  const senderAvatar =
    backendMsg.sender_avatar ||
    backendMsg.senderAvatar ||
    backendMsg.profile_picture_url ||
    backendMsg.sender?.profile_picture_url;
  const timestamp = backendMsg.timestamp || backendMsg.created_at || backendMsg.sent_at;
  const rawReadBy = backendMsg.read_by || backendMsg.readBy || [];
  const readBy = Array.isArray(rawReadBy)
    ? rawReadBy.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];

  let parsedTimestamp: Date;
  if (timestamp) {
    parsedTimestamp = new Date(timestamp);
    if (isNaN(parsedTimestamp.getTime())) {
      console.warn('[ProcessMessage] Invalid timestamp:', timestamp);
      parsedTimestamp = new Date();
    }
  } else {
    parsedTimestamp = new Date();
  }

  const isFromCurrentUser = senderId === currentUserId;
  const hasBeenSeen = readBy.some((id) => id !== currentUserId);

  return {
    id: messageId,
    text: content,
    sender: isFromCurrentUser ? 'user' : 'other',
    senderId,
    senderName: isFromCurrentUser ? 'You' : (senderName || 'Unknown'),
    senderAvatar,
    timestamp: parsedTimestamp,
    timeLabel: formatChatTime(parsedTimestamp),
    status: isFromCurrentUser ? (hasBeenSeen ? 'seen' : 'sent') : undefined,
    readBy,
    kind: backendMsg.kind || 'user',
    metadata: backendMsg.metadata || undefined,
  };
};

const MessageStatus: React.FC<{ status?: ChatMessage['status'] }> = React.memo(({ status }) => {
  let sym = '✓';
  let statusStyle: StyleProp<TextStyle> = chatMessagesStyles.messageStatusDefault;
  switch (status) {
    case 'sending':
      sym = '○';
      break;
    case 'sent':
      sym = '✓';
      break;
    case 'delivered':
      sym = '✓✓';
      break;
    case 'seen':
      sym = '✓✓';
      statusStyle = chatMessagesStyles.messageStatusSeen;
      break;
    case 'failed':
      sym = '!';
      statusStyle = chatMessagesStyles.messageStatusFailed;
      break;
  }
  return <Text style={statusStyle}>{sym}</Text>;
});

const ChatMessageBubble = React.memo(function ChatMessageBubble({
  message,
  isGroupChat,
  userUuid,
  viewerIsHost,
}: {
  message: ChatMessage;
  isGroupChat: boolean;
  userUuid: string | null;
  viewerIsHost: boolean;
}) {
  if (message.kind === 'payment_marker' || message.kind === 'payment_ack') {
    const passengerIdMeta = String((message.metadata as any)?.passenger_id || '');
    const isSelfMarker =
      message.kind === 'payment_marker' &&
      !!userUuid &&
      passengerIdMeta === userUuid;
    return (
      <PaymentChatCard
        message={message}
        viewerIsHost={viewerIsHost && !isSelfMarker}
        onAcked={NOOP}
      />
    );
  }

  const me = message.sender === 'user';
  const senderColor = getSenderColor(message.senderId);
  // Theme-aware overrides: outgoing (own) bubble paints the brand lime
  // accent in dark; incoming bubble paints the elevated surface (raised
  // charcoal) in dark so it reads as a card floating on the canvas.
  // Light mode keeps the historical olive-on-lime / forest-on-lime
  // pairing — those bubbles ARE the brand expression.
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";

  return (
    <View
      style={[
        me ? chatMessagesStyles.messageSent : chatMessagesStyles.messageReceived,
        isDark && { backgroundColor: me ? colors.primary : colors.surface },
      ]}
    >
      {!me && isGroupChat ? (
        <Text style={[chatMessagesStyles.senderName, { color: senderColor }]}>
          {message.senderName}
        </Text>
      ) : null}
      <Text
        style={[
          me ? chatMessagesStyles.messageTextSent : chatMessagesStyles.messageText,
          isDark && { color: me ? colors.textOnAccent : colors.textPrimary },
        ]}
      >
        {message.text}
      </Text>
      <View style={me ? chatMessagesStyles.messageMetaRowEnd : chatMessagesStyles.messageMetaRowStart}>
        <Text
          style={[
            me ? chatMessagesStyles.messageTimeSent : chatMessagesStyles.messageTime,
            isDark && { color: colors.textTertiary },
          ]}
        >
          {message.timeLabel || formatChatTime(message.timestamp)}
        </Text>
        {me ? <MessageStatus status={message.status} /> : null}
      </View>
    </View>
  );
}, (prev, next) =>
  prev.message === next.message &&
  prev.isGroupChat === next.isGroupChat &&
  prev.userUuid === next.userUuid &&
  prev.viewerIsHost === next.viewerIsHost,
);

const ChatConversationScreen: React.FC<Pick<ChatMessagesScreenProps, "setNavBarVariant">> = ({
  setNavBarVariant,
}) => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { user: contextUser, loading: contextUserLoading } = useUser();
  const chatParams = useDecodedLocalSearchParams<ChatRouteParams>();
  // Theme tokens drive the chrome — canvas, header, composer pill,
  // quick-reply chips, safety strip, typing indicator. Bubble interiors
  // are themed inside ChatMessageBubble (which also calls this hook).
  const colors = useThemeColors();
  // iPad-only: phone-shape centred column so the header, messages,
  // quick-reply chips, and message input stack at readable widths
  // instead of stretching across 1032pt of lime canvas. Hook returns
  // null on phones so the mobile chat is untouched.
  const tabletContentStyle = useTabletContentStyle();

  const messageDraft = useNativeState("");
  const [hasMessageDraft, setHasMessageDraft] = useState(false);
  const [userUuid, setUserUuid] = useState<string | null>(() => chatParams.userId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(!!chatParams.notificationsMuted);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(true);
  const [settingsLoadedFor, setSettingsLoadedFor] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [k: string]: { name: string; timeout: NodeJS.Timeout } }>({});
  const [isTyping, setIsTyping] = useState(false);
  // Pagination — `hasMoreMessages` tells the FlatList whether the
  // "load older" affordance should be active; `isLoadingOlder` blocks
  // multiple in-flight fetches as the user scrolls.
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // Initial-load suspense — true while the first page of messages is
  // in flight. Drives the skeleton placeholder so the user never
  // stares at an empty pane.
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Report sheet — open from chat settings, posts to /reports.
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasMessageDraftRef = useRef(false);
  const flatListRef = useRef<FlatList<ChatRow> | null>(null);
  const onlineUserIdsRef = useRef<Set<string>>(new Set());
  const shouldScrollToEndRef = useRef(false);
  // First-render gate for the scroll-to-bottom path. The initial
  // batch of messages arrives async, so the FlatList mounts empty
  // and `onContentSizeChange` fires once the data lands. On that
  // first call we must jump to the bottom WITHOUT animation so the
  // user lands on the latest message instantly — an animated scroll
  // visibly plays from the top, reading as "the chat opened at the
  // top". Subsequent autoscrolls (after sending a message, after a
  // counterpart's WS message lands while at the bottom) keep the
  // smooth animation.
  const hasInitialScrolledRef = useRef(false);
  const seenStatusIdsRef = useRef<Set<string>>(new Set());
  const typingUsersRef = useRef<{ [k: string]: { name: string; timeout: NodeJS.Timeout } }>({});
  const userProfilesRef = useRef<Record<string, UserProfile>>({});
  const profileRetryBlockedUntilRef = useRef<Record<string, number>>({});
  const firstFocusRoomsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatMessage[]>([]);
  const hasMoreMessagesRef = useRef(hasMoreMessages);
  const isLoadingOlderRef = useRef(isLoadingOlder);

  const replaceMessages = useCallback((nextMessages: ChatMessage[], shouldScrollToEnd: boolean) => {
    setMessages((prev) => {
      if (areMessageListsEquivalent(prev, nextMessages)) {
        return prev;
      }
      if (shouldScrollToEnd) {
        shouldScrollToEndRef.current = true;
      }
      return nextMessages;
    });
  }, []);

  const [chatTitle, setChatTitle] = useState(chatParams.chatTitle ?? 'Vellore to Chennai');
  const chatTitleRef = useRef(chatTitle);
  const isPendingHostInquiry = !!chatParams.pendingHostInquiry;
  const activeChatId = chatParams.chatRoom?.id || chatParams.chatId;

  useEffect(() => {
    chatTitleRef.current = chatTitle;
  }, [chatTitle]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreMessagesRef.current = hasMoreMessages;
  }, [hasMoreMessages]);

  useEffect(() => {
    isLoadingOlderRef.current = isLoadingOlder;
  }, [isLoadingOlder]);

  const otherUserIdFromDMRoom = useMemo(() => {
    const roomId = chatParams.chatRoom?.id || chatParams.chatId || "";
    if (!userUuid || !roomId.startsWith("dm_")) return undefined;
    const ids = roomId.replace(/^dm_/, "").split("_");
    if (ids.length !== 2) return undefined;
    return ids.find((id) => id !== userUuid);
  }, [chatParams.chatId, chatParams.chatRoom?.id, userUuid]);
  const viewerIsHost = !!chatParams.viewerIsHost;

  const otherFirstName =
    (chatParams.pendingHostName || '').trim().split(/\s+/)[0] ||
    (viewerIsHost ? 'them' : 'the host');

  const [bookingActionLoading, setBookingActionLoading] = useState<
    'accept' | 'reject' | null
  >(null);
  const bookingIdForActions = chatParams.hostPendingRequestBookingId;
  const isGroupChat = chatParams.isGroupChat !== false;

  const typingUserList = useMemo(() => Object.values(typingUsers), [typingUsers]);
  const typingText = useMemo(() => {
    if (typingUserList.length === 0) return '';
    if (typingUserList.length === 1) return `${typingUserList[0].name} is typing`;
    if (typingUserList.length === 2) {
      return `${typingUserList[0].name} and ${typingUserList[1].name} are typing`;
    }
    return `${typingUserList[0].name} and ${typingUserList.length - 1} others are typing`;
  }, [typingUserList]);
  const pendingRideWhen = useMemo(
    () => formatChatRideWhen(chatParams.pendingRideStartTime),
    [chatParams.pendingRideStartTime],
  );

  const [hostShareOpen, setHostShareOpen] = useState(false);

  const setOnlineUsers = useCallback((updater: (next: Set<string>) => void) => {
    setOnlineUserIds(prev => {
      const next = new Set(prev);
      updater(next);
      onlineUserIdsRef.current = next;
      return next;
    });
  }, []);

  const applyOnlinePresence = useCallback((snapshot: Set<string>) => {
    setParticipants(prev =>
      prev.map(p => ({
        ...p,
        isOnline: p.id === userUuid || snapshot.has(p.id),
      })),
    );
  }, [userUuid]);

  const setUserProfile = useCallback((uid: string, profile: UserProfile) => {
    setUserProfiles(prev => {
      const existing = prev[uid];
      if (existing?.name === profile.name && existing?.avatar === profile.avatar) {
        return prev;
      }

      const next = { ...prev, [uid]: profile };
      userProfilesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile> => {
    const cached = userProfilesRef.current[uid];
    if (cached?.name && cached.name !== "Unknown") return cached;

    const retryBlockedUntil = profileRetryBlockedUntilRef.current[uid] ?? 0;
    if (cached?.name === "Unknown" && Date.now() < retryBlockedUntil) {
      return cached;
    }

    try {
      const res = await apiUtil.get<{
        user?: { name?: string; avatar?: string; profile_picture_url?: string };
        name?: string;
        avatar?: string;
        profile_picture_url?: string;
      }>(`/user/${uid}`);
      const user = res.user || res;
      const prof = {
        name: user.name || 'Unknown',
        avatar: user.profile_picture_url || user.avatar,
      };
      delete profileRetryBlockedUntilRef.current[uid];
      setUserProfile(uid, prof);
      return prof;
    } catch {
      const fallback = { name: 'Unknown', avatar: undefined };
      profileRetryBlockedUntilRef.current[uid] = Date.now() + PROFILE_RETRY_DELAY_MS;
      setUserProfile(uid, fallback);
      return fallback;
    }
  }, [apiUtil, setUserProfile]);

  useEffect(() => {
    setNavBarVariant?.(0);
    if (chatParams.userId) {
      setUserUuid(chatParams.userId);
      setUserProfile(chatParams.userId, userProfilesRef.current[chatParams.userId] || { name: 'You', avatar: undefined });
      return;
    }

    if (contextUser?.id) {
      setUserUuid(contextUser.id);
      setUserProfile(contextUser.id, {
        name: contextUser.name || 'You',
        avatar: contextUser.profile_picture_url,
      });
      return;
    }

    if (contextUserLoading) return;

    apiUtil
      .get<{ user: { id: string; name: string } }>('/user/details?summary=1')
      .then(resp => {
        setUserUuid(resp.user.id);
        setUserProfile(resp.user.id, { name: resp.user.name || 'You', avatar: undefined });
      })
      .catch((e: any) => {
        if (e?.message === "AUTHENTICATION_REDIRECT") {
          console.log("Authentication redirect in ChatMessages");
          return;
        }
        
        // if (e?.response?.status === 404 && 
        //     e?.response?.data?.message === "User not found in database, signup required") {
        //   console.log("User not found in database - redirect to signup handled by ApiUtil");
        //   return;
        // }
        
        console.warn('[Chat] fetch user failed', e);
      });
  }, [
    apiUtil,
    chatParams.userId,
    contextUser?.id,
    contextUser?.name,
    contextUser?.profile_picture_url,
    contextUserLoading,
    setNavBarVariant,
    setUserProfile,
  ]);

  useEffect(() => {
    if (!userUuid) return;
    setOnlineUsers(next => next.add(userUuid));
  }, [setOnlineUsers, userUuid]);

  useEffect(() => {
    applyOnlinePresence(onlineUserIds);
  }, [applyOnlinePresence, onlineUserIds]);

  useEffect(() => {
    if (typeof chatParams.notificationsMuted === 'boolean') {
      setNotificationsMuted(chatParams.notificationsMuted);
    }
    setSettingsLoadedFor(null);
  }, [activeChatId, chatParams.notificationsMuted]);

  const sendMessageStatus = (mid: string, status: 'delivered' | 'seen') => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userUuid) {
      wsRef.current.send(
        JSON.stringify({ type: 'message_status', message_id: mid, status, user_id: userUuid, timestamp: new Date().toISOString() })
      );
    }
  };

  const appendOrConfirmMessage = (incoming: any, currentUserId: string) => {
    const tempId = incoming.temp_id;
    const serverId = incoming.message_id || incoming.id;
    const nextMessage = processBackendMessage(incoming, currentUserId);

    setMessages(prev => {
      if (tempId) {
        const tempIndex = prev.findIndex(m => m.id === tempId);
        if (tempIndex >= 0) {
          const next = [...prev];
          next[tempIndex] = {
            ...next[tempIndex],
            id: serverId || next[tempIndex].id,
            timestamp: nextMessage.timestamp,
            timeLabel: nextMessage.timeLabel,
            status: 'sent',
          };
          shouldScrollToEndRef.current = true;
          return next;
        }
      }

      const idToCheck = serverId || nextMessage.id;
      if (prev.some(m => m.id === idToCheck || (tempId && m.id === tempId))) {
        return prev;
      }

      const next = [...prev, nextMessage];
      shouldScrollToEndRef.current = true;
      return next;
    });

    if (nextMessage.sender === 'other' && !seenStatusIdsRef.current.has(nextMessage.id)) {
      seenStatusIdsRef.current.add(nextMessage.id);
      requestAnimationFrame(() => {
        sendMessageStatus(nextMessage.id, 'delivered');
        sendMessageStatus(nextMessage.id, 'seen');
      });
    }
  };

  const sendTypingIndicator = (typing: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userUuid) {
      wsRef.current.send(
        JSON.stringify({ type: 'typing', user_id: userUuid, is_typing: typing, timestamp: new Date().toISOString() })
      );
    }
  };
  const sendTypingIndicatorDebounced = (typing: boolean) => {
    typingDebounceRef.current && clearTimeout(typingDebounceRef.current);
    if (typing) sendTypingIndicator(true);
    else typingDebounceRef.current = setTimeout(() => sendTypingIndicator(false), 100);
  };
  const handleTypingStart = () => {
    typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicatorDebounced(true);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicatorDebounced(false);
      typingTimeoutRef.current = null;
    }, 3000);
  };
  const handleTypingStop = () => {
    typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicatorDebounced(false);
    }
  };
  const setComposerDraftPresence = (hasDraft: boolean) => {
    if (hasMessageDraftRef.current === hasDraft) return;
    hasMessageDraftRef.current = hasDraft;
    setHasMessageDraft(hasDraft);
  };
  const handleComposerTextChange = (text: string) => {
    const hasDraft = text.trim().length > 0;
    setComposerDraftPresence(hasDraft);
    if (hasDraft) handleTypingStart();
    else handleTypingStop();
  };
  const clearComposerDraft = () => {
    messageDraft.value = "";
    setComposerDraftPresence(false);
  };

  const addTypingUser = (uid: string, name: string) => {
    if (uid === userUuid) return;
    setTypingUsers(prev => {
      const next = { ...prev };
      next[uid]?.timeout && clearTimeout(next[uid].timeout);
      next[uid] = {
        name,
        timeout: setTimeout(() => setTypingUsers(curr => {
          const c={...curr};
          delete c[uid];
          typingUsersRef.current = c;
          return c;
        }), 5000),
      };
      typingUsersRef.current = next;
      return next;
    });
  };
  const removeTypingUser = (uid: string) => {
    setTypingUsers(prev => {
      const next = { ...prev };
      next[uid]?.timeout && clearTimeout(next[uid].timeout);
      delete next[uid];
      typingUsersRef.current = next;
      return next;
    });
  };

  const fetchChatDetails = useCallback(async (rideId: string) => {
    try {
      const r = await apiUtil.get<{
        id: string;
        host_user_id: string;
        start_location: string;
        end_location: string;
        start_time: string;
        total_price: number;
        total_seats: number;
        booked_seats: number;
        is_user_host: boolean;
        host: { id: string; name: string; profile_picture_url: string };
        bookings: Array<{ passenger_id: string; request_status: string; passenger_name: string; passenger_profile_picture_url: string }>;
      }>(`/ride/details/${rideId}`);

      const startAt = new Date(r.start_time);
      setRideDetails({
        id: r.id,
        title: `${r.start_location} to ${r.end_location}`,
        departure: r.start_location,
        destination: r.end_location,
        date: formatChatRideDate(startAt),
        time: formatChatTime(startAt),
        startTimeIso: r.start_time,
        price: `₹${r.total_price}`,
        driverName: r.host.name,
        totalSeats: r.total_seats,
        // utils/seatMath canonicalises the "passenger seats still
        // available" math. Pre-migration this line carried an inline
        // `+ 1` to discount the host's seat (since total_seats was
        // passenger-only and a separate seat needed to be reserved
        // for the host); post-migration the host's seat is already
        // baked into total_seats, so the helper returns the right
        // count directly.
        availableSeats: passengerSeatsLeft(r.total_seats, r.booked_seats),
        hostUserId: r.host_user_id,
        isUserHost: r.is_user_host,
      });

      const list: Participant[] = [
        {
          id: r.host.id,
          name: r.host.name || 'Unknown',
          avatar: r.host.profile_picture_url,
          isOnline: r.host.id === userUuid || onlineUserIdsRef.current.has(r.host.id),
          role: 'admin',
        },
      ];
      if (r.bookings && Array.isArray(r.bookings)) {
        r.bookings.filter(b => b.request_status === 'accepted').forEach(b =>
          list.push({
            id: b.passenger_id,
            name: b.passenger_name || 'Unknown',
            avatar: b.passenger_profile_picture_url,
            isOnline: b.passenger_id === userUuid || onlineUserIdsRef.current.has(b.passenger_id),
            role: 'member',
          })
        );
      }
      setParticipants(list);

      setRideDetails(prev => prev && ({
        ...prev,
        subtitle: `${list.length} participants`,
        availableSeats: Math.max(0, (prev.totalSeats||0) - list.length),
      }));

      const missingProfileIds = list
        .filter(p => p.id && p.id !== userUuid && (!p.name || p.name === 'Unknown'))
        .map(p => p.id);
      if (missingProfileIds.length > 0) {
        Promise.all(missingProfileIds.map(id => fetchUserProfile(id).then(profile => ({ id, profile }))))
          .then(profiles => {
            const resolvedById = new Map(profiles.map(({ id, profile }) => [id, profile]));
            setParticipants(prev => prev.map(participant => {
              const resolved = resolvedById.get(participant.id);
              return resolved && resolved.name !== 'Unknown'
                ? { ...participant, name: resolved.name, avatar: resolved.avatar || participant.avatar }
                : participant;
            }));
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('[Chat] fetchChatDetails error', e);
      const now = new Date();
      setRideDetails({
        id: rideId,
        title: chatTitleRef.current,
        departure: 'Unknown',
        destination: 'Unknown',
        date: formatChatRideDate(now),
        time: formatChatTime(now),
        startTimeIso: now.toISOString(),
        price: '₹0',
        driverName: 'Unknown',
        totalSeats: 4,
        availableSeats: 1,
      });
      setParticipants([{ id: userUuid||'', name: userProfilesRef.current[userUuid||'']?.name||'You', role: 'member', isOnline: true }]);
    }
  }, [apiUtil, fetchUserProfile, userUuid]);

  const fetchChatSettings = async () => {
    const chatId = activeChatId;
    if (!chatId || chatParams.isGroupChat === false || settingsLoadedFor === chatId) return;

    let settingsStatus: number | undefined;
    let loaded = false;
    try {
      const settingsResult = await apiUtil.get<{
        settings: { chat_name?: string };
        muted?: boolean;
      }>(`/ride/${chatId}/settings`);
      settingsResult.settings.chat_name && setChatTitle(settingsResult.settings.chat_name);
      if (typeof settingsResult.muted === 'boolean') {
        setNotificationsMuted(settingsResult.muted);
      } else {
        try {
          const muteResult = await apiUtil.get<{ muted: boolean }>(`/ride/${chatId}/chat-mute`);
          setNotificationsMuted(!!muteResult.muted);
        } catch {}
      }
      setHasSettingsPermission(true);
      loaded = true;
    } catch (error: any) {
      settingsStatus = error?.response?.status;
      setHasSettingsPermission(settingsStatus !== 403);
      if (settingsStatus !== 403) {
        try {
          const muteResult = await apiUtil.get<{ muted: boolean }>(`/ride/${chatId}/chat-mute`);
          setNotificationsMuted(!!muteResult.muted);
          loaded = true;
        } catch {}
      }
    }
    if (loaded || settingsStatus === 403) {
      setSettingsLoadedFor(chatId);
    }
  };

  useEffect(() => {
    if (!userUuid) return;
    setNavBarVariant?.(0);

    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const isGroup = chatParams.isGroupChat !== false;
    const userId = chatParams.userId || userUuid;
    if (!chatId) return;

    let detailsFetchCancelled = false;
    let detailsFetchTimeout: ReturnType<typeof setTimeout> | null = null;
    let detailsFetchTask: ScheduledIdleTask | null = null;
    const scheduleChatDetailsFetch = () => {
      detailsFetchTask = scheduleIdleTask(() => {
        if (detailsFetchTimeout) {
          clearTimeout(detailsFetchTimeout);
          detailsFetchTimeout = null;
        }
        if (!detailsFetchCancelled) {
          void fetchChatDetails(chatId);
        }
      });
      detailsFetchTimeout = setTimeout(() => {
        detailsFetchTask?.cancel();
        detailsFetchTask = null;
        if (!detailsFetchCancelled) {
          void fetchChatDetails(chatId);
        }
      }, 1200);
    };

    if (isGroup) {
      scheduleChatDetailsFetch();
    } else {
      setRideDetails(null);
      const otherUserId = chatParams.otherUserId || otherUserIdFromDMRoom;
      if (otherUserId) {
        fetchUserProfile(otherUserId).then(p =>
          setParticipants([
            { id: userUuid, name: userProfilesRef.current[userUuid]?.name||'You', role:'member', isOnline:true },
            {
              id: otherUserId,
              name:p.name,
              role:'member',
              isOnline: onlineUserIdsRef.current.has(otherUserId),
            },
          ])
        );
      } else {
        const fallbackName = chatParams.chatTitle?.replace('Chat with ','')||'Other User';
        setParticipants([
          { id:userUuid, name:userProfilesRef.current[userUuid]?.name||'You', role:'member', isOnline:true },
          { id:'unknown', name:fallbackName, role:'member', isOnline:false },
        ]);
      }
    }

    // Initial page (most recent ~50 messages). Older pages are loaded
    // on demand via loadOlderMessages() when the user scrolls to top.
    //
    // On failure: KEEP whatever messages are already in state instead
    // of wiping them. The previous DM branch did `setMessages([])` on
    // error — that meant a single transient fetch failure (network
    // blip, auth token mid-refresh) would empty out a DM and the
    // user would think their messages vanished. With this change, a
    // failed fetch leaves the visible message list alone; the next
    // successful fetch (focus refetch, foreground refetch) reconciles.
    const cachedMessages = ChatService.getCachedMessages(chatId);
    if (cachedMessages) {
      const processed = cachedMessages.messages.map((msg: any) => processBackendMessage(msg, userUuid));
      replaceMessages(processed, true);
      setHasMoreMessages(cachedMessages.hasMore);
      setIsLoadingInitial(false);
    } else {
      setIsLoadingInitial(true);
    }

    ChatService.fetchMessages(apiUtil, chatId, { limit: 50, markRead: true })
      .then((res) => {
        if (!userUuid) return;
        const processed = res.messages.map((msg: any) => processBackendMessage(msg, userUuid));
        replaceMessages(processed, true);
        setHasMoreMessages(res.hasMore);
      })
      .catch((err) => {
        console.warn('[Chat] initial fetchMessages err (keeping existing list)', err);
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });

    let socketClosed = false;
    let activeSocket: WebSocket | null = null;
    ChatService.openSocket(apiUtil, userId, chatId, e => {
      (e.data as string).trim().split('\n').filter(Boolean).forEach(line => {
        try {
          const d = JSON.parse(line);
          if (d.type === 'message') {
            appendOrConfirmMessage(d, userUuid);
          } else if (d.type==='message_status') {
            setMessages(prev=> {
              const next = prev.map(m=> {
                if (m.id===d.message_id) {
                  const rb = [...(m.readBy||[])];
                  if (d.status==='seen' && d.user_id && !rb.includes(d.user_id)) rb.push(d.user_id);
                  return {...m,status:d.status, readBy:rb};
                }
                return m;
              });
              return next;
            });
          } else if (d.type==='typing') {
            d.user_id!==userUuid && (d.is_typing?addTypingUser(d.user_id,d.user_name):removeTypingUser(d.user_id));
          } else if (d.type === 'presence_snapshot' && Array.isArray(d.users)) {
            const snapshotIds = d.users
              .map((u: any) => u?.user_id)
              .filter((id: any): id is string => typeof id === 'string');
            setOnlineUsers(next => {
              next.clear();
              snapshotIds.forEach((id: string) => next.add(id));
              next.add(userUuid);
            });
          } else if (d.type === 'user_joined' && typeof d.user_id === 'string') {
            setOnlineUsers(next => next.add(d.user_id));
            if (typeof d.user_name === 'string') {
              setParticipants(prev =>
                prev.some(p => p.id === d.user_id)
                  ? prev
                  : [...prev, { id: d.user_id, name: d.user_name, role: 'member', isOnline: true }],
              );
            }
          } else if (d.type === 'user_left' && typeof d.user_id === 'string') {
            setOnlineUsers(next => {
              if (d.user_id !== userUuid) next.delete(d.user_id);
            });
          }
        } catch {}
      });
    })
      .then((ws) => {
        if (socketClosed) {
          ws.close();
          return;
        }
        activeSocket = ws;
        wsRef.current = ws;
      })
      .catch((err) => {
        console.warn("[Chat] socket open failed", err);
      });
    return () => {
      socketClosed = true;
      detailsFetchCancelled = true;
      detailsFetchTask?.cancel();
      if (detailsFetchTimeout) {
        clearTimeout(detailsFetchTimeout);
      }
      typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
      typingDebounceRef.current && clearTimeout(typingDebounceRef.current);
      const ws = activeSocket ?? wsRef.current;
      isTyping && ws?.readyState===WebSocket.OPEN && sendTypingIndicator(false);
      Object.values(typingUsersRef.current).forEach(u=>u.timeout&&clearTimeout(u.timeout));
      ws?.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [
    apiUtil,
    chatParams.chatRoom?.id,
    chatParams.chatId,
    chatParams.isGroupChat,
    chatParams.otherUserId,
    chatParams.userId,
    fetchChatDetails,
    fetchUserProfile,
    otherUserIdFromDMRoom,
    replaceMessages,
    userUuid,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!userUuid) return undefined;

      const chatId = chatParams.chatRoom?.id || chatParams.chatId;
      const isGroup = chatParams.isGroupChat !== false;
      if (!chatId) return undefined;

      // Mark this chat as the currently-focused conversation so the
      // root expo-notifications handler suppresses incoming push
      // banners for messages that already animate into this screen.
      // Tied to focus (not mount) so navigating away — even while the
      // screen is still kept alive in the back stack — clears the
      // registry. Server-side suppression via WebSocket presence is
      // the primary defense; this is the belt-and-suspenders for the
      // race where the FCM lands faster than the socket join.
      setActiveChat(chatId);

      let cancelled = false;
      const focusKey = `${chatId}:${userUuid}`;
      const isFirstFocusForRoom = !firstFocusRoomsRef.current.has(focusKey);
      firstFocusRoomsRef.current.add(focusKey);

      if (!isFirstFocusForRoom) {
        if (isGroup) {
          void fetchChatDetails(chatId);
        } else {
          const otherUserId = chatParams.otherUserId || otherUserIdFromDMRoom;
          if (otherUserId) {
            fetchUserProfile(otherUserId).then((profile) => {
              if (cancelled) return;
              setParticipants([
                { id: userUuid, name: userProfilesRef.current[userUuid]?.name || "You", role: "member", isOnline: true },
                {
                  id: otherUserId,
                  name: profile.name,
                  role: "member",
                  isOnline: onlineUserIdsRef.current.has(otherUserId),
                },
              ]);
            });
          }
        }

        // Focus refetch — keeps the visible list in sync with anything
        // that landed in the DB while the user was off-screen (a
        // counterpart's message broadcast while the WS was closed
        // between navigations). On first focus the mount effect is
        // already fetching this same page, so only later focuses run
        // this reconciliation pass.
        ChatService.fetchMessages(apiUtil, chatId, { limit: 50, markRead: true })
          .then((res) => {
            if (cancelled) return;
            const processed = res.messages.map((msg: any) => processBackendMessage(msg, userUuid));
            replaceMessages(processed, false);
            setHasMoreMessages(res.hasMore);
          })
          .catch((err) => {
            console.warn("[Chat] focus fetchMessages err (keeping existing list)", err);
          });
      }

      // Foreground-resume refetch. When the user backgrounds the app
      // mid-chat, the WS closes; messages persisted while away aren't
      // pushed to this screen until something forces a fetch. AppState
      // active transition is that something. Without this, you'd see
      // the user's reported "I opened the chat and my older messages
      // weren't there" pattern — the screen kept stale state since the
      // WS broadcast that delivered them was missed during background.
      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state !== "active" || cancelled) return;
        ChatService.fetchMessages(apiUtil, chatId, { limit: 50, markRead: true })
          .then((res) => {
            if (cancelled || !userUuid) return;
            const processed = res.messages.map((msg: any) =>
              processBackendMessage(msg, userUuid),
            );
            replaceMessages(processed, false);
            setHasMoreMessages(res.hasMore);
          })
          .catch(() => {
            // Same posture as above — silently keep existing list
            // if the foreground-refetch can't reach the server.
          });
      });

      return () => {
        cancelled = true;
        appStateSub.remove();
        clearActiveChat();
      };
    }, [
      apiUtil,
      chatParams.chatRoom?.id,
      chatParams.chatId,
      chatParams.isGroupChat,
      chatParams.otherUserId,
      fetchUserProfile,
      otherUserIdFromDMRoom,
      replaceMessages,
      userUuid,
    ]),
  );

  const sendMessage = (override?: string) => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const text = (override ?? messageDraft.value).trim();
    if (!userUuid || !chatId || !text) return;

    handleTypingStop();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      text,
      sender: 'user',
      senderId: userUuid,
      senderName: 'You',
      senderAvatar: undefined,
      timestamp: new Date(),
      timeLabel: formatChatTime(new Date()),
      status: 'sending',
      readBy: [],
    };
    shouldScrollToEndRef.current = true;
    setMessages(prev => {
      const next = [...prev, optimistic];
      return next;
    });
    clearComposerDraft();

    if (wsRef.current?.readyState===WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type:'message',
        room_id:chatId,
        sender_id:userUuid,
        content:optimistic.text,
        timestamp:new Date().toISOString(),
        temp_id:tempId,
      }));
    } else {
      setMessages(prev => {
        const next = prev.map(m => m.id===tempId?{...m, status:'failed' as const}:m);
        return next;
      });
    }
  };

  const handleMuteToggle = async (val: boolean) => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (!chatId || chatParams.isGroupChat === false) {
      // DMs aren't backed by a ride yet; toggle is local-only.
      setNotificationsMuted(val);
      return;
    }
    // Optimistic flip — re-revert on error.
    setNotificationsMuted(val);
    try {
      // Per-user, per-ride mute. The old /ride/:id/settings route
      // stored this on the ride row, which silently affected
      // everyone in the chat; the dedicated endpoint scopes it to
      // the caller alone.
      await apiUtil.put(`/ride/${chatId}/chat-mute`, { muted: val });
    } catch (error: any) {
      console.warn('[Chat] mute toggle failed:', error?.response?.status);
      setNotificationsMuted(!val);
      if (error?.response?.status === 403) {
        BrandedAlert.alert('Permission Denied', 'You do not have permission to change settings for this ride.');
      } else {
        BrandedAlert.alert("Couldn't save", "Try again in a moment.");
      }
    }
  };

  const handleChatRename = async () => {
    if (!newChatName.trim()) {
      setEditingChatName(false);
      return;
    }
    try {
      const chatId = chatParams.chatRoom?.id || chatParams.chatId;
      if (chatParams.isGroupChat!==false && chatId) {
        await apiUtil.put(`/ride/${chatId}/settings`, { chat_name: newChatName });
        setChatTitle(newChatName);
      } else {
        setChatTitle(newChatName);
      }
    } catch (error: any) {
      console.warn('[Chat] rename failed:', error?.response?.status);
      if (error?.response?.status === 403) {
        BrandedAlert.alert('Permission Denied', 'You do not have permission to rename this chat.');
        setEditingChatName(false);
        setNewChatName('');
        return;
      }
      setChatTitle(newChatName);
    } finally {
      setEditingChatName(false);
      setNewChatName('');
    }
  };

  // Best-guess at the user the reporter wants flagged. For a 1:1 DM
  // it's the other side; for a group chat we default to the host (the
  // most common target) but pass a chat_room_id + ride_id so the
  // moderation surface has full context regardless.
  const inferReportedUserId = (): string | undefined => {
    if (chatParams.isGroupChat === false) {
      return chatParams.otherUserId;
    }
    return rideDetails?.hostUserId;
  };

  const submitReport = async () => {
    if (!reportReason || reportSubmitting) return;
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    setReportSubmitting(true);
    try {
      await apiUtil.post('/reports', {
        reported_user_id: inferReportedUserId() || undefined,
        ride_id: chatParams.isGroupChat !== false ? chatId : undefined,
        chat_room_id: chatId,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setShowReportSheet(false);
      setReportReason(null);
      setReportDetails('');
      BrandedAlert.alert(
        'Report sent',
        "Thanks for letting us know. Our team will review it and follow up if we need more info.",
      );
    } catch (err: any) {
      console.warn('[Chat] report submit failed', err);
      BrandedAlert.alert(
        "Couldn't send report",
        err?.response?.data?.error ||
          "We hit a snag sending your report. Try again in a moment.",
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleLeaveRide = () => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (chatParams.isGroupChat===false || !chatId) {
      router.back();
      return;
    }
    BrandedAlert.alert(
      'Leave Ride',
      "Are you sure you want to leave this ride? You won't be able to rejoin unless invited again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiUtil.delete(`/rides/${chatId}/participants/${userUuid}`);
            } catch {
              console.warn('[Chat] leave ride failed');
            } finally {
              router.back();
            }
          },
        },
      ]
    );
  };

  /**
   * Load the page of messages just before the oldest one currently in
   * memory. Wired to FlatList's `onEndReached` (inverted lists put
   * "older" at the natural scroll end). Skipped while one is in
   * flight to avoid stacking concurrent fetches.
   */
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderRef.current || !hasMoreMessagesRef.current) return;
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const currentMessages = messagesRef.current;
    if (!chatId || !userUuid || currentMessages.length === 0) return;
    const oldest = currentMessages[0];
    const before = oldest.timestamp instanceof Date
      ? oldest.timestamp.toISOString()
      : new Date(oldest.timestamp as any).toISOString();
    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const res = await ChatService.fetchMessages(apiUtil, chatId, { before, limit: 50 });
      const processed = res.messages.map((msg: any) => processBackendMessage(msg, userUuid));
      // Prepend older messages — `messages` is in chronological order.
      setMessages((prev) => {
        const existing = new Set(prev.map(m => m.id));
        const older = processed.filter(m => !existing.has(m.id));
        const next = [...older, ...prev];
        return next;
      });
      hasMoreMessagesRef.current = res.hasMore;
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.warn('[Chat] loadOlderMessages failed', err);
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [apiUtil, chatParams.chatId, chatParams.chatRoom?.id, userUuid]);

  const renderSettingsModal = () => {
    const isGroup = chatParams.isGroupChat!==false;
    return (
      <SheetShell
        visible={showSettings}
        onDismiss={() => setShowSettings(false)}
        surfaceColor={colors.surfaceElevated}
      >
        {/* SheetShell provides the slide-up chrome (grab handle, X
            button, rounded top corners, dim backdrop). The pageSheet
            we used previously was an iOS-native full-screen sheet
            that didn't match the rest of the app's bottom-sheet
            language. Content here renders on the cream-white sheet
            surface — same as every other sheet in the app. */}
        <Text style={[sheetUi.sheetTitle, { marginBottom: 14, color: colors.textPrimary }]}>
          {isGroup ? "Chat settings" : "Conversation"}
        </Text>
        <ScrollView
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
            <View style={[chatMessagesStyles.settingsSection, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
              <View style={chatMessagesStyles.chatInfoHeader}>
                {/* No initial-letter avatar — the title carries the
                    route, and a route-derived letter ("A") read as
                    arbitrary. */}
                <View style={chatMessagesStyles.chatInfoDetails}>
                  {editingChatName && isGroup ? (
                    <View style={chatMessagesStyles.editNameContainer}>
                      <TextInput
                        style={[chatMessagesStyles.editNameInput, colors.mode === "dark" && { color: colors.textPrimary, borderBottomColor: colors.inkLine }]}
                        value={newChatName}
                        onChangeText={setNewChatName}
                        placeholder="Enter new chat name"
                        placeholderTextColor={colors.mode === "dark" ? colors.textTertiary : undefined}
                        autoFocus
                        onSubmitEditing={handleChatRename}
                      />
                      <TouchableOpacity onPress={handleChatRename}>
                        <Text style={[chatMessagesStyles.saveButton, { color: colors.primary }]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={!isGroup || !hasSettingsPermission}
                      onPress={()=>{
                        if(isGroup && hasSettingsPermission){
                          setEditingChatName(true);
                          setNewChatName(chatTitle);
                        }
                      }}
                    >
                      <Text style={[chatMessagesStyles.chatTitleLarge, colors.mode === "dark" && { color: colors.textPrimary }]}>{chatTitle}</Text>
                      {isGroup && hasSettingsPermission && <Text style={[chatMessagesStyles.tapToEdit, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Tap to edit</Text>}
                      {isGroup && !hasSettingsPermission && <Text style={[chatMessagesStyles.tapToEdit, colors.mode === "dark" && { color: colors.textSecondary, opacity: 0.5 }]}>View only</Text>}
                    </TouchableOpacity>
                  )}
                  <Text style={[chatMessagesStyles.participantCount, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
                    {participants.length} participants
                  </Text>
                </View>
              </View>
            </View>

            <View style={[chatMessagesStyles.settingsSection, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
              <Text style={[chatMessagesStyles.sectionTitle, colors.mode === "dark" && { color: colors.textTertiary, opacity: 1 }]}>Participants</Text>
              {participants.map((p,i)=>{
                const dotColor = getSenderColor(p.id);
                return (
                <View key={`${p.id}-${i}`} style={[chatMessagesStyles.participantItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                  {/* No letter avatar — instead, a small coloured
                      dot that matches the in-chat sender colour, so
                      participants in the list are visually tied to
                      their messages. */}
                  <View style={chatMessagesStyles.participantDotWrap}>
                    <View style={[chatMessagesStyles.participantDot, { backgroundColor: dotColor }]} />
                    {p.isOnline && <View style={[chatMessagesStyles.onlineIndicator, colors.mode === "dark" && { borderColor: colors.surface }]}/>}
                  </View>
                  <View style={chatMessagesStyles.participantInfo}>
                    <Text style={[chatMessagesStyles.participantName, colors.mode === "dark" && { color: colors.textPrimary }]}>
                      {p.id===userUuid
                        ? `${userProfiles[userUuid]?.name || p.name || 'You'} (You)`
                        : p.name
                      }
                    </Text>
                    <Text style={[chatMessagesStyles.participantRole, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
                      {isGroup
                        ? p.role==='admin'?'Host':'Passenger'
                        : 'Contact'
                      }
                      {p.isOnline?' • Online':' • Offline'}
                    </Text>
                  </View>
                </View>
                );
              })}
            </View>

            {rideDetails && isGroup && (
              <View style={[chatMessagesStyles.settingsSection, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
                <Text style={[chatMessagesStyles.sectionTitle, colors.mode === "dark" && { color: colors.textTertiary, opacity: 1 }]}>Ride Details</Text>
                <View style={[chatMessagesStyles.rideDetailItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                  <Text style={[chatMessagesStyles.rideDetailLabel, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Route</Text>
                  <Text style={[chatMessagesStyles.rideDetailValue, colors.mode === "dark" && { color: colors.textPrimary }]}>
                    {rideDetails.departure} → {rideDetails.destination}
                  </Text>
                </View>
                <View style={[chatMessagesStyles.rideDetailItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                  <Text style={[chatMessagesStyles.rideDetailLabel, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Date & Time</Text>
                  <Text style={[chatMessagesStyles.rideDetailValue, colors.mode === "dark" && { color: colors.textPrimary }]}>
                    {rideDetails.date} at {rideDetails.time}
                  </Text>
                </View>
                {rideDetails.price && (
                  <View style={[chatMessagesStyles.rideDetailItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                    <Text style={[chatMessagesStyles.rideDetailLabel, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Price</Text>
                    <Text style={[chatMessagesStyles.rideDetailValue, colors.mode === "dark" && { color: colors.textPrimary }]}>{rideDetails.price}</Text>
                  </View>
                )}
                {rideDetails.driverName && (
                  <View style={[chatMessagesStyles.rideDetailItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                    <Text style={[chatMessagesStyles.rideDetailLabel, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Host</Text>
                    <Text style={[chatMessagesStyles.rideDetailValue, colors.mode === "dark" && { color: colors.textPrimary }]}>{rideDetails.driverName}</Text>
                  </View>
                )}
                <View style={[chatMessagesStyles.rideDetailItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                  <Text style={[chatMessagesStyles.rideDetailLabel, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>Seats</Text>
                  <Text style={[chatMessagesStyles.rideDetailValue, colors.mode === "dark" && { color: colors.textPrimary }]}>
                    {(rideDetails.totalSeats! - rideDetails.availableSeats!)}/{rideDetails.totalSeats!} occupied • {rideDetails.availableSeats} available
                  </Text>
                </View>
              </View>
            )}

            <View style={[chatMessagesStyles.settingsSection, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
              <Text style={[chatMessagesStyles.sectionTitle, colors.mode === "dark" && { color: colors.textTertiary, opacity: 1 }]}>Settings</Text>
              <View style={[chatMessagesStyles.settingItem, colors.mode === "dark" && { borderBottomColor: colors.inkSubtle }]}>
                <Text style={[chatMessagesStyles.settingLabel, colors.mode === "dark" && { color: colors.textPrimary }]}>Mute Notifications</Text>
                <Switch
                  value={notificationsMuted}
                  onValueChange={hasSettingsPermission ? handleMuteToggle : undefined}
                  disabled={!hasSettingsPermission}
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={notificationsMuted ? colors.textOnAccent : '#f4f3f4'}
                />
              </View>
              {!hasSettingsPermission && (
                <Text style={[chatMessagesStyles.settingLabel, colors.mode === "dark" && { color: colors.textPrimary, fontSize: 12, opacity: 0.6, marginTop: 4 }]}>
                  You don't have permission to change settings
                </Text>
              )}
            </View>

            {/* Report a problem — sits on the sheet as an outlined
                button. Available in every chat (group and DM), since
                trust + safety is universal. Tapping it closes settings
                and opens the dedicated report sheet. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setShowSettings(false);
                // small delay so the sheet animation doesn't fight
                // with the modal close.
                setTimeout(() => setShowReportSheet(true), 220);
              }}
              style={{
                marginTop: 4,
                marginBottom: chatParams.isGroupChat !== false ? 12 : 24,
                paddingVertical: 13,
                paddingHorizontal: 20,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: colors.surfaceInset,
              }}
            >
              <Text
                style={{
                  fontFamily: 'NunitoSans_800ExtraBold',
                  fontSize: 15,
                  color: colors.textPrimary,
                  letterSpacing: 0.2,
                }}
              >
                Report a problem
              </Text>
            </TouchableOpacity>

            {chatParams.isGroupChat !== false && (
              // Leave Ride — standalone destructive CTA at the bottom
              // of the scroll area.
              <TouchableOpacity
                style={[chatMessagesStyles.actionButton, chatMessagesStyles.destructiveButton, { marginTop: 4 }]}
                onPress={handleLeaveRide}
              >
                <Text style={[chatMessagesStyles.actionButtonText, chatMessagesStyles.destructiveButtonText]}>
                  Leave ride
                </Text>
              </TouchableOpacity>
            )}
        </ScrollView>
      </SheetShell>
    );
  };

  // Report sheet — opens from the chat settings "Report a problem"
  // button. Reason chips + optional free-text. POSTs to /reports.
  const renderReportSheet = () => (
    <SheetShell
      visible={showReportSheet}
      onDismiss={() => setShowReportSheet(false)}
      busy={reportSubmitting}
      surfaceColor={colors.surfaceElevated}
    >
      {/* Same SheetShell chrome as every other sheet in the app —
          slide-up from bottom, grab handle, X close, rounded top.
          Previously this was a pageSheet which read as a separate
          full-screen modal, out of step with the rest of the app. */}
      <Text style={[sheetUi.sheetTitle, { marginBottom: 6, color: colors.textPrimary }]}>Report</Text>
      <Text style={[sheetUi.sheetBody, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
        Pick what best describes the problem. Your report goes to the
        UniPool team and the other person isn't notified.
      </Text>

      <ScrollView
        style={{ maxHeight: 460 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
          {/* Reason chips — single-select. navFill fill for the
              selected one, surface bg for the rest. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {REPORT_REASONS.map((r) => {
              const selected = reportReason === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  activeOpacity={0.85}
                  onPress={() => setReportReason(r.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: selected
                      ? colors.navFill
                      : colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.inkLine,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_800ExtraBold',
                      fontSize: 13,
                      letterSpacing: 0.1,
                      color: selected
                        ? colors.navIconInactive
                        : colors.textPrimary,
                    }}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={{
              fontFamily: 'NunitoSans_800ExtraBold',
              fontSize: 11.5,
              color: colors.textTertiary,
              opacity: 1,
              letterSpacing: 0.6,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            More details (optional)
          </Text>
          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            multiline
            placeholder="Anything else our team should know"
            placeholderTextColor={colors.textTertiary}
            style={{
              minHeight: 110,
              backgroundColor: colors.surfaceInset,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 14.5,
              lineHeight: 20,
              color: colors.textPrimary,
              fontFamily: 'NunitoSans_600SemiBold',
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: colors.inkSubtle,
            }}
            maxLength={600}
          />

          {(() => {
            const submitDisabled = !reportReason || reportSubmitting;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitDisabled}
                onPress={submitReport}
                style={{
                  marginTop: 22,
                  paddingVertical: 15,
                  borderRadius: 16,
                  backgroundColor: colors.destructive,
                  opacity: submitDisabled ? 0.4 : 1,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'NunitoSans_800ExtraBold',
                    fontSize: 15.5,
                    color: '#FFFFFF',
                    letterSpacing: 0.2,
                  }}
                >
                  {reportSubmitting ? 'Sending…' : 'Send report'}
                </Text>
              </TouchableOpacity>
            );
          })()}
      </ScrollView>
    </SheetShell>
  );

  const chatRows = useMemo(() => buildChatRows(messages), [messages]);
  const otherParticipantCount = useMemo(
    () => participants.reduce((count, p) => count + (p.id !== userUuid ? 1 : 0), 0),
    [participants, userUuid],
  );
  const showHostEmptyState =
    isGroupChat &&
    !!chatParams.hostUserId &&
    chatParams.hostUserId === userUuid &&
    otherParticipantCount === 0 &&
    messages.length === 0;
  const viewerIsHostForPayment =
    rideDetails?.isUserHost === true ||
    (rideDetails?.hostUserId !== undefined && rideDetails.hostUserId === userUuid);
  const openHostShare = useCallback(() => setHostShareOpen(true), []);
  const chatRowKeyExtractor = useCallback((item: ChatRow) => item.id, []);
  const handleMessagesContentSizeChange = useCallback(() => {
    if (!shouldScrollToEndRef.current) return;
    shouldScrollToEndRef.current = false;
    // First scroll after mount lands instantly so the user never sees
    // the top frame. Subsequent autoscrolls keep the smooth ease-in.
    const animated = hasInitialScrolledRef.current;
    hasInitialScrolledRef.current = true;
    flatListRef.current?.scrollToEnd({ animated });
  }, []);
  const handleMessagesScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < 40) loadOlderMessages();
  }, [loadOlderMessages]);
  const renderChatRow = useCallback(({ item }: { item: ChatRow }) => {
    if (item.kind === 'sep') {
      return (
        <View style={chatMessagesStyles.dateSeparatorWrap}>
          <View style={chatMessagesStyles.dateSeparatorPill}>
            <Text style={chatMessagesStyles.dateSeparatorText}>
              {item.label}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === 'safety') {
      if (isPendingHostInquiry) {
        return null;
      }

      if (showHostEmptyState) {
        return (
          <View style={chatMessagesStyles.hostEmptyMinimalWrap}>
            <Text
              style={[
                chatMessagesStyles.hostEmptyMinimalTitle,
                { color: colors.textPrimary, opacity: 1 },
              ]}
            >
              Waiting for passengers
            </Text>
            <Text
              style={[
                chatMessagesStyles.hostEmptyMinimalBody,
                colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 },
              ]}
            >
              Share this trip so users can join.
            </Text>
            {chatParams.chatId ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openHostShare}
                style={[
                  chatMessagesStyles.hostEmptyMinimalShareBtn,
                  { backgroundColor: colors.navFill },
                ]}
              >
                <Text
                  style={[
                    chatMessagesStyles.hostEmptyMinimalShareBtnText,
                    { color: colors.navIconInactive },
                  ]}
                >
                  Share ride
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }

      return (
        <View style={chatMessagesStyles.safetyNoticeWrap}>
          <View style={[chatMessagesStyles.safetyNoticeCard, colors.mode === "dark" && { backgroundColor: colors.surface, borderColor: colors.inkSubtle }]}>
            <Text style={[chatMessagesStyles.safetyNoticeTitle, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
              Be kind, ride safe
            </Text>
            <Text style={[chatMessagesStyles.safetyNoticeBody, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
              Keep payments, OTPs and personal IDs out of chat. UniPool is
              here if anything goes wrong. You can report a problem from
              chat settings.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ChatMessageBubble
        message={item.message}
        isGroupChat={isGroupChat}
        userUuid={userUuid}
        viewerIsHost={viewerIsHostForPayment}
      />
    );
  }, [
    chatParams.chatId,
    colors,
    isGroupChat,
    isPendingHostInquiry,
    openHostShare,
    showHostEmptyState,
    userUuid,
    viewerIsHostForPayment,
  ]);

  return (
    <View style={[chatMessagesStyles.container, { flex: 1, backgroundColor: colors.background }, tabletContentStyle]}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      {/* iMessage-style centered chat header. Back chevron and menu
          float at the edges; the route + date stack centered between
          them. The route is split into two lines with the arrow as a
          fixed-position anchor so even long station names line up
          visually — no more "Powell Street BART…" mid-name truncation
          mash. */}
      <View style={[chatMessagesStyles.chatHeaderRow, { backgroundColor: colors.background }]}>
        <View style={chatMessagesStyles.chatHeaderLeft}>
          <ChevronBack onPress={() => router.back()} />
        </View>

        <View style={chatMessagesStyles.chatHeaderCenter} pointerEvents="none">
          {(() => {
            // Group chat: hold a non-breaking space placeholder while
            // /ride/details is in flight, then swap to "Ride with X"
            // once participants land. The previous behaviour was to
            // fall back to the raw chatTitle (the route string), which
            // produced a visible "SF → Powell" → "Ride with X" flicker
            // on every chat open. DMs always use the route-less title
            // straight from props, so they paint correctly first try.
            const isGroup = chatParams.isGroupChat !== false;
            let title = chatTitle;
            if (isGroup) {
              const others = participants.filter((p) => p.id !== userUuid);
              title = composeRideWithTitle(others, chatTitle); // route fallback when host is alone — was NBSP, leaving header blank
            }
            return (
              <Text style={[chatMessagesStyles.chatHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
            );
          })()}
        </View>

        <View style={chatMessagesStyles.chatHeaderRight}>
          <TouchableOpacity
            onPress={() => {
              setShowSettings(true);
              void fetchChatSettings();
            }}
            style={chatMessagesStyles.chatHeaderSettings}
            hitSlop={8}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={6} r={1.7} fill={colors.textPrimary} />
              <Circle cx={12} cy={12} r={1.7} fill={colors.textPrimary} />
              <Circle cx={12} cy={18} r={1.7} fill={colors.textPrimary} />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Persistent host decision strip. Sits under the header for the
          entire duration of a pending-request DM so the host can
          accept / reject at any point — used to be buried inside the
          empty-state card, which vanished the moment either side sent
          a message. The empty card still shows trip context below;
          this strip is just the actions. */}
      {isPendingHostInquiry && viewerIsHost && bookingIdForActions ? (
        <View style={chatMessagesStyles.hostDecisionStrip}>
          <Text style={chatMessagesStyles.hostDecisionLabel} numberOfLines={1}>
            {otherFirstName} wants to ride along
          </Text>
          <View style={chatMessagesStyles.hostDecisionActions}>
            <TouchableOpacity
              style={[
                chatMessagesStyles.hostDecisionReject,
                bookingActionLoading && chatMessagesStyles.pendingActionDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!!bookingActionLoading}
              onPress={async () => {
                if (bookingActionLoading) return;
                setBookingActionLoading('reject');
                try {
                  await apiUtil.put(
                    `/bookings/reject/${bookingIdForActions}`,
                    {},
                  );
                  router.back();
                } catch (e) {
                  console.warn('reject failed', e);
                  BrandedAlert.alert('Could not reject', 'Try again in a moment.');
                } finally {
                  setBookingActionLoading(null);
                }
              }}
            >
              <Text style={chatMessagesStyles.hostDecisionRejectText}>
                {bookingActionLoading === 'reject' ? 'Rejecting…' : 'Reject'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                chatMessagesStyles.hostDecisionAccept,
                bookingActionLoading && chatMessagesStyles.pendingActionDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!!bookingActionLoading}
              onPress={async () => {
                if (bookingActionLoading) return;
                setBookingActionLoading('accept');
                try {
                  await apiUtil.put(
                    `/bookings/accept/${bookingIdForActions}`,
                    {},
                  );
                  router.back();
                } catch (e) {
                  console.warn('accept failed', e);
                  BrandedAlert.alert('Could not accept', 'Try again in a moment.');
                } finally {
                  setBookingActionLoading(null);
                }
              }}
            >
              <Text style={chatMessagesStyles.hostDecisionAcceptText}>
                {bookingActionLoading === 'accept' ? 'Accepting…' : 'Accept'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Pending-DM empty state — polished centered card with the
          ride context (route block + date) plus a soft "Pending"
          chip. Replaces the old peach banner that crammed the same
          info into the chat header and a row at the top. Shown only
          when the conversation hasn't started yet; once either side
          sends a message it gives way to the chat scroll. */}
      {isPendingHostInquiry && !isLoadingInitial && messages.length === 0 ? (
        <View style={chatMessagesStyles.pendingEmptyWrap}>
          <View style={chatMessagesStyles.pendingEmptyCard}>
            {/* Route block as the visual centerpiece — no pill, no
                duplicated headline. The chat header already shows
                whose conversation this is; the card just shows what
                ride they're asking about. */}
            {(chatParams.pendingRideStartLocation || chatParams.pendingRideEndLocation) ? (
              <View style={chatMessagesStyles.pendingEmptyRouteBlock}>
                <RouteStack
                  tone="onLime"
                  accentColor="#C46A2D"
                  start={chatParams.pendingRideStartLocation || '—'}
                  end={chatParams.pendingRideEndLocation || '—'}
                  numberOfLines={2}
                />
              </View>
            ) : null}

            {pendingRideWhen ? (
              <Text style={chatMessagesStyles.pendingEmptyWhen}>
                {pendingRideWhen}
              </Text>
            ) : null}

            {/* Hairline divider — visually separates the trip
                summary above from the explanatory caption + actions
                below. */}
            <View style={chatMessagesStyles.pendingEmptyDivider} />

            <Text style={chatMessagesStyles.pendingEmptyHint}>
              {viewerIsHost
                ? `Once accepted, ${otherFirstName} is added to the trip chat.`
                : `Once ${otherFirstName} accepts, you'll join the trip chat.`}
            </Text>

            {/* Accept / reject actions live in the persistent host
                decision strip just below the header — that strip
                stays visible whether or not any messages have been
                exchanged, so the host can decide at any point. */}
          </View>
        </View>
      ) : null}

      {/* Everything below — message list, typing indicator, quick
          replies, input bar — lives inside a single
          KeyboardAvoidingView so the keyboard lifts the WHOLE chat
          surface (not just the input). Pre-fix the KAV wrapped only
          the input row; the FlatList kept its full natural height,
          so when the keyboard opened the list's bottom got clipped
          underneath it and the user's view jumped to the top of the
          list. Now the list shrinks from the bottom in step with
          the keyboard, the input sits just above the keyboard, and
          the existing scroll position (bottom by default) is
          preserved. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'padding' })}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
      {isLoadingInitial ? (
        // Suspense skeleton — three ghost bubbles alternating sides,
        // pulsing via opacity. Reads as "the chat exists, just give it
        // a moment" instead of dumping an empty pane on the user.
        <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 28, gap: 14 }}>
          {[
            { width: '62%', side: 'left' as const },
            { width: '48%', side: 'right' as const },
            { width: '74%', side: 'left' as const },
            { width: '40%', side: 'right' as const },
          ].map((b, i) => (
            <View
              key={i}
              style={{
                alignSelf: b.side === 'left' ? 'flex-start' : 'flex-end',
                width: b.width as any,
                height: 38,
                borderRadius: 18,
                borderBottomLeftRadius: b.side === 'left' ? 6 : 18,
                borderBottomRightRadius: b.side === 'right' ? 6 : 18,
                backgroundColor:
                  b.side === 'left'
                    ? 'rgba(38,59,51,0.18)'
                    : 'rgba(127,163,54,0.30)',
                opacity: 0.55,
              }}
            />
          ))}
        </View>
      ) : isPendingHostInquiry && messages.length === 0 ? null : (
      <FlatList
        ref={flatListRef}
        style={[chatMessagesStyles.messagesContainer, { flex: 1 }]}
        data={chatRows}
        keyExtractor={chatRowKeyExtractor}
        initialNumToRender={24}
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={32}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        renderItem={renderChatRow}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleMessagesContentSizeChange}
        // Pulls the next older page when the user reaches the top of
        // the list. RN renders top-down, so `onStartReached` only
        // works with `inverted`; we instead key off `onScroll` below.
        onScroll={handleMessagesScroll}
        scrollEventThrottle={80}
        ListHeaderComponent={
          isLoadingOlder ? (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'NunitoSans_600SemiBold',
                  fontSize: 12,
                  color: AppColors.secondaryDarkGreen,
                  opacity: 0.6,
                }}
              >
                Loading earlier messages…
              </Text>
            </View>
          ) : null
        }
      />
      )}

      {typingUserList.length > 0 && (
        <View style={[chatMessagesStyles.typingIndicatorWrap, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
          <View style={chatMessagesStyles.typingDots}>
            {/* Dots keep the cascading 0.35 / 0.55 / 0.75 opacities baked
                into the module-scope styles; we only swap the underlying
                colour so the dots read against the themed surface. */}
            <View style={[chatMessagesStyles.typingDotLow, { backgroundColor: colors.textPrimary }]} />
            <View style={[chatMessagesStyles.typingDotMid, { backgroundColor: colors.textPrimary }]} />
            <View style={[chatMessagesStyles.typingDotHigh, { backgroundColor: colors.textPrimary }]} />
          </View>
          <Text style={[chatMessagesStyles.typingIndicatorText, colors.mode === "dark" && { color: colors.textSecondary }]}>
            {typingText}
          </Text>
        </View>
      )}

      {/* Keyboard avoidance is now handled by the outer
          KeyboardAvoidingView wrapping the FlatList + this footer,
          so the inner Fragment here just groups the quick-replies
          row with the input bar. */}
      <>
        {/* Quick replies — hidden once the user starts typing so they don't
            crowd a real composition. Mobbin precedent: Gojek "Quick chat",
            Bolt onboarding chips, Uber "I'm here / Be right there". */}
        {!hasMessageDraft ? (
          <View style={chatMessagesStyles.quickReplyRailFrame}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              alwaysBounceHorizontal={false}
              keyboardShouldPersistTaps="handled"
              style={chatMessagesStyles.quickReplyRail}
              contentContainerStyle={chatMessagesStyles.quickReplyRailContent}
            >
              {QUICK_REPLIES.map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.7}
                  style={[chatMessagesStyles.quickReplyChip, colors.mode === "dark" && { backgroundColor: colors.surface, borderColor: colors.inkSubtle }]}
                >
                  <Text
                    style={[chatMessagesStyles.quickReplyText, { color: colors.textPrimary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <View style={[chatMessagesStyles.typingBarContainer, colors.mode === "dark" && { backgroundColor: colors.surfaceElevated }]}>
          <View style={chatMessagesStyles.typingBarInputSlot}>
            <ExpoHost matchContents={{ vertical: true }} style={{ width: "100%" }}>
              <ExpoTextInput
                style={{ width: "100%", paddingVertical: 8 }}
                textStyle={{
                  color: colors.textPrimary,
                  fontSize: 15,
                  fontFamily: "NunitoSans_600SemiBold",
                }}
                placeholder="Message"
                placeholderTextColor={colors.textTertiary}
                value={messageDraft}
                onChangeText={handleComposerTextChange}
                onBlur={handleTypingStop}
                onSubmitEditing={(text) => {
                  handleTypingStop();
                  text.trim() && sendMessage(text);
                }}
                returnKeyType="send"
                autoCorrect
              />
            </ExpoHost>
          </View>
          <TouchableOpacity onPress={() => sendMessage()} style={chatMessagesStyles.typingBarIconContainer}>
            {/* Paper-plane on the lime send button. Forest stroke +
                fill so it reads as a strong glyph against the lime. */}
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3.5 11.5 L 21 4 L 13.5 21.5 L 11 13 L 3.5 11.5 Z"
                stroke={AppColors.secondaryDarkGreen}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill={AppColors.secondaryDarkGreen}
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </>
      </KeyboardAvoidingView>

      {renderSettingsModal()}
      {renderReportSheet()}

      {/* ShareRideSheet for the host-empty-state card. Only mounted
          when we actually need it (we have a ride id). Modal portal
          floats above the chat list + the safety / empty banner. */}
      {chatParams.chatId ? (
        <ShareRideSheet
          visible={hostShareOpen}
          onClose={() => setHostShareOpen(false)}
          rideId={chatParams.chatId}
          startLocation={rideDetails?.departure || ''}
          endLocation={rideDetails?.destination || ''}
          startTime={(rideDetails as any)?.startTimeIso || ''}
        />
      ) : null}
    </View>
  );
};

export default ChatConversationScreen;
