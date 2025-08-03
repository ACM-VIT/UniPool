import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
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
} from 'react-native';
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';
import ChatService from '../../utils/ChatService';
import BrandInfo from '../../components/BrandInfo';

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
  const [editingChatName, setEditingChatName] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [k: string]: { name: string; timeout: NodeJS.Timeout } }>({});
  const [isTyping, setIsTyping] = useState(false);

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
  };
  const chatParams = (route?.params as ChatRouteParams) ?? {};
  const [chatTitle, setChatTitle] = useState(chatParams.chatTitle ?? 'Vellore to Chennai');
  const chatSubtitle = chatParams.chatSubtitle ?? 'You, Bhallaldeva, Kattappa and 3 more';

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
      .catch(e => console.warn('[Chat] fetch user failed', e));
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
      } catch { setNotificationsMuted(false); }
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

    ChatService.fetchMessages(apiUtil, chatId)
      .then((rawMessages: any[]) => {
        console.log('[Chat] Raw messages from API:', JSON.stringify(rawMessages.slice(0, 2), null, 2)); // Log first 2 messages
        console.log('[Chat] Total messages fetched:', rawMessages.length);
        
        if (!userUuid) {
          console.warn('[Chat] No userUuid available for message processing');
          setMessages([]);
          return;
        }
        
        const processedMessages = rawMessages.map(msg => processBackendMessage(msg, userUuid));
        console.log('[Chat] Processed messages:', processedMessages.length);
        setMessages(processedMessages);
      })
      .catch(err => { if (!isGroup) setMessages([]); else console.error('[Chat] fetchMessages err',err); });

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

  const sendMessage = () => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (!userUuid || !chatId || !newMessage.trim()) return;

    handleTypingStop();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      text: newMessage.trim(),
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
      }
      setNotificationsMuted(val);
    } catch {
      console.warn('[Chat] mute toggle failed');
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
      }
      setChatTitle(newChatName);
    } catch {
      console.warn('[Chat] rename failed');
      setChatTitle(newChatName);
    } finally {
      setEditingChatName(false);
      setNewChatName('');
    }
  };

  const handleLeaveRide = () => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (chatParams.isGroupChat===false || !chatId) {
      navigation.goBack();
      return;
    }
    Alert.alert(
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

  const renderMessage = (msg: ChatMessage) => {
    const me=msg.sender==='user';
    
    return (
      <View key={msg.id} style={[
        me?chatMessagesStyles.messageSent:chatMessagesStyles.messageReceived,
        {marginVertical:6}
      ]}>
        {!me && <Text style={chatMessagesStyles.senderName}>{msg.senderName}</Text>}
        <Text style={ me? chatMessagesStyles.messageTextSent:chatMessagesStyles.messageText }>
          {msg.text}
        </Text>
        <View style={{
          flexDirection:'row', alignItems:'center',
          justifyContent: me?'flex-end':'flex-start',
          marginTop:2
        }}>
          <Text style={ me? chatMessagesStyles.messageTimeSent:chatMessagesStyles.messageTime }>
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
                <View style={chatMessagesStyles.chatAvatarContainer}>
                  <Text style={chatMessagesStyles.chatAvatarText}>
                    {chatTitle.charAt(0).toUpperCase()}
                  </Text>
                </View>
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
                      disabled={!isGroup}
                      onPress={()=>{
                        if(isGroup){
                          setEditingChatName(true);
                          setNewChatName(chatTitle);
                        }
                      }}
                    >
                      <Text style={chatMessagesStyles.chatTitleLarge}>{chatTitle}</Text>
                      {isGroup && <Text style={chatMessagesStyles.tapToEdit}>Tap to edit</Text>}
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
              {participants.map((p,i)=>(
                <View key={`${p.id}-${i}`} style={chatMessagesStyles.participantItem}>
                  <View style={chatMessagesStyles.participantAvatar}>
                    <Text style={chatMessagesStyles.participantAvatarText}>
                      {p.id===userUuid
                        ? userProfiles[userUuid]?.name.charAt(0).toUpperCase()||'Y'
                        : p.name.charAt(0).toUpperCase()||'U'
                      }
                    </Text>
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
              ))}
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
                  onValueChange={handleMuteToggle}
                  trackColor={{ false: '#767577', true: AppColors.secondaryDarkGreen }}
                  thumbColor={notificationsMuted ? AppColors.primaryLightGreen : '#f4f3f4'}
                />
              </View>
            </View>

            {chatParams.isGroupChat !== false && (
              <View style={chatMessagesStyles.settingsSection}>
                <TouchableOpacity
                  style={[chatMessagesStyles.actionButton, chatMessagesStyles.destructiveButton]}
                  onPress={handleLeaveRide}
                >
                  <Text style={[chatMessagesStyles.actionButtonText, chatMessagesStyles.destructiveButtonText]}>
                    Leave Ride
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[chatMessagesStyles.container, { flex: 1 }]}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <BrandInfo />
      </View>

      <View style={[chatMessagesStyles.chatHeader, { flexDirection: 'row', alignItems: 'center', marginTop: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Image source={require('../../assets/arrow-square-left.png')} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                color: '#273B33',
                fontSize: 20,
                fontFamily: 'Nunito Sans',
                flex: 1,
                minWidth: 0,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatTitle}
            </Text>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={chatMessagesStyles.settingsButton}>
              <Settings size={24} color="#273B33" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={[chatMessagesStyles.messagesContainer, { flex: 1 }]}
        data={messages}
        extraData={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => renderMessage(item)}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {Object.keys(typingUsers).length > 0 && (
        <View style={{
          paddingHorizontal: 16, paddingVertical: 8,
          backgroundColor: 'rgba(168,216,168,0.1)',
          borderTopWidth: 1, borderTopColor: 'rgba(168,216,168,0.3)'
        }}>
          <Text style={{
            color: '#666', fontSize: 14, fontFamily: 'Nunito Sans', fontStyle: 'italic'
          }}>
            {Object.values(typingUsers).length === 1
              ? `${Object.values(typingUsers)[0].name} is typing...`
              : Object.values(typingUsers).length === 2
                ? `${Object.values(typingUsers)[0].name} and ${Object.values(typingUsers)[1].name} are typing...`
                : `${Object.values(typingUsers)[0].name} and ${Object.values(typingUsers).length - 1} others are typing...`
            }
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        <View style={chatMessagesStyles.typingBarContainer}>
          <TextInput
            style={[chatMessagesStyles.typingBarText, { flex: 1, color: '#000', fontFamily: 'Nunito Sans' }]}
            placeholder="Start typing..."
            placeholderTextColor="#000"
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
          <TouchableOpacity onPress={sendMessage} style={chatMessagesStyles.typingBarIconContainer}>
            <Image
              source={require('../../assets/arrow-square-left.png')}
              style={{ width: 40, height: 40, transform: [{ rotate: '90deg' }] }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {renderSettingsModal()}
    </SafeAreaView>
  );
};

export default ChatConversationScreen;
