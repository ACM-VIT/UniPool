import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Switch,
  Alert,
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
  const [userProfiles, setUserProfiles] = useState<{[userId: string]: {name: string, avatar?: string}}>({});
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [editingChatName, setEditingChatName] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [typingUsers, setTypingUsers] = useState<{[userId: string]: {name: string, timeout: NodeJS.Timeout}}>({});
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

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

  useEffect(() => {
    setNavBarVariant?.(0);
    apiUtil.get<{user: {id: string, name: string}}>("/user/details")
      .then((resp) => {
        setUserUuid(resp.user.id);
        setUserProfiles(prev => ({
          ...prev, 
          [resp.user.id]: { 
            name: resp.user.name || 'You', 
            avatar: undefined 
          }
        }));
        console.log('[Chat] fetched user details', resp.user);
      })
      .catch((e) => console.warn('[Chat] failed to fetch user details', e));
  }, [apiUtil, setNavBarVariant]);

  const fetchUserProfile = async (userId: string): Promise<{name: string, avatar?: string}> => {
    if (userProfiles[userId]) return userProfiles[userId];
    
    try {
      const response = await apiUtil.get<{user: {id: string, name: string, avatar?: string}}>(`/user/${userId}`);
      const profile = {
        name: response.user.name || 'Unknown User',
        avatar: response.user.avatar
      };
      setUserProfiles(prev => ({...prev, [userId]: profile}));
      return profile;
    } catch (error) {
      console.warn('[Chat] Failed to fetch user profile for', userId, error);
      const fallbackProfile = { name: 'Unknown User', avatar: undefined };
      setUserProfiles(prev => ({...prev, [userId]: fallbackProfile}));
      return fallbackProfile;
    }
  };

  const markMessageAsRead = (messageId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message_status',
        message_id: messageId,
        status: 'seen',
        user_id: userUuid,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(payload));
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'seen', readBy: [...(msg.readBy || []), userUuid!] }
          : msg
      ));
    }
  };

  const sendMessageStatus = (messageId: string, status: 'delivered' | 'seen') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message_status',
        message_id: messageId,
        status,
        user_id: userUuid,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && userUuid) {
      const payload = {
        type: 'typing',
        user_id: userUuid,
        is_typing: isTyping,
        timestamp: new Date().toISOString(),
      };
      wsRef.current.send(JSON.stringify(payload));
      console.log('[WebSocket] Sent typing indicator:', { is_typing: isTyping });
    }
  };

  const sendTypingIndicatorDebounced = (isTyping: boolean) => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    
    if (isTyping) {
      sendTypingIndicator(true);
    } else {
      typingDebounceRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 100);
    }
  };

  const handleTypingStart = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
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
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicatorDebounced(false);
    }
  };

  const addTypingUser = (userId: string, userName: string) => {
    if (userId === userUuid) return;
    
    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      
      if (newTypingUsers[userId]?.timeout) {
        clearTimeout(newTypingUsers[userId].timeout);
      }
      
      newTypingUsers[userId] = {
        name: userName,
        timeout: setTimeout(() => {
          setTypingUsers(current => {
            const updated = { ...current };
            delete updated[userId];
            return updated;
          });
        }, 5000)
      };
      
      return newTypingUsers;
    });
  };

  const removeTypingUser = (userId: string) => {
    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      if (newTypingUsers[userId]?.timeout) {
        clearTimeout(newTypingUsers[userId].timeout);
      }
      delete newTypingUsers[userId];
      return newTypingUsers;
    });
  };

  const fetchChatDetails = async (rideId: string) => {
    try {
      const rideResponse = await apiUtil.get<{
        id: string;
        host_user_id: string;
        host_user_name: string;
        start_location: string;
        end_location: string;
        start_time: string;
        total_price: number;
        total_seats: number;
        booked_seats: number;
        is_ongoing: boolean;
        created_at: string;
        is_user_host: boolean;
        host: {
          id: string;
          name: string;
          email: string;
          profile_picture_url: string;
          contact_number: string;
        };
        bookings: Array<{
          id: string;
          passenger_id: string;
          request_status: string;
          booking_created_at: string;
          passenger_name: string;
          passenger_email: string;
          passenger_profile_picture_url: string;
          passenger_contact_number: string;
        }>;
      }>(`/ride/details/${rideId}`);

      const rideData = rideResponse;
      
      setRideDetails({
        id: rideData.id,
        title: `${rideData.start_location} to ${rideData.end_location}`,
        subtitle: `${rideData.booked_seats + 1} participants`, // +1 for host
        destination: rideData.end_location,
        departure: rideData.start_location,
        date: new Date(rideData.start_time).toLocaleDateString(),
        time: new Date(rideData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: `₹${rideData.total_price}`,
        driverName: rideData.host.name,
        totalSeats: rideData.total_seats,
        availableSeats: rideData.total_seats - (rideData.booked_seats + 1), // -1 for host seat
        hostUserId: rideData.host_user_id,
        isUserHost: rideData.is_user_host
      });

      const participants: Participant[] = [];
      
      participants.push({
        id: rideData.host.id,
        name: rideData.host.name,
        avatar: rideData.host.profile_picture_url,
        isOnline: false,
        role: 'admin',
      });
      console.log('[Chat] Added host participant:', { id: rideData.host.id, name: rideData.host.name });

      rideData.bookings
        .filter(booking => booking.request_status === 'accepted')
        .forEach(booking => {
          participants.push({
            id: booking.passenger_id,
            name: booking.passenger_name,
            avatar: booking.passenger_profile_picture_url,
            isOnline: false,
            role: 'member',
          });
          console.log('[Chat] Added passenger participant:', { id: booking.passenger_id, name: booking.passenger_name });
        });

      setParticipants(participants);
      console.log('[Chat] Set participants:', participants.map(p => ({ id: p.id, name: p.name, role: p.role })));

      const totalOccupiedSeats = rideData.booked_seats + 1; // +1 for host
      const remainingSeats = rideData.total_seats - totalOccupiedSeats;
      
      setRideDetails(prevDetails => ({
        ...prevDetails!,
        availableSeats: Math.max(0, remainingSeats),
        subtitle: `${participants.length} participants`
      }));

      try {
        const settingsResponse = await apiUtil.get<{settings: {chat_name?: string, notifications_muted?: boolean}}>(`/ride/${rideId}/settings`);
        setNotificationsMuted(settingsResponse.settings?.notifications_muted || false);
        if (settingsResponse.settings?.chat_name) {
          setChatTitle(settingsResponse.settings.chat_name);
        }
      } catch (settingsError) {
        console.warn('[Chat] Failed to fetch ride settings, using default', settingsError);
        setNotificationsMuted(false);
      }
    } catch (error) {
      console.warn('[Chat] Failed to fetch chat details', error);
      setRideDetails({
        id: rideId,
        title: chatTitle,
        subtitle: chatSubtitle,
        destination: 'Unknown Destination',
        departure: 'Unknown Departure',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: '₹0',
        driverName: 'Unknown Host',
        totalSeats: 4,
        availableSeats: 1
      });
      setParticipants([
        { 
          id: userUuid || '1', 
          name: userProfiles[userUuid || '1']?.name || 'You', 
          role: 'member', 
          isOnline: true 
        },
      ]);
      console.log('[Chat] Set fallback participants, userUuid:', userUuid, 'userProfiles:', userProfiles);
    }
  };

  useEffect(() => {
    if (!userUuid) return;
    setNavBarVariant?.(0);
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    const userId: string = chatParams.userId || userUuid;
    const isGroupChat = chatParams.isGroupChat !== false; // Default to true for backward compatibility
    if (!chatId) return;

    if (isGroupChat) {
      // For group chats, chatId is the ride ID
      fetchChatDetails(chatId);
    } else {
      // For DMs, chatId is the room ID (dm_userId1_userId2)
      // Set up a simple chat with just the current user and the other user
      setRideDetails(null); // No ride details for DMs
      
      // Fetch the other user's profile for better display
      const otherUserId = chatParams.otherUserId;
      if (otherUserId) {
        fetchUserProfile(otherUserId).then(otherUserProfile => {
          setParticipants([
            { 
              id: userUuid, 
              name: userProfiles[userUuid]?.name || 'You', 
              role: 'member', 
              isOnline: true 
            },
            { 
              id: otherUserId, 
              name: otherUserProfile.name || 'Other User', 
              role: 'member', 
              isOnline: false 
            }
          ]);
        });
      } else {
        // Fallback if otherUserId is not provided
        setParticipants([
          { 
            id: userUuid, 
            name: userProfiles[userUuid]?.name || 'You', 
            role: 'member', 
            isOnline: true 
          },
          { 
            id: 'unknown', 
            name: chatParams.chatTitle?.replace('Chat with ', '') || 'Other User', 
            role: 'member', 
            isOnline: false 
          }
        ]);
      }
      console.log('[Chat] Set DM participants for room:', chatId, 'with other user:', otherUserId);
    }

    ChatService.fetchMessages(apiUtil, chatId)
      .then(async (msgs) => {
        console.log('[Chat] fetched messages', msgs);
        const transformed = msgs.map((m: any): ChatMessage => {
          let senderName = 'Unknown User';
          let senderAvatar = undefined;
          
          if (m.sender && typeof m.sender === 'object') {
            senderName = m.sender.name || m.sender_name || 'Unknown User';
            senderAvatar = m.sender.profile_picture_url || m.sender.avatar;
          } else if (m.sender_name) {
            senderName = m.sender_name;
          }
          
          return {
            id: m.id,
            text: m.content || m.text || '',
            sender: m.sender_id === userUuid ? 'user' : 'other',
            senderId: m.sender_id,
            senderName,
            senderAvatar,
            timestamp: new Date(m.created_at || m.timestamp || Date.now()),
            status: m.sender_id === userUuid ? (m.status || 'sent') : undefined,
            readBy: m.read_by || [],
          };
        });
        setMessages(transformed);
      })
      .catch((error) => {
        if (!isGroupChat) {
          // For DMs, if message fetching fails, start with empty messages
          // This is expected until backend supports DM message storage
          console.log('[Chat] DM message fetching not yet supported, starting with empty messages');
          setMessages([]);
        } else {
          console.error('[Chat] Failed to fetch messages:', error);
        }
      });

    const ws = ChatService.openSocket(userId, chatId, (e) => {
      console.log('[WebSocket] message received raw', e.data);
      try {
        const rawData = e.data.trim();
        
        const messages = rawData.split('\n').filter((line: string) => line.trim());
        
        for (const messageStr of messages) {
          try {
            const data = JSON.parse(messageStr);
            
            if (data.type === 'message') {
              if (data.temp_id) {
                console.log('[WebSocket] Received temp_id confirmation:', data.temp_id, '→', data.message_id);
                setMessages(prev => {
                  const updated = prev.map(msg => 
                    msg.id === data.temp_id 
                      ? { ...msg, id: data.message_id, status: 'sent' as const }
                      : msg
                  );
                  console.log('[WebSocket] Updated message with real ID, total messages:', updated.length);
                  return updated;
                });
                continue;
              }
              
              let senderName = 'Unknown User';
              let senderAvatar = undefined;
              
              if (data.sender && typeof data.sender === 'object') {
                senderName = data.sender.name || data.sender_name || 'Unknown User';
                senderAvatar = data.sender.profile_picture_url || data.sender.avatar;
              } else if (data.sender_name) {
                senderName = data.sender_name;
              }
              
              const newMessage: ChatMessage = {
                id: data.message_id,
                text: data.content,
                sender: data.sender_id === userId ? 'user' : 'other',
                senderId: data.sender_id,
                senderName,
                senderAvatar,
                timestamp: new Date(data.timestamp),
                status: data.sender_id === userId ? 'sent' : undefined,
              };
              
              console.log('[WebSocket] Processing new message:', {
                id: newMessage.id,
                content: newMessage.text,
                sender: newMessage.sender,
                senderId: newMessage.senderId,
                currentUserId: userId
              });
              
              setMessages(prev => {
                if (prev.some(m => m.id === data.message_id)) {
                  console.log('[WebSocket] Duplicate message ignored:', data.message_id);
                  return prev;
                }
                
                console.log('[WebSocket] Adding new message to UI:', data.content, 'from:', senderName);
                const updated = [...prev, newMessage];
                console.log('[WebSocket] New messages array length:', updated.length);
                
                if (data.sender_id !== userId) {
                  setTimeout(() => {
                    sendMessageStatus(data.message_id, 'delivered');
                    setTimeout(() => {
                      sendMessageStatus(data.message_id, 'seen');
                    }, 500);
                  }, 100);
                }
                
                return updated;
              });
            } else if (data.type === 'message_status') {
              setMessages(prev => prev.map(msg => {
                if (msg.id === data.message_id) {
                  let updatedReadBy = msg.readBy || [];
                  if (data.status === 'seen' && data.user_id && !updatedReadBy.includes(data.user_id)) {
                    updatedReadBy = [...updatedReadBy, data.user_id];
                  }
                  return {
                    ...msg,
                    status: data.status,
                    readBy: updatedReadBy
                  };
                }
                return msg;
              }));
            } else if (data.type === 'user_joined' || data.type === 'user_left') {
              console.log(`[Chat] User ${data.type}: ${data.user_name || data.user_id}`);
            } else if (data.type === 'typing') {
              console.log(`[Chat] ${data.user_name || data.user_id} is typing: ${data.is_typing}`);
              if (data.user_id && data.user_name && data.user_id !== userUuid) {
                if (data.is_typing) {
                  addTypingUser(data.user_id, data.user_name);
                } else {
                  removeTypingUser(data.user_id);
                }
              }
            }
          } catch (parseError) {
            console.warn('[WebSocket] JSON parse error for message:', messageStr);
            console.warn('[WebSocket] Parse error details:', parseError);
          }
        }
      } catch (err) {
        console.warn('[WebSocket] Error processing WebSocket message:', err);
      }
    });
    console.log('[WebSocket] Initializing connection to:', ws.url);
    ws.onopen = () => {
      console.log('[WebSocket] Connection opened');
    };
    
    wsRef.current = ws;
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      
      if (isTyping && ws.readyState === WebSocket.OPEN) {
        sendTypingIndicator(false);
      }
      
      Object.values(typingUsers).forEach(user => {
        if (user.timeout) {
          clearTimeout(user.timeout);
        }
      });
      
      ws.close();
    };
  }, [route?.params, setNavBarVariant, userUuid]);

  useEffect(() => {
    if (!userUuid || messages.length === 0) return;
    
    const unreadMessages = messages.filter(msg => 
      msg.sender === 'other' && 
      (!msg.readBy || !msg.readBy.includes(userUuid))
    );
    
    unreadMessages.forEach(msg => {
      markMessageAsRead(msg.id);
    });
  }, [messages, userUuid]);

  useEffect(() => {
    console.log('[Chat] Messages state updated, count:', messages.length, 'messages:', messages.map(m => ({ id: m.id, text: m.text.substring(0, 20) })));
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = () => {
    const chatId = chatParams.chatRoom?.id || chatParams.chatId;
    if (!userUuid) { console.warn('[Chat] userUuid not ready'); return; }
    const userId: string = chatParams.userId || userUuid;
    if (!newMessage.trim() || !chatId) return;

    handleTypingStop();

    const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
    const messageText = newMessage.trim();
    
    const optimisticMessage: ChatMessage = {
      id: tempMessageId,
      text: messageText,
      sender: 'user',
      senderId: userId,
      senderName: 'You',
      timestamp: new Date(),
      status: 'sending'
    };
    
    console.log('[Chat] Adding optimistic message:', optimisticMessage);
    setMessages(prev => {
      const updated = [...prev, optimisticMessage];
      console.log('[Chat] Total messages after optimistic add:', updated.length);
      return updated;
    });
    setNewMessage('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message',
        room_id: chatId,
        sender_id: userId,
        content: messageText,
        timestamp: new Date().toISOString(),
        temp_id: tempMessageId,
      };
      console.log('[WebSocket] sending', payload);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId 
          ? { ...msg, status: 'failed' as any }
          : msg
      ));
    }
  };

  const handleMuteToggle = async (value: boolean) => {
    try {
      const chatId = chatParams.chatRoom?.id || chatParams.chatId;
      const isGroupChat = chatParams.isGroupChat !== false;
      
      if (isGroupChat) {
        await apiUtil.put(`/ride/${chatId}/settings`, { notifications_muted: value });
      }
      setNotificationsMuted(value);
    } catch (error) {
      console.warn('[Chat] Failed to update notification settings', error);
      setNotificationsMuted(value);
    }
  };

  const handleChatRename = async () => {
    if (!newChatName.trim()) {
      setEditingChatName(false);
      return;
    }

    try {
      const chatId = chatParams.chatRoom?.id || chatParams.chatId;
      const isGroupChat = chatParams.isGroupChat !== false;
      
      if (isGroupChat) {
        await apiUtil.put(`/ride/${chatId}/settings`, { chat_name: newChatName });
      }
      setChatTitle(newChatName);
      setEditingChatName(false);
      setNewChatName('');
    } catch (error) {
      console.warn('[Chat] Failed to rename chat', error);
      setChatTitle(newChatName);
      setEditingChatName(false);
      setNewChatName('');
    }
  };

  const handleLeaveRide = () => {
    const isGroupChat = chatParams.isGroupChat !== false;
    
    if (!isGroupChat) {
      // For DMs, just go back (no need to "leave")
      navigation.goBack();
      return;
    }
    
    Alert.alert(
      "Leave Ride",
      "Are you sure you want to leave this ride? You won't be able to rejoin unless invited again.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            try {
              const chatId = chatParams.chatRoom?.id || chatParams.chatId;
              await apiUtil.delete(`/rides/${chatId}/participants/${userUuid}`);
              navigation.goBack();
            } catch (error) {
              console.warn('[Chat] Failed to leave ride', error);
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg.sender !== 'user') return null;
    
    const { status } = msg;
    
    let statusText = '';
    let statusColor = '#999';
    
    switch (status) {
      case 'sending':
        statusText = '○';
        statusColor = '#999';
        break;
      case 'sent':
        statusText = '✓';
        statusColor = '#999';
        break;
      case 'delivered':
        statusText = '✓✓';
        statusColor = '#999';
        break;
      case 'seen':
        statusText = '✓✓';
        statusColor = AppColors.secondaryDarkGreen || '#4CAF50';
        break;
      case 'failed':
        statusText = '!';
        statusColor = '#f44336';
        break;
      default:
        statusText = '✓';
        statusColor = '#999';
    }
    
    return (
      <Text style={{ 
        fontSize: 10, 
        color: statusColor, 
        marginLeft: 4,
        fontWeight: status === 'seen' ? 'bold' : 'normal',
        fontFamily: 'monospace', 
      }}>
        {statusText}
      </Text>
    );
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUserMessage = msg.sender === 'user';
    
    return (
      <View
        key={msg.id}
        style={[
          isUserMessage
            ? chatMessagesStyles.messageSent
            : chatMessagesStyles.messageReceived,
          { marginVertical: 6 }
        ]}
      >
        {!isUserMessage && (
          <Text style={chatMessagesStyles.senderName}>
            {msg.senderName || 'Unknown User'}
          </Text>
        )}
        
        <Text
          style={
            isUserMessage
              ? chatMessagesStyles.messageTextSent
              : chatMessagesStyles.messageText
          }
        >
          {msg.text}
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
          marginTop: 2
        }}>
          <Text
            style={
              isUserMessage
                ? chatMessagesStyles.messageTimeSent
                : chatMessagesStyles.messageTime
            }
          >
            {msg.timestamp
              ? (() => {
                  try {
                    const d = new Date(msg.timestamp);
                    if (isNaN(d.getTime())) return '';
                    return d.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  } catch {
                    return '';
                  }
                })()
              : ''}
          </Text>
          {renderMessageStatus(msg)}
        </View>
      </View>
    );
  };

  const renderSettingsModal = () => {
    const isGroupChat = chatParams.isGroupChat !== false;
    
    return (
    <Modal
      visible={showSettings}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettings(false)}
    >
      <SafeAreaView style={chatMessagesStyles.container}>
        <View style={chatMessagesStyles.settingsHeader}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={chatMessagesStyles.settingsCloseButton}>Done</Text>
          </TouchableOpacity>
          <Text style={chatMessagesStyles.settingsTitle}>Chat Settings</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={chatMessagesStyles.settingsContent}>
          <View style={chatMessagesStyles.settingsSection}>
            <View style={chatMessagesStyles.chatInfoHeader}>
              <View style={chatMessagesStyles.chatAvatarContainer}>
                <Text style={chatMessagesStyles.chatAvatarText}>
                  {(chatTitle || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={chatMessagesStyles.chatInfoDetails}>
                {editingChatName && isGroupChat ? (
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
                  <TouchableOpacity onPress={isGroupChat ? () => {
                    setEditingChatName(true);
                    setNewChatName(chatTitle);
                  } : undefined}>
                    <Text style={chatMessagesStyles.chatTitleLarge}>{chatTitle}</Text>
                    {isGroupChat && <Text style={chatMessagesStyles.tapToEdit}>Tap to edit</Text>}
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
            {participants.map((participant, index) => (
              <View key={`participant-${index}-${participant.id}`} style={chatMessagesStyles.participantItem}>
                <View style={chatMessagesStyles.participantAvatar}>
                  <Text style={chatMessagesStyles.participantAvatarText}>
                    {(() => {
                      if (participant.id === userUuid) {
                        const userName = userProfiles[userUuid]?.name || participant.name;
                        return (userName && userName !== 'Unknown User' ? userName : 'Y').charAt(0).toUpperCase();
                      }
                      const name = participant.name && participant.name.trim() !== '' && participant.name !== 'Unknown User'
                        ? participant.name
                        : 'U';
                      return name.charAt(0).toUpperCase();
                    })()}
                  </Text>
                  {participant.isOnline && (
                    <View style={chatMessagesStyles.onlineIndicator} />
                  )}
                </View>
                <View style={chatMessagesStyles.participantInfo}>
                  <Text style={chatMessagesStyles.participantName}>
                    {(() => {
                      if (participant.id === userUuid) {
                        // For current user, prioritize stored user profile name
                        const userName = userProfiles[userUuid]?.name || participant.name;
                        return userName && userName !== 'Unknown User' 
                          ? `${userName} (You)` 
                          : 'You';
                      }
                      // For other participants, use participant name with fallback
                      return participant.name && participant.name.trim() !== '' && participant.name !== 'Unknown User' 
                        ? participant.name 
                        : 'Unknown User';
                    })()}
                  </Text>
                  <Text style={chatMessagesStyles.participantRole}>
                    {isGroupChat ? (participant.role === 'admin' ? 'Host' : 'Passenger') : 'Contact'}
                    {participant.isOnline ? ' • Online' : ' • Offline'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {rideDetails && isGroupChat && (
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
                  {((rideDetails.totalSeats || 0) - (rideDetails.availableSeats || 0))}/{rideDetails.totalSeats || 0} occupied • {rideDetails.availableSeats || 0} available
                </Text>
              </View>
            </View>
          )}

          {/* Settings Section */}
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

          {isGroupChat && (
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
    <SafeAreaView style={chatMessagesStyles.container}>
      <StatusBar
        backgroundColor={AppColors.primaryLightGreen}
        barStyle="dark-content"
      />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <BrandInfo />
      </View>

      <View
        style={[
          chatMessagesStyles.chatHeader,
          { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
        ]}
      >
        <TouchableOpacity
          style={{ marginRight: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/arrow-square-left.png')}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
          >
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
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={chatMessagesStyles.settingsButton}
            >
              <Settings size={24} color="#273B33" />
            </TouchableOpacity>
          </View>
          {/* <Text
            style={{
              color: '#000',
              fontSize: 15,
              fontFamily: 'Nunito Sans',
              fontWeight: '300',
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {chatSubtitle}
          </Text> */}
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={chatMessagesStyles.messagesContainer}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }}
        key={`messages-${messages.length}`}
      >
        {messages.map((msg, index) => (
          <View key={`msg-${index}-${msg.id}`}>
            {renderMessage(msg)}
          </View>
        ))}
      </ScrollView>

      {Object.keys(typingUsers).length > 0 && (
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: 'rgba(168, 216, 168, 0.1)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(168, 216, 168, 0.3)',
        }}>
          <Text style={{
            color: '#666',
            fontSize: 14,
            fontFamily: 'Nunito Sans',
            fontStyle: 'italic'
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

      <View style={chatMessagesStyles.typingBarContainer}>
        <TextInput
          style={[
            chatMessagesStyles.typingBarText,
            { flex: 1, color: '#000', fontFamily: 'Nunito Sans' }
          ]}
          placeholder="Start typing..."
          placeholderTextColor="#000"
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            if (text.trim().length > 0) {
              handleTypingStart();
            } else {
              handleTypingStop();
            }
          }}
          onBlur={handleTypingStop}
          onEndEditing={handleTypingStop}
          onSubmitEditing={() => {
            handleTypingStop();
            if (newMessage.trim()) {
              sendMessage();
            }
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={chatMessagesStyles.typingBarIconContainer}
        >
          <Image
            source={require('../../assets/arrow-square-left.png')}
            style={{ width: 40, height: 40, transform: [{ rotate: '90deg' }] }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {renderSettingsModal()}
    </SafeAreaView>
  );
};

export default ChatConversationScreen;