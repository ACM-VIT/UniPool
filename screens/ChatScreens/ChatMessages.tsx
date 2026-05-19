import React, { useState, useEffect, useRef } from 'react';
import Svg, { Path } from 'react-native-svg';
import { Settings } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Image,
  TextInput,
  Modal,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';
import ChatService from '../../utils/ChatService';
import BrandedAlert from "../../components/BrandedAlert";

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

const ChatConversationScreen: React.FC<ChatMessagesScreenProps> = ({
  navigation,
  route,
  setNavBarVariant,
}) => {
  const { apiUtil } = useApi();

  const [newMessage, setNewMessage] = useState('');
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<{ [k: string]: { name: string; avatar?: string } }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
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
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);

  type ChatRouteParams = {
    chatId?: string;
    chatRoom?: { id: string; title?: string; subtitle?: string };
    chatTitle?: string;
    chatSubtitle?: string;
    userId?: string;
    isGroupChat?: boolean;
    otherUserId?: string;
    // Set when TripsListScreen opens a 1:1 with the host because the
    // viewer's booking is still pending. Used to swap the safety
    // strip for an explicit "you're messaging the host while your
    // request is pending" explainer.
    pendingHostInquiry?: boolean;
    pendingRideId?: string;
    pendingHostName?: string;
  };
  const chatParams = (route?.params as ChatRouteParams) ?? {};
  const [chatTitle, setChatTitle] = useState(chatParams.chatTitle ?? 'Vellore to Chennai');
  const chatSubtitle = chatParams.chatSubtitle ?? 'You, Bhallaldeva, Kattappa and 3 more';
  const isPendingHostInquiry = !!chatParams.pendingHostInquiry;
  const pendingHostFirstName =
    (chatParams.pendingHostName || '').trim().split(/\s+/)[0] || 'the host';

  const processBackendMessage = (backendMsg: any, currentUserId: string): ChatMessage => {
    console.log('[ProcessMessage] Raw backend message:', JSON.stringify(backendMsg, null, 2));
    
    const messageId = backendMsg.id || backendMsg.message_id;
    const content = backendMsg.content || backendMsg.text || backendMsg.message;
    const senderId = backendMsg.sender_id || backendMsg.user_id || backendMsg.from_user_id;
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
      status: isFromCurrentUser ? 'sent' : undefined,
      readBy: backendMsg.read_by || [],
    };
    
    console.log('[ProcessMessage] Processed message:', {
      id: processedMessage.id,
      sender: processedMessage.sender,
      isFromCurrentUser,
      timestamp: processedMessage.timestamp.toISOString(),
      timestampValid: !isNaN(processedMessage.timestamp.getTime())
    });
    
    return processedMessage;
  };

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

  const markMessageAsRead = (mid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userUuid) {
      wsRef.current.send(
        JSON.stringify({ type: 'message_status', message_id: mid, status: 'seen', user_id: userUuid, timestamp: new Date().toISOString() })
      );
      setMessages(ms =>
        ms.map(m => (m.id === mid ? { ...m, status: 'seen', readBy: [...(m.readBy||[]), userUuid] } : m))
      );
    }
  };
  const sendMessageStatus = (mid: string, status: 'delivered' | 'seen') => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userUuid) {
      wsRef.current.send(
        JSON.stringify({ type: 'message_status', message_id: mid, status, user_id: userUuid, timestamp: new Date().toISOString() })
      );
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
        timeout: setTimeout(() => setTypingUsers(curr => { const c={...curr}; delete c[uid]; return c; }), 5000),
      };
      return next;
    });
  };
  const removeTypingUser = (uid: string) => {
    setTypingUsers(prev => {
      const next = { ...prev };
      next[uid]?.timeout && clearTimeout(next[uid].timeout);
      delete next[uid];
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
        { id: r.host.id, name: r.host.name, avatar: r.host.profile_picture_url, isOnline: false, role: 'admin' },
      ];
      if (r.bookings && Array.isArray(r.bookings)) {
        r.bookings.filter(b => b.request_status === 'accepted').forEach(b =>
          list.push({ id: b.passenger_id, name: b.passenger_name, avatar: b.passenger_profile_picture_url, isOnline: false, role: 'member' })
        );
      }
      setParticipants(list);

      setRideDetails(prev => prev && ({
        ...prev,
        subtitle: `${list.length} participants`,
        availableSeats: Math.max(0, (prev.totalSeats||0) - list.length),
      }));

      try {
        const s = await apiUtil.get<{ settings: { chat_name?: string; notifications_muted?: boolean } }>(`/ride/${rideId}/settings`);
        s.settings.chat_name && setChatTitle(s.settings.chat_name);
        setNotificationsMuted(!!s.settings.notifications_muted);
        setHasSettingsPermission(true);
      } catch (error: any) { 
        console.log('[Chat] Settings fetch failed (user may not have permission):', error?.response?.status);
        // Don't treat 403 (forbidden) as an auth error - user just doesn't have permission to view/edit settings
        if (error?.response?.status === 403) {
          console.log('[Chat] User not authorized to view ride settings - using defaults');
          setNotificationsMuted(false);
          setHasSettingsPermission(false);
        } else {
          setNotificationsMuted(false);
          setHasSettingsPermission(true); // Assume permission for other errors
        }
      }
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
    const isDM = !!chatId && chatId.startsWith('dm_');
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
            { id: chatParams.otherUserId!, name:p.name, role:'member', isOnline:false },
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
    // the unread badge on the chat list.
    if (!isDM) ChatService.markRideRead(apiUtil, chatId);

    const ws = ChatService.openSocket(userId, chatId, e => {
      (e.data as string).trim().split('\n').filter(Boolean).forEach(line => {
        try {
          const d = JSON.parse(line);
          console.log('[WebSocket] Received message:', d.type, d.temp_id ? `(temp_id: ${d.temp_id})` : '', d.sender_id === userId ? '(from me)' : '(from other)');
          console.log('[WebSocket] Full message data:', JSON.stringify(d, null, 2));
          console.log('[WebSocket] Timestamp received:', d.timestamp, 'type:', typeof d.timestamp);
          
          if (d.type === 'message') {
            if (d.temp_id) {
              setMessages(prev => {
                const hasExistingMessage = prev.some(m => m.id === d.temp_id);
                console.log('[WebSocket] temp_id processing:', d.temp_id, 'hasExisting:', hasExistingMessage, 'currentCount:', prev.length);
                
                if (hasExistingMessage) {
                  console.log('[WebSocket] Updating existing message');
                  return prev.map(m => m.id === d.temp_id ? { ...m, id: d.message_id || d.id, status:'sent' } : m);
                } else {
                  console.log('[WebSocket] Adding new message from another user via temp_id');
                  if (!userUuid) return prev;
                  
                  const nm = processBackendMessage(d, userUuid);
                  if (prev.some(x => x.id === nm.id)) {
                    console.log('[WebSocket] Message already exists, skipping');
                    return prev;
                  }
                  const out = [...prev, nm];
                  console.log('[WebSocket] New message count:', out.length);
                  requestAnimationFrame(() => flatListRef.current?.scrollToEnd({animated:true}));
                  if (nm.sender === 'other') {
                    setTimeout(() => sendMessageStatus(nm.id, 'delivered'), 100);
                    setTimeout(() => sendMessageStatus(nm.id, 'seen'), 600);
                  }
                  return out;
                }
              });
            } else {
              console.log('[WebSocket] Processing message without temp_id');
              if (!userUuid) return;
              
              const nm = processBackendMessage(d, userUuid);
              setMessages(prev => {
                if (prev.some(x => x.id === nm.id)) return prev;
                const out = [...prev, nm];
                requestAnimationFrame(() => flatListRef.current?.scrollToEnd({animated:true}));
                if (nm.sender === 'other') {
                  setTimeout(() => sendMessageStatus(nm.id, 'delivered'), 100);
                  setTimeout(() => sendMessageStatus(nm.id, 'seen'), 600);
                }
                return out;
              });
            }
          } else if (d.type==='message_status') {
            setMessages(prev=>prev.map(m=> {
              if (m.id===d.message_id) {
                const rb = m.readBy||[];
                if (d.status==='seen' && d.user_id && !rb.includes(d.user_id)) rb.push(d.user_id);
                return {...m,status:d.status, readBy:rb};
              }
              return m;
            }));
          } else if (d.type==='typing') {
            d.user_id!==userUuid && (d.is_typing?addTypingUser(d.user_id,d.user_name):removeTypingUser(d.user_id));
          }
        } catch {}
      });
    });
    wsRef.current = ws;
    return () => {
      typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
      typingDebounceRef.current && clearTimeout(typingDebounceRef.current);
      isTyping && ws.readyState===WebSocket.OPEN && sendTypingIndicator(false);
      Object.values(typingUsers).forEach(u=>u.timeout&&clearTimeout(u.timeout));
      ws.close();
    };
  }, [route?.params, userUuid]);

  useEffect(() => {
    if (!userUuid) return;
    messages.filter(m => m.sender==='other' && !m.readBy?.includes(userUuid))
      .forEach(m => markMessageAsRead(m.id));
  }, [messages, userUuid]);

  useEffect(() => {
    messages.length>0 && setTimeout(()=>flatListRef.current?.scrollToEnd({animated:true}),100);
  }, [messages]);

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
      status: 'sending',
      readBy: [],
    };
    setMessages(prev => [...prev, optimistic]);
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
      setMessages(prev => prev.map(m => m.id===tempId?{...m, status:'failed'}:m));
    }
  };

  const handleMuteToggle = async (val: boolean) => {
    try {
      const chatId = chatParams.chatRoom?.id || chatParams.chatId;
      if (chatParams.isGroupChat!==false && chatId) {
        await apiUtil.put(`/ride/${chatId}/settings`, { notifications_muted: val });
        setNotificationsMuted(val);
      } else {
        setNotificationsMuted(val);
      }
    } catch (error: any) {
      console.warn('[Chat] mute toggle failed:', error?.response?.status);
      if (error?.response?.status === 403) {
        BrandedAlert.alert('Permission Denied', 'You do not have permission to change settings for this ride.');
        return; 
      }
      setNotificationsMuted(val);
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
      navigation.goBack();
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
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const formatMessageTime = (timestamp: any) => {
    console.log('[FormatTime] Input:', timestamp, 'type:', typeof timestamp);
    
    if (!timestamp) {
      return 'No time';
    }
    
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    } else {
      return `Invalid (${typeof timestamp})`;
    }
    
    if (isNaN(date.getTime())) {
      return `Invalid date (${timestamp})`;
    }
    
    try {
      return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    } catch (error) {
      console.error('[FormatTime] Error formatting:', error);
      return `Format error (${date})`;
    }
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
      setMessages((prev) => [...processed, ...prev]);
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
  type Row =
    | { kind: 'msg'; message: ChatMessage; id: string }
    | { kind: 'sep'; label: string; id: string }
    | { kind: 'safety'; id: string };

  const buildRows = (msgs: ChatMessage[]): Row[] => {
    const rows: Row[] = [];
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
            {formatMessageTime(msg.timestamp)}
          </Text>
          {renderMessageStatus(msg)}
        </View>
      </View>
    );
  };

  const renderSettingsModal = () => {
    const isGroup = chatParams.isGroupChat!==false;
    return (
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={()=>setShowSettings(false)}
      >
        <SafeAreaView style={chatMessagesStyles.container}>
          <View style={chatMessagesStyles.settingsHeader}>
            <TouchableOpacity onPress={()=>setShowSettings(false)}>
              <Text style={chatMessagesStyles.settingsCloseButton}>Done</Text>
            </TouchableOpacity>
            <Text style={chatMessagesStyles.settingsTitle}>Chat Settings</Text>
            <View style={{width:50}}/>
          </View>
          <ScrollView style={chatMessagesStyles.settingsContent}>
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
              // Leave Ride sits *outside* any forest section card so it
              // doesn't read as a coral pill on a black slab. Standalone
              // destructive CTA on the lime canvas with generous side
              // margins.
              <TouchableOpacity
                style={[chatMessagesStyles.actionButton, chatMessagesStyles.destructiveButton, { marginHorizontal: 16, marginTop: 4, marginBottom: 24 }]}
                onPress={handleLeaveRide}
              >
                <Text style={[chatMessagesStyles.actionButtonText, chatMessagesStyles.destructiveButtonText]}>
                  Leave ride
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Report sheet — opens from the chat settings "Report a problem"
  // button. Reason chips + optional free-text. POSTs to /reports.
  const renderReportSheet = () => (
    <Modal
      visible={showReportSheet}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !reportSubmitting && setShowReportSheet(false)}
    >
      <SafeAreaView style={chatMessagesStyles.container}>
        <View style={chatMessagesStyles.settingsHeader}>
          <TouchableOpacity
            onPress={() => !reportSubmitting && setShowReportSheet(false)}
            disabled={reportSubmitting}
          >
            <Text style={chatMessagesStyles.settingsCloseButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={chatMessagesStyles.settingsTitle}>Report</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: AppColors.primaryLightGreen }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }}
        >
          <Text
            style={{
              fontFamily: 'NunitoSans_700Bold',
              fontSize: 14.5,
              color: AppColors.secondaryDarkGreen,
              opacity: 0.78,
              lineHeight: 20,
              marginBottom: 18,
              letterSpacing: -0.05,
            }}
          >
            Pick what best describes the problem. Your report is sent to the
            UniPool moderation team and the other person isn't notified.
          </Text>

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
              backgroundColor: AppColors.basicWhite,
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
              borderColor: 'rgba(38,59,51,0.12)',
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
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={[chatMessagesStyles.container, { flex: 1 }]}>
      <StatusBar backgroundColor={AppColors.secondaryDarkGreen} barStyle="light-content" />

      {/* Mobbin pattern (Grab, Uber, Bolt): single header row with
          avatar circle + name + route subtitle. Back arrow left,
          settings icon right. No BrandInfo strip — keeps the chat
          surface focused on the conversation. */}
      <View style={chatMessagesStyles.chatHeaderRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={chatMessagesStyles.chatHeaderBack} hitSlop={8}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6 L 9 12 L 15 18"
              stroke={AppColors.primaryLightGreen}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* No avatar circle. The "A" we were showing was the first
            letter of the *trip title* (a route, not a person) which
            didn't make sense. The title + subtitle do the job. */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={chatMessagesStyles.chatHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
            {chatTitle}
          </Text>
          {chatSubtitle ? (
            <Text style={chatMessagesStyles.chatHeaderSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {chatSubtitle}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={chatMessagesStyles.chatHeaderSettings} hitSlop={8}>
          {/* Three-dot "more" glyph — cleaner than the cog, which read
              as a settings icon shouting at the user. */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M12 6 A 1.7 1.7 0 1 1 12 5.999" stroke={AppColors.primaryLightGreen} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M12 12 A 1.7 1.7 0 1 1 12 11.999" stroke={AppColors.primaryLightGreen} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M12 18 A 1.7 1.7 0 1 1 12 17.999" stroke={AppColors.primaryLightGreen} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Safety notice now lives inside the FlatList as the first
          row (rendered by `kind: "safety"` below), so it only
          appears at the top of the conversation and scrolls away
          with the messages rather than permanently sitting under
          the header. */}

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
        data={buildRows(messages)}
        extraData={messages}
        keyExtractor={(item) => item.id}
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
            // Pending host inquiry: text-only banner explaining why
            // this is a 1:1 with the host instead of a group chat.
            // Pending users haven't joined the trip yet, so the chat
            // is host-only until they're accepted.
            if (isPendingHostInquiry) {
              return (
                <View
                  style={{
                    backgroundColor: '#FFF1DF',
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    marginHorizontal: 16,
                    marginTop: 10,
                    marginBottom: 10,
                    borderRadius: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(196,106,45,0.30)',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_800ExtraBold',
                      fontSize: 13,
                      color: AppColors.secondaryDarkGreen,
                      letterSpacing: -0.1,
                      marginBottom: 4,
                      textAlign: 'center',
                    }}
                  >
                    Your request is pending
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'NunitoSans_600SemiBold',
                      fontSize: 12,
                      color: AppColors.secondaryDarkGreen,
                      opacity: 0.75,
                      lineHeight: 17,
                      textAlign: 'center',
                    }}
                  >
                    This conversation is only between you and {pendingHostFirstName}.
                    Once you're accepted, you'll join the trip's group chat.
                  </Text>
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
                    backgroundColor: 'rgba(38,59,51,0.10)',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    maxWidth: 320,
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
                    here if anything goes wrong — you can report a problem from
                    chat settings.
                  </Text>
                </View>
              </View>
            );
          }
          return renderMessage(item.message);
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
        behavior={Platform.select({ ios: 'padding', android: undefined })}
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
    </View>
  );
};

export default ChatConversationScreen;
