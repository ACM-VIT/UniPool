import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PassengerInfoScreenProps, User } from './ChatScreen.types';
import BrandInfo from '../../components/BrandInfo';
import LoadingComponent from '../../components/LoadingComponent';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
import ChatService from '../../utils/ChatService';


const THEME = {
  lightGreen: '#C1D95E', 
  darkGreen: '#1F3329',  
  textWhite: '#FFFFFF',
  textGrey: '#8C9E96',
  separator: '#2C3E36',
  accent: '#C1D95E',     
  black: '#000000'
};

const PassengerInfoScreen: React.FC<PassengerInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  const [passengers, setPassengers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [lastMessages, setLastMessages] = useState<{ [roomId: string]: { text: string; timestamp: Date } | null }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [roomId: string]: number }>({});
  
  const [activeTab, setActiveTab] = useState<'groups' | 'individuals'>('individuals');

  const { apiUtil } = useApi();

  const generateDMRoomId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
  };


  const processBackendMessage = (backendMsg: any): { text: string; timestamp: Date } | null => {
    if (!backendMsg) return null;
    
    const content = backendMsg.content || backendMsg.text || backendMsg.message;
    const timestamp = backendMsg.timestamp || backendMsg.created_at || backendMsg.sent_at;
    
    if (!content) return null;
    
    let parsedTimestamp: Date;
    if (timestamp) {
      parsedTimestamp = new Date(timestamp);
      if (isNaN(parsedTimestamp.getTime())) {
        parsedTimestamp = new Date();
      }
    } else {
      parsedTimestamp = new Date();
    }
    
    return { text: content, timestamp: parsedTimestamp };
  };

  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        const involvedRides = await RideService.getInvolvedRides(apiUtil);
        
        const currentUserResponse = await apiUtil.get<{user: {id: string, name: string}}>("/user/details");
        const fetchedCurrentUserId = currentUserResponse.user.id;
        setCurrentUserId(fetchedCurrentUserId);
        
        const uniquePeopleMap = new Map<string, User>();
        
        for (const ride of involvedRides) {
          try {
            const rideDetails = await apiUtil.get<{
              host: { id: string; name: string; email: string; };
              bookings: Array<{
                passenger_id: string;
                passenger_name: string;
                passenger_email: string;
                request_status: string;
              }>;
            }>(`/ride/details/${ride.id}`);
            
            if (rideDetails.host.id !== fetchedCurrentUserId) {
              uniquePeopleMap.set(rideDetails.host.id, {
                id: rideDetails.host.id,
                name: rideDetails.host.name,
                email: rideDetails.host.email,
              });
            }
            
            rideDetails.bookings
              .filter(booking => booking.request_status === 'accepted' && booking.passenger_id !== fetchedCurrentUserId)
              .forEach(booking => {
                uniquePeopleMap.set(booking.passenger_id, {
                  id: booking.passenger_id,
                  name: booking.passenger_name,
                  email: booking.passenger_email,
                });
              });
          } catch (error) {
            console.warn(`Failed to fetch details for ride ${ride.id}:`, error);
          }
        }
        
        const uniquePeople = Array.from(uniquePeopleMap.values());
        setPassengers(uniquePeople);


        const messagesMap: { [roomId: string]: { text: string; timestamp: Date } | null } = {};
        const unreadMap: { [roomId: string]: number } = {};
        
        for (const person of uniquePeople) {
          const dmRoomId = generateDMRoomId(fetchedCurrentUserId, person.id);
          try {
            const messages = await ChatService.fetchMessages(apiUtil, dmRoomId);
            console.log(`[PassengerInfo] Messages for ${dmRoomId}:`, messages?.length);
            
            if (messages && messages.length > 0) {

              const lastRawMessage = messages[messages.length - 1];
              messagesMap[dmRoomId] = processBackendMessage(lastRawMessage);
              

              const lastReadMessageId = await AsyncStorage.getItem(`lastRead_${dmRoomId}`);
              

              let unreadCount = 0;
              let foundLastRead = !lastReadMessageId; //if no last read, all are unread
              
              for (const msg of messages) {
                const rawMsg = msg as any;
                const messageId = rawMsg.id || rawMsg.message_id;
                const senderId = rawMsg.sender_id || rawMsg.senderId || rawMsg.user_id;
                const isFromOther = senderId !== fetchedCurrentUserId;
                

                if (messageId === lastReadMessageId) {
                  foundLastRead = true;
                  continue;
                }
                

                if (foundLastRead && isFromOther) {
                  unreadCount++;
                }
              }
              unreadMap[dmRoomId] = unreadCount;
            } else {
              messagesMap[dmRoomId] = null;
              unreadMap[dmRoomId] = 0;
            }
          } catch (error) {
            console.warn(`Failed to fetch messages for room ${dmRoomId}:`, error);
            messagesMap[dmRoomId] = null;
            unreadMap[dmRoomId] = 0;
          }
        }
        setLastMessages(messagesMap);
        setUnreadCounts(unreadMap);
      } catch (error: any) {
        if (error?.message === "AUTHENTICATION_REDIRECT") return;
        console.error("Failed to fetch passengers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, [apiUtil]);

  // Refetch unread counts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshUnreadCounts = async () => {
        if (!currentUserId || passengers.length === 0) return;
        
        const unreadMap: { [roomId: string]: number } = {};
        const messagesMap: { [roomId: string]: { text: string; timestamp: Date } | null } = {};
        
        for (const person of passengers) {
          const dmRoomId = generateDMRoomId(currentUserId, person.id);
          try {
            const messages = await ChatService.fetchMessages(apiUtil, dmRoomId);
            
            if (messages && messages.length > 0) {
              const lastRawMessage = messages[messages.length - 1];
              messagesMap[dmRoomId] = processBackendMessage(lastRawMessage);
              
              // Get locally stored last read message ID for this room
              const lastReadMessageId = await AsyncStorage.getItem(`lastRead_${dmRoomId}`);
              
              let unreadCount = 0;
              let foundLastRead = !lastReadMessageId;
              
              for (const msg of messages) {
                const rawMsg = msg as any;
                const messageId = rawMsg.id || rawMsg.message_id;
                const senderId = rawMsg.sender_id || rawMsg.senderId || rawMsg.user_id;
                const isFromOther = senderId !== currentUserId;
                
                if (messageId === lastReadMessageId) {
                  foundLastRead = true;
                  continue;
                }
                
                if (foundLastRead && isFromOther) {
                  unreadCount++;
                }
              }
              unreadMap[dmRoomId] = unreadCount;
            } else {
              messagesMap[dmRoomId] = null;
              unreadMap[dmRoomId] = 0;
            }
          } catch (error) {
            console.warn(`Failed to refresh messages for room ${dmRoomId}:`, error);
          }
        }
        setLastMessages(messagesMap);
        setUnreadCounts(unreadMap);
      };

      refreshUnreadCounts();
    }, [currentUserId, passengers, apiUtil])
  );


  const formatMessageTime = (timestamp: Date | string | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };


  const renderChatItem = (user: User, isLast: boolean) => {
    const dmRoomId = generateDMRoomId(currentUserId, user.id);
    
    const lastMessage = lastMessages[dmRoomId];
    const lastMessageText = lastMessage?.text || "Tap here to start chatting";
    const lastMessageTime = lastMessage ? formatMessageTime(lastMessage.timestamp) : '';
    const unreadCount = unreadCounts[dmRoomId] || 0;

    return (
      <TouchableOpacity 
        key={user.id} 
        style={[newStyles.chatItem, !isLast && newStyles.separator]}
        onPress={() => navigation?.navigate('ChatMessages' as never, {
          chatId: dmRoomId,
          chatTitle: user.name,
          chatSubtitle: '',
          isGroupChat: false,
          otherUserId: user.id,
        })}
      >
        <View style={newStyles.chatRow}>
          {/* Left Side: Name and Message */}
          <View style={newStyles.chatContent}>
            <Text style={newStyles.userName}>{user.name}</Text>
            <Text style={[newStyles.lastMessage, !lastMessage && newStyles.placeholderMessage]} numberOfLines={1}>
              {lastMessageText}
            </Text>
          </View>


          <View style={newStyles.chatMeta}>
            <Text style={newStyles.timeText}>{lastMessageTime}</Text>
            {unreadCount > 0 && (
              <View style={newStyles.badge}>
                <Text style={newStyles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={newStyles.container}>
      <StatusBar backgroundColor={THEME.lightGreen} barStyle="dark-content" />
      
      {/* 1. Light Green Header Section */}
      <View style={newStyles.headerContainer}>
        <View style={newStyles.brandHeader}>
          <BrandInfo />
        </View>

        <View style={newStyles.titleRow}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={newStyles.backButton}>
               <Image 
                  source={require('../../assets/arrow_back.png')} 
                  style={{ width: 24, height: 24, tintColor: '#000' }} 
               />
            </TouchableOpacity>
            <Text style={newStyles.pageTitle}>Chat</Text>
        </View>

        {/* 2. Tabs Section */}
        <View style={newStyles.tabContainer}>
          <TouchableOpacity 
            style={[newStyles.tab, activeTab === 'groups' && newStyles.activeTab]}
            onPress={() => {
                setActiveTab('groups');
                navigation?.navigate('TripsListScreen' as never);
            }}
          >
            <Text style={[newStyles.tabText, activeTab === 'groups' ? newStyles.activeTabText : newStyles.inactiveTabText]}>
              Groups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[newStyles.tab, activeTab === 'individuals' && newStyles.activeTab]}
            onPress={() => setActiveTab('individuals')}
          >
            <Text style={[newStyles.tabText, activeTab === 'individuals' ? newStyles.activeTabText : newStyles.inactiveTabText]}>
              Individuals
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Dark Content Section */}
      <View style={newStyles.contentContainer}>
        {loading ? (
          <View style={newStyles.centerContent}>
            <LoadingComponent />
          </View>
        ) : (
          <ScrollView contentContainerStyle={newStyles.scrollContent}>
            {activeTab === 'individuals' && (
                passengers.length === 0 ? (
                    <View style={newStyles.centerContent}>
                    <Text style={newStyles.emptyText}>
                        No individual chats yet.
                    </Text>
                    </View>
                ) : (
                    passengers.map((p, index) => renderChatItem(p, index === passengers.length - 1))
                )
            )}
          </ScrollView>
        )}
        

        <View style={newStyles.illustrationContainer}>
          <Image 
            source={require('../../assets/traffic_light.png')}
            style={newStyles.illustrationImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};


const newStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightGreen,
  },
  headerContainer: {
    backgroundColor: THEME.lightGreen,
    paddingTop: 10,
    paddingBottom: 0,
  },
  brandHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'NunitoSans_700Bold', 
  },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    alignItems: 'flex-end',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  activeTab: {
    backgroundColor: THEME.darkGreen,
  },
  tabText: {
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  activeTabText: {
    color: THEME.lightGreen,
  },
  inactiveTabText: {
    color: '#4A5E4D', 
  },

  contentContainer: {
    flex: 1,
    backgroundColor: THEME.darkGreen,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 150,
    zIndex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: THEME.textGrey,
    fontSize: 16,
  },

  chatItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: THEME.darkGreen,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.separator,
  },
  chatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chatContent: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  lastMessage: {
    color: THEME.textGrey,
    fontSize: 14,
  },
  placeholderMessage: {
    fontStyle: 'italic',
    color: THEME.accent,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: THEME.textGrey,
    fontSize: 12,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: THEME.accent,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },

  illustrationContainer: {
    position: 'absolute',
    bottom: 20,
    right: -10,
    zIndex: 0,
    elevation: 0,
  },
  illustrationImage: {
    width: 250,
    height: 250,
  },
});

export default PassengerInfoScreen;