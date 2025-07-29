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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  }, [setNavBarVariant]);

  useEffect(() => {
    setNavBarVariant?.(0);
    const rideId = chatParams.chatRoom?.id || chatParams.chatId;
    const userId = chatParams.userId || 'me';
    if (!rideId) return;

    ChatService.fetchMessages(apiUtil, rideId)
      .then(setMessages)
      .catch(console.error);

    const ws = new WebSocket(
      `${process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000'}/ws?user_id=${userId}&room_id=${rideId}`
    );
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') {
          setMessages((prev) => [
            ...prev,
            {
              id: data.message_id,
              text: data.content,
              sender: data.sender_id === userId ? 'user' : 'other',
              timestamp: new Date(data.timestamp),
            },
          ]);
        }
      } catch (err) {
        console.warn(err);
      }
    };
    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, [route?.params, setNavBarVariant]);

  const sendMessage = () => {
    const rideId = chatParams.chatRoom?.id || chatParams.chatId;
    const userId = chatParams.userId || 'me';
    if (!newMessage.trim() || !rideId) return;

    ChatService.sendMessage(apiUtil, rideId, newMessage, userId).catch(
      console.error
    );

    setNewMessage('');
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
        {messages.map((msg: ChatMessage) => (
          <View
            key={msg.id}
            style={
              msg.sender === 'user'
                ? chatMessagesStyles.messageSent
                : chatMessagesStyles.messageReceived
            }
          >
            <Text
              style={
                msg.sender === 'user'
                  ? chatMessagesStyles.messageTextSent
                  : chatMessagesStyles.messageText
              }
            >
              {msg.text}
            </Text>
            <Text
              style={
                msg.sender === 'user'
                  ? chatMessagesStyles.messageTimeSent
                  : chatMessagesStyles.messageTime
              }
            >
              {msg.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}
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
