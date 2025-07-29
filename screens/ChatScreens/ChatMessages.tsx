import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { chatMessagesStyles } from './ChatScreen.styles';
import { ChatMessagesScreenProps, ChatMessage } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';

const ChatConversationScreen: React.FC<ChatMessagesScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  const [message, setMessage] = useState('');
  
  // Hide navbar when this screen mounts
  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);
  
  // Get chat data from navigation parameters
  const chatParams = route?.params;
  const chatTitle = chatParams?.chatTitle || 'Vellore to Chennai';
  const chatSubtitle = chatParams?.chatSubtitle || 'You, Bhallaldeva, Kattappa and 3 more';
  
  const sampleMessages: ChatMessage[] = [
    {
      id: '1',
      text: 'Mollit amet commodo consectetur nulla dolor deserunt exercitation adipisicing cupidatat elit duis esse. Sit occaecat et consequat et sunt ut laboris aliquip fugiat irure. Aute occaecat consectetur aliqua adipisicing aliquip. Eu non ad qui dolore tempor et magna exercitation. Mollit ad pariatur sunt. Amet esse irure mollit minim pariatur sint incididunt nulla dolor nostrud pariatur consequat esse aliquip est et ullamco sunt consectetur laboris pariatur fugiat incididunt reprehenderit sint. Commodo duis consectetur veniam irure consequat officia cupidatat.',
      sender: 'other',
      timestamp: new Date('2024-07-29T20:10:00'),
      senderName: 'Bhallaldeva'
    },
    {
      id: '2',
      text: 'I dolore tempor et magna exercitation. Mollit ad pariatur sunt. Amet esse irure',
      sender: 'user',
      timestamp: new Date('2024-07-29T20:10:00'),
    },
  ];

  return (
    <SafeAreaView style={chatMessagesStyles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
      
      {/* Header */}
      <View style={chatMessagesStyles.header}>
        <View style={chatMessagesStyles.headerLeft}>
          <Image 
            source={require('../../assets/beep-beep-location.png')} 
            style={{ width: 16, height: 16, marginRight: 4 }} 
            resizeMode="contain"
          />
          <View>
            <Text style={chatMessagesStyles.instituteName}>Vellore Institute of Technology</Text>
            <Text style={chatMessagesStyles.instituteNumber}>632014</Text>
          </View>
        </View>
        <Text style={chatMessagesStyles.appName}>UniPool</Text>
      </View>

      {/* Chat Header */}
      <View style={[chatMessagesStyles.chatHeader, { flexDirection: 'row', alignItems: 'center' }]}> 
        {/* Back arrow vertically centered with text block */}
        <TouchableOpacity style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => navigation?.goBack()}>
          <Image 
            source={require('../../assets/arrow-square-left.png')} 
            style={{ width: 24, height: 24, marginRight: 12 }} 
            resizeMode="contain"
          />
        </TouchableOpacity>
        {/* Title and car in a single row, subtitle below */}
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text
              style={{
                color: '#273B33',
                fontSize: 25,
                fontFamily: 'Nunito Sans',
                fontWeight: '600',
                marginRight: 8,
                flex: 2,
                minWidth: 0,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatTitle}
            </Text>
            <Image
              source={require('../../assets/wagon.png')}
              style={{ width: 80, height: 56, flex: 0 }}
              resizeMode="contain"
            />
          </View>
          <Text
            style={{
              color: 'black',
              fontSize: 15,
              fontFamily: 'Nunito Sans',
              fontWeight: '300',
              marginLeft: 2,
              marginTop: 0,
              flexShrink: 1,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {chatSubtitle}
          </Text>
        </View>
      </View>

      {/* Info Message removed as per user request */}

      {/* Messages */}
      <ScrollView style={chatMessagesStyles.messagesContainer}>
        {sampleMessages.map((msg) => (
          <View 
            key={msg.id} 
            style={msg.sender === 'user' ? chatMessagesStyles.messageSent : chatMessagesStyles.messageReceived}
          >
            <Text style={msg.sender === 'user' ? chatMessagesStyles.messageTextSent : chatMessagesStyles.messageText}>
              {msg.text}
            </Text>
            <Text style={msg.sender === 'user' ? chatMessagesStyles.messageTimeSent : chatMessagesStyles.messageTime}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Custom Typing Bar */}
      <View style={chatMessagesStyles.typingBarContainer}>
        <Text style={chatMessagesStyles.typingBarText}>Start Typing...</Text>
        <View style={{ flexDirection: 'row' }}>
          {/* Arrow square left icon */}
          <View style={chatMessagesStyles.typingBarIconContainer}>
            <Image 
              source={require('../../assets/arrow-square-left.png')} 
              style={{ 
                width: 40, 
                height: 40, 
                transform: [{ rotate: '90deg' }]
              }} 
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChatConversationScreen;
