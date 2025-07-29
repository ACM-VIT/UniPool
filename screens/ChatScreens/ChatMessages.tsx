import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';

import { useApi } from '../../utils/ApiUtil';
import ChatService from '../../utils/ChatService';
import BrandInfo from '../../components/BrandInfo';

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
  const wsRef = useRef<WebSocket | null>(null);

  type ChatRouteParams = {
    chatId?: string;
    chatRoom?: { id: string; title?: string; subtitle?: string };
    chatTitle?: string;
    chatSubtitle?: string;
    userId?: string;
  };

  const chatParams = (route?.params as ChatRouteParams) ?? {};
  const chatTitle = chatParams.chatTitle ?? 'Vellore to Chennai';
  const chatSubtitle =
    chatParams.chatSubtitle ?? 'You, Bhallaldeva, Kattappa and 3 more';

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

  useEffect(() => {
    if (!userUuid) return;
    setNavBarVariant?.(0);
    const rideId = chatParams.chatRoom?.id || chatParams.chatId;
    const userId: string = chatParams.userId || userUuid;
    if (!rideId) return;

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
                fontSize: 25,
                fontFamily: 'Nunito Sans',
                fontWeight: '600',
                flex: 1,
                minWidth: 0,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatTitle}
            </Text>
            <Image
              source={require('../../assets/wagon.png')}
              style={{ width: 80, height: 56 }}
              resizeMode="contain"
            />
          </View>
          <Text
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
          </Text>
        </View>
      </View>

      <ScrollView style={chatMessagesStyles.messagesContainer}>
        {messages.map(renderMessage)}
      </ScrollView>

      <View style={chatMessagesStyles.typingBarContainer}>
        <TextInput
          style={[chatMessagesStyles.typingBarText, { flex: 1 }]}
          placeholder="Start typing..."
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
    </SafeAreaView>
  );
};

export default ChatConversationScreen;