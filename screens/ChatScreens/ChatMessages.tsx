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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';
import ChatService from '../../utils/ChatService';
import BrandedAlert from "../../components/BrandedAlert";
import ChevronBack from "../../components/ChevronBack";
import RouteStack from "../../components/RouteStack";
import ShareRideSheet from "../../components/ShareRideSheet";
import SheetShell, { sheetUi } from "../../components/SheetShell";
import { useDecodedLocalSearchParams } from "../../navigation/routes";

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

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  role?: 'admin' | 'member';
}

interface RideDetails {
  id: string;
  title: string;
  subtitle: string;
  destination: string;
  departure: string;
  date: string;
  time: string;
  price?: string;
  driverName?: string;
  totalSeats?: number;
  availableSeats?: number;
  hostUserId?: string;
  isUserHost?: boolean;
}

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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatConversationScreen: React.FC<Pick<ChatMessagesScreenProps, "setNavBarVariant">> = ({
  setNavBarVariant,
}) => {
  const router = useRouter();
  const { apiUtil } = useApi();

  const [newMessage, setNewMessage] = useState('');
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<{ [k: string]: { name: string; avatar?: string } }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(true);
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
  const REPORT_REASONS: Array<{ key: string; label: string }> = [
    { key: 'safety', label: 'Safety concern' },
    { key: 'harassment', label: 'Harassment or hate' },
    { key: 'scam', label: 'Scam or fraud' },
    { key: 'spam', label: 'Spam' },
    { key: 'inappropriate', label: 'Inappropriate content' },
    { key: 'other', label: 'Something else' },
  ];

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList<ChatRow> | null>(null);
  const onlineUserIdsRef = useRef<Set<string>>(new Set());
  const shouldScrollToEndRef = useRef(false);
  const seenStatusIdsRef = useRef<Set<string>>(new Set());
  const typingUsersRef = useRef<{ [k: string]: { name: string; timeout: NodeJS.Timeout } }>({});

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
  const chatParams = useDecodedLocalSearchParams<ChatRouteParams>();
  const [chatTitle, setChatTitle] = useState(chatParams.chatTitle ?? 'Vellore to Chennai');
  const isPendingHostInquiry = !!chatParams.pendingHostInquiry;
  const viewerIsHost = !!chatParams.viewerIsHost;
  // No subtitle for pending DMs — route/date live in the empty-state
  // card below. Group chats keep their original subtitle.
  const chatSubtitle = isPendingHostInquiry
    ? ''
    : (chatParams.chatSubtitle ?? 'You, Bhallaldeva, Kattappa and 3 more');
  // `pendingHostName` is misnamed historically — it's actually the
  // OTHER party's display name. For a host viewing a requester's DM,
  // that's the requester (e.g. "Priya"); for a passenger viewing
  // their host's DM, that's the host (e.g. "Yash"). Branching on
  // `viewerIsHost` below picks the right copy.
  const otherFirstName =
    (chatParams.pendingHostName || '').trim().split(/\s+/)[0] ||
    (viewerIsHost ? 'them' : 'the host');

  // Host-side accept/reject state. Disabled mid-flight to prevent
  // double-taps; success drops them out of the DM (the booking is
  // no longer pending so this thread no longer fits the surface).
  const [bookingActionLoading, setBookingActionLoading] = useState<
    'accept' | 'reject' | null
  >(null);
  const bookingIdForActions = chatParams.hostPendingRequestBookingId;

  // Drives the ShareRideSheet rendered for the host-empty-state card.
  // Lives at the screen root so its Modal portals above the FlatList.
  const [hostShareOpen, setHostShareOpen] = useState(false);

  const processBackendMessage = (backendMsg: any, currentUserId: string): ChatMessage => {
    const messageId =
      backendMsg.id ||
      backendMsg.message_id ||
      backendMsg.temp_id ||
      `local_${Date.now()}_${Math.random()}`;
    const content = backendMsg.content || backendMsg.text || backendMsg.message || '';
    const senderId = backendMsg.sender_id || backendMsg.user_id || backendMsg.from_user_id || '';
    const senderName = backendMsg.sender_name || backendMsg.user_name || backendMsg.sender?.name;
    const senderAvatar = backendMsg.sender_avatar || backendMsg.profile_picture_url || backendMsg.sender?.profile_picture_url;
    const timestamp = backendMsg.timestamp || backendMsg.created_at || backendMsg.sent_at;
    
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
    
    const processedMessage: ChatMessage = {
      id: messageId,
      text: content,
      sender: isFromCurrentUser ? 'user' : 'other',
      senderId: senderId,
      senderName: isFromCurrentUser ? 'You' : (senderName || 'Unknown'),
      senderAvatar: senderAvatar,
      timestamp: parsedTimestamp,
      timeLabel: formatChatTime(parsedTimestamp),
      status: isFromCurrentUser ? 'sent' : undefined,
      readBy: backendMsg.read_by || [],
    };

    return processedMessage;
  };

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


  useEffect(() => {
    setNavBarVariant?.(0);
    apiUtil
      .get<{ user: { id: string; name: string } }>('/user/details')
      .then(resp => {
        setUserUuid(resp.user.id);
        setUserProfiles(prev => ({
          ...prev,
          [resp.user.id]: { name: resp.user.name || 'You', avatar: undefined },
        }));
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
  }, [apiUtil, setNavBarVariant]);

  useEffect(() => {
    if (!userUuid) return;
    setOnlineUsers(next => next.add(userUuid));
  }, [setOnlineUsers, userUuid]);

  useEffect(() => {
    applyOnlinePresence(onlineUserIds);
  }, [applyOnlinePresence, onlineUserIds]);

  const fetchUserProfile = async (uid: string) => {
    if (userProfiles[uid]) return userProfiles[uid];
    try {
      const res = await apiUtil.get<{ user: { name: string; avatar?: string } }>(`/user/${uid}`);
      const prof = { name: res.user.name || 'Unknown', avatar: res.user.avatar };
      setUserProfiles(prev => ({ ...prev, [uid]: prof }));
      return prof;
    } catch {
      const fallback = { name: 'Unknown', avatar: undefined };
      setUserProfiles(prev => ({ ...prev, [uid]: fallback }));
      return fallback;
    }
  };

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

  const fetchChatDetails = async (rideId: string) => {
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

      setRideDetails({
        id: r.id,
        title: `${r.start_location} to ${r.end_location}`,
        subtitle: `${r.booked_seats + 1} participants`,
        departure: r.start_location,
        destination: r.end_location,
        date: new Date(r.start_time).toLocaleDateString(),
        time: new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: `₹${r.total_price}`,
        driverName: r.host.name,
        totalSeats: r.total_seats,
        availableSeats: r.total_seats - (r.booked_seats + 1),
        hostUserId: r.host_user_id,
        isUserHost: r.is_user_host,
      });

      const list: Participant[] = [
        {
          id: r.host.id,
          name: r.host.name,
          avatar: r.host.profile_picture_url,
          isOnline: r.host.id === userUuid || onlineUserIdsRef.current.has(r.host.id),
          role: 'admin',
        },
      ];
      if (r.bookings && Array.isArray(r.bookings)) {
        r.bookings.filter(b => b.request_status === 'accepted').forEach(b =>
          list.push({
            id: b.passenger_id,
            name: b.passenger_name,
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

      const [settingsResult, muteResult] = await Promise.allSettled([
        apiUtil.get<{ settings: { chat_name?: string } }>(`/ride/${rideId}/settings`),
        apiUtil.get<{ muted: boolean }>(`/ride/${rideId}/chat-mute`),
      ]);

      if (settingsResult.status === 'fulfilled') {
        settingsResult.value.settings.chat_name && setChatTitle(settingsResult.value.settings.chat_name);
        setHasSettingsPermission(true);
      } else {
        const status = (settingsResult.reason as any)?.response?.status;
        setHasSettingsPermission(status !== 403);
      }

      setNotificationsMuted(muteResult.status === 'fulfilled' ? !!muteResult.value.muted : false);
    } catch (e) {
      console.warn('[Chat] fetchChatDetails error', e);
      setRideDetails({
        id: rideId,
        title: chatTitle,
        subtitle: chatSubtitle,
        departure: 'Unknown',
        destination: 'Unknown',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: '₹0',
        driverName: 'Unknown',
        totalSeats: 4,
        availableSeats: 1,
      });
      setParticipants([{ id: userUuid||'', name: userProfiles[userUuid||'']?.name||'You', role: 'member', isOnline: true }]);
    }
  };

  useEffect(() => {
    if (!userUuid) return;
    setNavBarVariant?.(0);

    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const isGroup = chatParams.isGroupChat !== false;
    const userId = chatParams.userId || userUuid;
    if (!chatId) return;

    if (isGroup) {
      fetchChatDetails(chatId);
    } else {
      setRideDetails(null);
      if (chatParams.otherUserId) {
        fetchUserProfile(chatParams.otherUserId).then(p =>
          setParticipants([
            { id: userUuid, name: userProfiles[userUuid]?.name||'You', role:'member', isOnline:true },
            {
              id: chatParams.otherUserId!,
              name:p.name,
              role:'member',
              isOnline: onlineUserIdsRef.current.has(chatParams.otherUserId!),
            },
          ])
        );
      } else {
        setParticipants([
          { id:userUuid, name:userProfiles[userUuid]?.name||'You', role:'member', isOnline:true },
          { id:'unknown', name:chatParams.chatTitle?.replace('Chat with ','')||'Other User', role:'member', isOnline:false },
        ]);
      }
    }

    // Initial page (most recent ~50 messages). Older pages are loaded
    // on demand via loadOlderMessages() when the user scrolls to top.
    setIsLoadingInitial(true);
    ChatService.fetchMessages(apiUtil, chatId, { limit: 50 })
      .then((res) => {
        if (!userUuid) {
          setMessages([]);
          return;
        }
        const processed = res.messages.map((msg: any) => processBackendMessage(msg, userUuid));
        shouldScrollToEndRef.current = true;
        setMessages(processed);
        setHasMoreMessages(res.hasMore);
      })
      .catch((err) => {
        if (!isGroup) setMessages([]);
        else console.error('[Chat] fetchMessages err', err);
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });

    // Tell the backend the user has seen everything up to now. Resets
    // the unread badge on the chat list. Works for both ride chats
    // and DM rooms — the helper branches on the chatId shape.
    if (chatId) ChatService.markRideRead(apiUtil, chatId);

    const ws = ChatService.openSocket(userId, chatId, e => {
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
    });
    wsRef.current = ws;
    return () => {
      typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
      typingDebounceRef.current && clearTimeout(typingDebounceRef.current);
      isTyping && ws.readyState===WebSocket.OPEN && sendTypingIndicator(false);
      Object.values(typingUsersRef.current).forEach(u=>u.timeout&&clearTimeout(u.timeout));
      ws.close();
    };
  }, [
    chatParams.chatRoom?.id,
    chatParams.chatId,
    chatParams.isGroupChat,
    chatParams.otherUserId,
    chatParams.userId,
    userUuid,
  ]);

  const sendMessage = (override?: string) => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const text = (override ?? newMessage).trim();
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
    setNewMessage('');

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

  const formatMessageTime = (timestamp: any) => {
    return formatChatTime(timestamp);
  };

  /**
   * Load the page of messages just before the oldest one currently in
   * memory. Wired to FlatList's `onEndReached` (inverted lists put
   * "older" at the natural scroll end). Skipped while one is in
   * flight to avoid stacking concurrent fetches.
   */
  const loadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages) return;
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (!chatId || !userUuid || messages.length === 0) return;
    const oldest = messages[0];
    const before = oldest.timestamp instanceof Date
      ? oldest.timestamp.toISOString()
      : new Date(oldest.timestamp as any).toISOString();
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
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.warn('[Chat] loadOlderMessages failed', err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  /**
   * Insert "Today / Yesterday / <date>" separator entries between
   * messages that span a calendar-day boundary. Returns a tagged list
   * the FlatList can render through a discriminated `renderItem`.
   */
  const buildRows = (msgs: ChatMessage[]): ChatRow[] => {
    const rows: ChatRow[] = [];
    // Pin the safety notice as the very first row in the conversation.
    // Lives inside the FlatList so it scrolls away with the chat
    // instead of permanently parking under the header.
    rows.push({ kind: 'safety', id: 'safety-banner' });
    let prevDayKey = '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayKey = (d: Date) => d.toDateString();
    for (const m of msgs) {
      const d = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as any);
      const key = dayKey(d);
      if (key !== prevDayKey) {
        let label: string;
        if (key === dayKey(today)) label = 'Today';
        else if (key === dayKey(yesterday)) label = 'Yesterday';
        else
          label = d.toLocaleDateString(undefined, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          });
        rows.push({ kind: 'sep', label, id: `sep-${key}` });
        prevDayKey = key;
      }
      rows.push({ kind: 'msg', message: m, id: m.id });
    }
    return rows;
  };

  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg.sender!=='user') return null;
    let sym='✓', col='#999';
    switch(msg.status){
      case 'sending': sym='○'; break;
      case 'sent': sym='✓'; break;
      case 'delivered': sym='✓✓'; break;
      case 'seen': sym='✓✓'; col=AppColors.secondaryDarkGreen; break;
      case 'failed': sym='!'; col='#f44336'; break;
    }
    return <Text style={{
      fontSize:10, color:col, marginLeft:4,
      fontWeight: msg.status==='seen'?'bold':'normal',
      fontFamily:'monospace'
    }}>{sym}</Text>;
  };

  /**
   * Map every sender to a stable, distinct accent color so group-chat
   * participants are visually differentiable. Drawn from a brand-tuned
   * palette (lime + orange + amber + sky) that reads well against the
   * forest bubble. Same user always gets the same color.
   */
  const SENDER_PALETTE = [
    '#B5D750', // brand lime
    '#F09E5C', // brand orange
    '#FFD166', // amber
    '#A5D9C5', // mint
    '#9EC9F0', // sky
    '#E6A5D3', // pink lilac
    '#C6B7F3', // periwinkle
    '#FF8E72', // coral
  ];
  const getSenderColor = (id?: string): string => {
    if (!id) return SENDER_PALETTE[0];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return SENDER_PALETTE[h % SENDER_PALETTE.length];
  };

  const renderMessage = (msg: ChatMessage) => {
    const me = msg.sender === 'user';
    const isGroup = chatParams.isGroupChat !== false;
    // Sender colour is reused for the in-bubble name so each
    // participant has a consistent visual identity, without dropping
    // a separate avatar chip next to every received message.
    const senderColor = getSenderColor(msg.senderId);

    return (
      <View
        key={msg.id}
        style={me ? chatMessagesStyles.messageSent : chatMessagesStyles.messageReceived}
      >
        {!me && isGroup ? (
          <Text style={[chatMessagesStyles.senderName, { color: senderColor }]}>
            {msg.senderName}
          </Text>
        ) : null}
        <Text style={me ? chatMessagesStyles.messageTextSent : chatMessagesStyles.messageText}>
          {msg.text}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: me ? 'flex-end' : 'flex-start',
            marginTop: 2,
          }}
        >
          <Text style={me ? chatMessagesStyles.messageTimeSent : chatMessagesStyles.messageTime}>
            {msg.timeLabel || formatMessageTime(msg.timestamp)}
          </Text>
          {renderMessageStatus(msg)}
        </View>
      </View>
    );
  };

  const renderSettingsModal = () => {
    const isGroup = chatParams.isGroupChat!==false;
    return (
      <SheetShell visible={showSettings} onDismiss={() => setShowSettings(false)}>
        {/* SheetShell provides the slide-up chrome (grab handle, X
            button, rounded top corners, dim backdrop). The pageSheet
            we used previously was an iOS-native full-screen sheet
            that didn't match the rest of the app's bottom-sheet
            language. Content here renders on the cream-white sheet
            surface — same as every other sheet in the app. */}
        <Text style={[sheetUi.sheetTitle, { marginBottom: 14 }]}>
          {isGroup ? "Chat settings" : "Conversation"}
        </Text>
        <ScrollView
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
            <View style={chatMessagesStyles.settingsSection}>
              <View style={chatMessagesStyles.chatInfoHeader}>
                {/* No initial-letter avatar — the title carries the
                    route, and a route-derived letter ("A") read as
                    arbitrary. */}
                <View style={chatMessagesStyles.chatInfoDetails}>
                  {editingChatName && isGroup ? (
                    <View style={chatMessagesStyles.editNameContainer}>
                      <TextInput
                        style={chatMessagesStyles.editNameInput}
                        value={newChatName}
                        onChangeText={setNewChatName}
                        placeholder="Enter new chat name"
                        autoFocus
                        onSubmitEditing={handleChatRename}
                      />
                      <TouchableOpacity onPress={handleChatRename}>
                        <Text style={chatMessagesStyles.saveButton}>Save</Text>
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
                      <Text style={chatMessagesStyles.chatTitleLarge}>{chatTitle}</Text>
                      {isGroup && hasSettingsPermission && <Text style={chatMessagesStyles.tapToEdit}>Tap to edit</Text>}
                      {isGroup && !hasSettingsPermission && <Text style={[chatMessagesStyles.tapToEdit, {opacity: 0.5}]}>View only</Text>}
                    </TouchableOpacity>
                  )}
                  <Text style={chatMessagesStyles.participantCount}>
                    {participants.length} participants
                  </Text>
                </View>
              </View>
            </View>

            <View style={chatMessagesStyles.settingsSection}>
              <Text style={chatMessagesStyles.sectionTitle}>Participants</Text>
              {participants.map((p,i)=>{
                const dotColor = getSenderColor(p.id);
                return (
                <View key={`${p.id}-${i}`} style={chatMessagesStyles.participantItem}>
                  {/* No letter avatar — instead, a small coloured
                      dot that matches the in-chat sender colour, so
                      participants in the list are visually tied to
                      their messages. */}
                  <View style={chatMessagesStyles.participantDotWrap}>
                    <View style={[chatMessagesStyles.participantDot, { backgroundColor: dotColor }]} />
                    {p.isOnline && <View style={chatMessagesStyles.onlineIndicator}/>}
                  </View>
                  <View style={chatMessagesStyles.participantInfo}>
                    <Text style={chatMessagesStyles.participantName}>
                      {p.id===userUuid
                        ? `${userProfiles[userUuid]?.name} (You)`
                        : p.name
                      }
                    </Text>
                    <Text style={chatMessagesStyles.participantRole}>
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
              <View style={chatMessagesStyles.settingsSection}>
                <Text style={chatMessagesStyles.sectionTitle}>Ride Details</Text>
                <View style={chatMessagesStyles.rideDetailItem}>
                  <Text style={chatMessagesStyles.rideDetailLabel}>Route</Text>
                  <Text style={chatMessagesStyles.rideDetailValue}>
                    {rideDetails.departure} → {rideDetails.destination}
                  </Text>
                </View>
                <View style={chatMessagesStyles.rideDetailItem}>
                  <Text style={chatMessagesStyles.rideDetailLabel}>Date & Time</Text>
                  <Text style={chatMessagesStyles.rideDetailValue}>
                    {rideDetails.date} at {rideDetails.time}
                  </Text>
                </View>
                {rideDetails.price && (
                  <View style={chatMessagesStyles.rideDetailItem}>
                    <Text style={chatMessagesStyles.rideDetailLabel}>Price</Text>
                    <Text style={chatMessagesStyles.rideDetailValue}>{rideDetails.price}</Text>
                  </View>
                )}
                {rideDetails.driverName && (
                  <View style={chatMessagesStyles.rideDetailItem}>
                    <Text style={chatMessagesStyles.rideDetailLabel}>Host</Text>
                    <Text style={chatMessagesStyles.rideDetailValue}>{rideDetails.driverName}</Text>
                  </View>
                )}
                <View style={chatMessagesStyles.rideDetailItem}>
                  <Text style={chatMessagesStyles.rideDetailLabel}>Seats</Text>
                  <Text style={chatMessagesStyles.rideDetailValue}>
                    {(rideDetails.totalSeats! - rideDetails.availableSeats!)}/{rideDetails.totalSeats!} occupied • {rideDetails.availableSeats} available
                  </Text>
                </View>
              </View>
            )}

            <View style={chatMessagesStyles.settingsSection}>
              <Text style={chatMessagesStyles.sectionTitle}>Settings</Text>
              <View style={chatMessagesStyles.settingItem}>
                <Text style={chatMessagesStyles.settingLabel}>Mute Notifications</Text>
                <Switch
                  value={notificationsMuted}
                  onValueChange={hasSettingsPermission ? handleMuteToggle : undefined}
                  disabled={!hasSettingsPermission}
                  trackColor={{ false: '#767577', true: AppColors.secondaryDarkGreen }}
                  thumbColor={notificationsMuted ? AppColors.primaryLightGreen : '#f4f3f4'}
                />
              </View>
              {!hasSettingsPermission && (
                <Text style={[chatMessagesStyles.settingLabel, {fontSize: 12, opacity: 0.6, marginTop: 4}]}>
                  You don't have permission to change settings
                </Text>
              )}
            </View>

            {/* Report a problem — sits on the lime canvas as a forest
                outlined button. Available in every chat (group and
                DM), since trust + safety is universal. Tapping it
                closes settings and opens the dedicated report sheet. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setShowSettings(false);
                // small delay so the sheet animation doesn't fight
                // with the modal close.
                setTimeout(() => setShowReportSheet(true), 220);
              }}
              style={{
                marginHorizontal: 16,
                marginTop: 4,
                marginBottom: chatParams.isGroupChat !== false ? 12 : 24,
                paddingVertical: 13,
                paddingHorizontal: 20,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: AppColors.secondaryDarkGreen,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'NunitoSans_800ExtraBold',
                  fontSize: 15,
                  color: AppColors.secondaryDarkGreen,
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
    >
      {/* Same SheetShell chrome as every other sheet in the app —
          slide-up from bottom, grab handle, X close, rounded top.
          Previously this was a pageSheet which read as a separate
          full-screen modal, out of step with the rest of the app. */}
      <Text style={[sheetUi.sheetTitle, { marginBottom: 6 }]}>Report</Text>
      <Text style={sheetUi.sheetBody}>
        Pick what best describes the problem. Your report goes to the
        UniPool team and the other person isn't notified.
      </Text>

      <ScrollView
        style={{ maxHeight: 460 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
          {/* Reason chips — single-select. Forest fill for the
              selected one, outlined forest for the rest. */}
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
                      ? AppColors.secondaryDarkGreen
                      : 'transparent',
                    borderWidth: 1.5,
                    borderColor: AppColors.secondaryDarkGreen,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_800ExtraBold',
                      fontSize: 13,
                      letterSpacing: 0.1,
                      color: selected
                        ? AppColors.primaryLightGreen
                        : AppColors.secondaryDarkGreen,
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
              color: AppColors.secondaryDarkGreen,
              opacity: 0.7,
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
            placeholderTextColor="rgba(38,59,51,0.45)"
            style={{
              minHeight: 110,
              // Soft forest tint instead of basicWhite — the sheet
              // bg is already white, so a white field would
              // disappear into it. Same surface treatment used by
              // sheetUi.input.
              backgroundColor: 'rgba(38,59,51,0.05)',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 14.5,
              lineHeight: 20,
              color: AppColors.secondaryDarkGreen,
              fontFamily: 'NunitoSans_600SemiBold',
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: 'rgba(38,59,51,0.10)',
            }}
            maxLength={600}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!reportReason || reportSubmitting}
            onPress={submitReport}
            style={{
              marginTop: 22,
              paddingVertical: 15,
              borderRadius: 16,
              backgroundColor:
                !reportReason || reportSubmitting
                  ? 'rgba(38,59,51,0.35)'
                  : AppColors.secondaryDarkGreen,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'NunitoSans_800ExtraBold',
                fontSize: 15.5,
                color: AppColors.primaryLightGreen,
                letterSpacing: 0.2,
              }}
            >
              {reportSubmitting ? 'Sending…' : 'Send report'}
            </Text>
          </TouchableOpacity>
      </ScrollView>
    </SheetShell>
  );

  const chatRows = useMemo(() => buildRows(messages), [messages]);

  return (
    <View style={[chatMessagesStyles.container, { flex: 1 }]}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      {/* iMessage-style centered chat header. Back chevron and menu
          float at the edges; the route + date stack centered between
          them. The route is split into two lines with the arrow as a
          fixed-position anchor so even long station names line up
          visually — no more "Powell Street BART…" mid-name truncation
          mash. */}
      <View style={chatMessagesStyles.chatHeaderRow}>
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
              <Text style={chatMessagesStyles.chatHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
            );
          })()}
          {chatSubtitle ? (
            <Text style={chatMessagesStyles.chatHeaderSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {chatSubtitle}
            </Text>
          ) : null}
        </View>

        <View style={chatMessagesStyles.chatHeaderRight}>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={chatMessagesStyles.chatHeaderSettings} hitSlop={8}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={6} r={1.7} fill={AppColors.secondaryDarkGreen} />
              <Circle cx={12} cy={12} r={1.7} fill={AppColors.secondaryDarkGreen} />
              <Circle cx={12} cy={18} r={1.7} fill={AppColors.secondaryDarkGreen} />
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
                  numberOfLines={1}
                />
              </View>
            ) : null}

            {chatParams.pendingRideStartTime ? (
              <Text style={chatMessagesStyles.pendingEmptyWhen}>
                {(() => {
                  try {
                    const d = new Date(chatParams.pendingRideStartTime);
                    const date = d.toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    });
                    const time = d.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return `${date} · ${time}`;
                  } catch {
                    return '';
                  }
                })()}
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
      ) : (
      <FlatList
        ref={flatListRef}
        style={[chatMessagesStyles.messagesContainer, { flex: 1 }]}
        data={chatRows}
        keyExtractor={(item) => item.id}
        initialNumToRender={24}
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={32}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        renderItem={({ item }) => {
          if (item.kind === 'sep') {
            return (
              <View style={{ alignItems: 'center', marginVertical: 14 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(38,59,51,0.10)',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_800ExtraBold',
                      fontSize: 11,
                      letterSpacing: 0.5,
                      color: AppColors.secondaryDarkGreen,
                      opacity: 0.7,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              </View>
            );
          }
          if (item.kind === 'safety') {
            // Pending host inquiry: the polished centered card lives
            // ABOVE the FlatList now (rendered conditionally on
            // `messages.length === 0`), so this inline row collapses
            // to nothing for the pending case. Letting the safety
            // banner render here too would duplicate the surface.
            if (isPendingHostInquiry) {
              return null;
            }

            // Host viewing their own ride chat before anyone has been
            // accepted in. The generic safety strip doesn't fit this
            // moment — it reads as if the host is mid-conversation
            // with someone. Swap it for a calm "trip is live, waiting
            // for someone to join" card with an explicit Share CTA
            // that opens the same ShareRideSheet the Ride Management
            // header uses. Single tasteful surface centered in the
            // empty chat body.
            const isViewerHost = !!chatParams.hostUserId && chatParams.hostUserId === userUuid;
            const isGroup = chatParams.isGroupChat !== false;
            const others = participants.filter((p) => p.id !== userUuid);
            if (isGroup && isViewerHost && others.length === 0 && messages.length === 0) {
              // Minimal empty state — no card, no animation, no
              // dashboard widget. Just calm centered text on the
              // lime canvas with a small Share pill underneath.
              // The previous big forest card was over-engineered
              // for what is essentially "nothing to see yet".
              return (
                <View style={chatMessagesStyles.hostEmptyMinimalWrap}>
                  <Text style={chatMessagesStyles.hostEmptyMinimalTitle}>
                    Waiting for passengers
                  </Text>
                  <Text style={chatMessagesStyles.hostEmptyMinimalBody}>
                    Share this trip so users can join.
                  </Text>
                  {chatParams.chatId ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setHostShareOpen(true)}
                      style={chatMessagesStyles.hostEmptyMinimalShareBtn}
                    >
                      <Text style={chatMessagesStyles.hostEmptyMinimalShareBtnText}>
                        Share ride
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }
            // Standard safety strip — centred text on a soft forest
            // wash. No icon. The point is the message, not a glyph
            // shouting next to it.
            return (
              <View
                style={{
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 14,
                  paddingBottom: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: AppColors.basicWhite,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    maxWidth: 320,
                    borderWidth: 1,
                    borderColor: 'rgba(38,59,51,0.10)',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_800ExtraBold',
                      fontSize: 11.5,
                      letterSpacing: 0.8,
                      color: AppColors.secondaryDarkGreen,
                      opacity: 0.7,
                      marginBottom: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    Be kind, ride safe
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_600SemiBold',
                      fontSize: 12.5,
                      lineHeight: 17,
                      color: AppColors.secondaryDarkGreen,
                      opacity: 0.78,
                      textAlign: 'center',
                      letterSpacing: -0.05,
                    }}
                  >
                    Keep payments, OTPs and personal IDs out of chat. UniPool is
                    here if anything goes wrong. You can report a problem from
                    chat settings.
                  </Text>
                </View>
              </View>
            );
          }
          return renderMessage(item.message);
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!shouldScrollToEndRef.current) return;
          shouldScrollToEndRef.current = false;
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        // Pulls the next older page when the user reaches the top of
        // the list. RN renders top-down, so `onStartReached` only
        // works with `inverted`; we instead key off `onScroll` below.
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y < 40) loadOlderMessages();
        }}
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

      {Object.keys(typingUsers).length > 0 && (
        <View style={{
          paddingHorizontal: 18,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: AppColors.secondaryDarkGreen,
                  opacity: 0.35 + i * 0.2,
                }}
              />
            ))}
          </View>
          <Text style={{
            color: AppColors.inkMuted,
            fontSize: 12.5,
            fontFamily: 'NunitoSans_600SemiBold',
          }}>
            {Object.values(typingUsers).length === 1
              ? `${Object.values(typingUsers)[0].name} is typing`
              : Object.values(typingUsers).length === 2
                ? `${Object.values(typingUsers)[0].name} and ${Object.values(typingUsers)[1].name} are typing`
                : `${Object.values(typingUsers)[0].name} and ${Object.values(typingUsers).length - 1} others are typing`
            }
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        // `padding` on Android too (was `undefined`, a no-op). This
        // KAV wraps only the input bar at the bottom of the screen,
        // not the whole chat — so `height` would shrink the input
        // itself, which is wrong. `padding` adds bottom padding
        // equal to the keyboard height, which lifts the input bar
        // above the keyboard while leaving the messages list above
        // it intact. The manifest's `adjustResize` alone wasn't
        // enough here (edge-to-edge / immersive insets break the
        // automatic window resize on newer Android builds).
        behavior={Platform.select({ ios: 'padding', android: 'padding' })}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        {/* Quick replies — hidden once the user starts typing so they don't
            crowd a real composition. Mobbin precedent: Gojek "Quick chat",
            Bolt onboarding chips, Uber "I'm here / Be right there". */}
        {newMessage.trim().length === 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => sendMessage(q)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: AppColors.basicWhite,
                  borderWidth: 1,
                  borderColor: AppColors.inkSoft,
                  shadowColor: AppColors.secondaryDarkGreen,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <Text style={{ fontFamily: 'NunitoSans_700Bold', fontSize: 13, color: AppColors.secondaryDarkGreen }}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        <View style={chatMessagesStyles.typingBarContainer}>
          <TextInput
            style={chatMessagesStyles.typingBarText}
            placeholder="Message"
            placeholderTextColor={'rgba(255,255,255,0.45)'}
            value={newMessage}
            onChangeText={text => {
              setNewMessage(text);
              if (text.trim().length > 0) handleTypingStart();
              else handleTypingStop();
            }}
            onBlur={handleTypingStop}
            onSubmitEditing={() => {
              handleTypingStop();
              newMessage.trim() && sendMessage();
            }}
          />
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
