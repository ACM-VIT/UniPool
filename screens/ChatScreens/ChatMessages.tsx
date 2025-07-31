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
  vehicle?: string;
  driverName?: string;
  totalSeats?: number;
  availableSeats?: number;
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
  const wsRef = useRef<WebSocket | null>(null);

  type ChatRouteParams = {
    chatId?: string;
    chatRoom?: { id: string; title?: string; subtitle?: string };
    chatTitle?: string;
    chatSubtitle?: string;
    userId?: string;
  };

  const chatParams = (route?.params as ChatRouteParams) ?? {};
  const [chatTitle, setChatTitle] = useState(chatParams.chatTitle ?? 'Vellore to Chennai');
  const chatSubtitle = chatParams.chatSubtitle ?? 'You, Bhallaldeva, Kattappa and 3 more';

  useEffect(() => {
    setNavBarVariant?.(0);
    apiUtil.get<{user: {id: string}}>("/user/details")
      .then((resp) => {
        setUserUuid(resp.user.id);
        console.log('[Chat] fetched user uuid', resp.user.id);
      })
      .catch((e) => console.warn('[Chat] failed to fetch user uuid', e));
  }, [apiUtil, setNavBarVariant]);

  const fetchUserProfile = async (userId: string) => {
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
      const fallbackProfile = { name: 'Unknown User' };
      setUserProfiles(prev => ({...prev, [userId]: fallbackProfile}));
      return fallbackProfile;
    }
  };

  const fetchChatDetails = async (rideId: string) => {
    try {
      const rideResponse = await apiUtil.get<{ride: RideDetails}>(`/ride/fetch/${rideId}`);
      setRideDetails(rideResponse.ride);

      const bookingsResponse = await apiUtil.get<{bookings: any[]}>(`/booking/ride/${rideId}`);
      const participants: Participant[] = bookingsResponse.bookings.map((booking: any) => {
        const passenger = booking.RideDetails?.Passenger || booking.Passenger || {};
        return {
          id: passenger.id || booking.passenger_id || '',
          name: passenger.name || 'Unknown',
          avatar: passenger.avatar,
          isOnline: false,
          role: 'member',
        };
      });
      setParticipants(participants);

      const settingsResponse = await apiUtil.get<{muted: boolean}>(`/ride/fetch/${rideId}/settings`);
      setNotificationsMuted(settingsResponse.muted);
    } catch (error) {
      console.warn('[Chat] Failed to fetch chat details', error);
      setRideDetails({
        id: rideId,
        title: chatTitle,
        subtitle: chatSubtitle,
        destination: 'Chennai Central',
        departure: 'Vellore',
        date: '2025-07-31',
        time: '09:30 AM',
        price: '₹250',
        vehicle: 'Maruti Suzuki Swift',
        driverName: 'Bhallaldeva',
        totalSeats: 4,
        availableSeats: 1
      });
      setParticipants([
        { id: userUuid || '1', name: 'You', role: 'member', isOnline: true },
        { id: '2', name: 'Bhallaldeva', role: 'admin', isOnline: true },
        { id: '3', name: 'Kattappa', role: 'member', isOnline: false },
        { id: '4', name: 'Sivagami', role: 'member', isOnline: true },
        { id: '5', name: 'Devasena', role: 'member', isOnline: false },
      ]);
    }
  };

  useEffect(() => {
    if (!userUuid) return;
    setNavBarVariant?.(0);
    const rideId = chatParams.chatRoom?.id || chatParams.chatId;
    const userId: string = chatParams.userId || userUuid;
    if (!rideId) return;

    fetchChatDetails(rideId);

    ChatService.fetchMessages(apiUtil, rideId)
      .then((msgs) => {
        console.log('[Chat] fetched messages', msgs);
        const transformed = msgs.map((m: any): ChatMessage => {
          let senderName = 'Unknown User';
          let senderAvatar = undefined;
          if (m.sender && typeof m.sender === 'object') {
            senderName = m.sender.name || m.sender_name || 'Unknown User';
            senderAvatar = m.sender.profile_picture_url;
          } else if (m.sender_name) {
            senderName = m.sender_name;
          }
          return {
            id: m.id,
            text: m.content || m.text || '',
            sender: m.sender_id === userUuid ? 'user' : 'other',
            senderId: m.sender_id,
            senderName,
            timestamp: new Date(m.created_at || m.timestamp || Date.now()),
          };
        });
        setMessages(transformed);
      })
      .catch(console.error);

    const ws = ChatService.openSocket(userId, rideId, (e) => {
      console.log('[WebSocket] message received raw', e.data);
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') {
          let senderName = 'Unknown User';
          let senderAvatar = undefined;
          if (data.sender && typeof data.sender === 'object') {
            senderName = data.sender.name || data.sender_name || 'Unknown User';
            senderAvatar = data.sender.profile_picture_url;
          } else if (data.sender_name) {
            senderName = data.sender_name;
          }
          setMessages(prev => {
            if (prev.some(m => m.id === data.message_id)) return prev;
            return [
              ...prev,
              {
                id: data.message_id,
                text: data.content,
                sender: data.sender_id === userId ? 'user' : 'other',
                senderId: data.sender_id,
                senderName,
                senderAvatar,
                timestamp: new Date(data.timestamp),
              },
            ];
          });
        }
      } catch (err) {
        console.warn(err);
      }
    });
    console.log('[WebSocket] Initializing connection to:', ws.url);
    ws.onopen = () => {
      console.log('[WebSocket] Connection opened');
    };
    
    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, [route?.params, setNavBarVariant, userUuid]);

  const sendMessage = () => {
    const rideId = chatParams.chatRoom?.id || chatParams.chatId;
    if (!userUuid) { console.warn('[Chat] userUuid not ready'); return; }
    const userId: string = chatParams.userId || userUuid;
    if (!newMessage.trim() || !rideId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message',
        room_id: rideId,
        sender_id: userId,
        content: newMessage,
        timestamp: new Date().toISOString(),
      };
      console.log('[WebSocket] sending', payload);
      wsRef.current.send(JSON.stringify(payload));
      setNewMessage('');
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  };

  const handleMuteToggle = async (value: boolean) => {
    try {
      const rideId = chatParams.chatRoom?.id || chatParams.chatId;
      await apiUtil.post(`/rides/${rideId}/settings`, { muted: value });
      setNotificationsMuted(value);
    } catch (error) {
      console.warn('[Chat] Failed to update notification settings', error);
      // For demo, just update the state
      setNotificationsMuted(value);
    }
  };

  const handleChatRename = async () => {
    if (!newChatName.trim()) {
      setEditingChatName(false);
      return;
    }

    try {
      const rideId = chatParams.chatRoom?.id || chatParams.chatId;
      await apiUtil.put(`/rides/${rideId}`, { title: newChatName });
      setChatTitle(newChatName);
      setEditingChatName(false);
      setNewChatName('');
    } catch (error) {
      console.warn('[Chat] Failed to rename chat', error);
      // For demo, just update the state
      setChatTitle(newChatName);
      setEditingChatName(false);
      setNewChatName('');
    }
  };

  const handleLeaveRide = () => {
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
              const rideId = chatParams.chatRoom?.id || chatParams.chatId;
              await apiUtil.delete(`/rides/${rideId}/participants/${userUuid}`);
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
      </View>
    );
  };

  const renderSettingsModal = () => (
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
                  {chatTitle.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={chatMessagesStyles.chatInfoDetails}>
                {editingChatName ? (
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
                  <TouchableOpacity onPress={() => {
                    setEditingChatName(true);
                    setNewChatName(chatTitle);
                  }}>
                    <Text style={chatMessagesStyles.chatTitleLarge}>{chatTitle}</Text>
                    <Text style={chatMessagesStyles.tapToEdit}>Tap to edit</Text>
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
            {participants.map((participant) => (
              <View key={participant.id} style={chatMessagesStyles.participantItem}>
                <View style={chatMessagesStyles.participantAvatar}>
                  <Text style={chatMessagesStyles.participantAvatarText}>
                    {participant.name.charAt(0).toUpperCase()}
                  </Text>
                  {participant.isOnline && (
                    <View style={chatMessagesStyles.onlineIndicator} />
                  )}
                </View>
                <View style={chatMessagesStyles.participantInfo}>
                  <Text style={chatMessagesStyles.participantName}>
                    {participant.name}
                    {participant.id === userUuid && ' (You)'}
                  </Text>
                  <Text style={chatMessagesStyles.participantRole}>
                    {participant.role === 'admin' ? 'Driver' : 'Passenger'}
                    {participant.isOnline ? ' • Online' : ' • Offline'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {rideDetails && (
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
              {rideDetails.vehicle && (
                <View style={chatMessagesStyles.rideDetailItem}>
                  <Text style={chatMessagesStyles.rideDetailLabel}>Vehicle</Text>
                  <Text style={chatMessagesStyles.rideDetailValue}>{rideDetails.vehicle}</Text>
                </View>
              )}
              {rideDetails.driverName && (
                <View style={chatMessagesStyles.rideDetailItem}>
                  <Text style={chatMessagesStyles.rideDetailLabel}>Driver</Text>
                  <Text style={chatMessagesStyles.rideDetailValue}>{rideDetails.driverName}</Text>
                </View>
              )}
              <View style={chatMessagesStyles.rideDetailItem}>
                <Text style={chatMessagesStyles.rideDetailLabel}>Seats</Text>
                <Text style={chatMessagesStyles.rideDetailValue}>
                  {rideDetails.availableSeats}/{rideDetails.totalSeats} available
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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

      <ScrollView style={chatMessagesStyles.messagesContainer}>
        {messages.map(renderMessage)}
      </ScrollView>

      <View style={chatMessagesStyles.typingBarContainer}>
        <TextInput
          style={[
            chatMessagesStyles.typingBarText,
            { flex: 1, color: '#000', fontFamily: 'Nunito Sans' }
          ]}
          placeholder="Start typing..."
          placeholderTextColor="#000"
          value={newMessage}
          onChangeText={setNewMessage}
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