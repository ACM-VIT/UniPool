import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TripInfoScreenProps, Ride } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
import ChatService from '../../utils/ChatService';
import LoadingComponent from '../../components/LoadingComponent';


const THEME = {
  lightGreen: '#C5E063',
  darkGreen: '#263B33',  
  textWhite: '#FFFFFF',
  textGreen: '#C5E063',  
  divider: '#2C443F'
};

const TripsListScreen: React.FC<TripInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [unreadCounts, setUnreadCounts] = useState<{ [rideId: string]: number }>({});
  const { apiUtil } = useApi();

  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const fetchedRides = await RideService.getInvolvedRides(apiUtil);
        setRides(fetchedRides);
        
        const currentUserResponse = await apiUtil.get<{user: {id: string}}>("/user/details");
        const fetchedCurrentUserId = currentUserResponse.user.id;
        setCurrentUserId(fetchedCurrentUserId);
        
        const unreadMap: { [rideId: string]: number } = {};
        
        for (const ride of fetchedRides) {
          try {
            const messages = await ChatService.fetchMessages(apiUtil, ride.id);
            
            if (messages && messages.length > 0) {

              const lastReadMessageId = await AsyncStorage.getItem(`lastRead_${ride.id}`);
              
              let unreadCount = 0;
              let foundLastRead = !lastReadMessageId;
              
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
              unreadMap[ride.id] = unreadCount;
            } else {
              unreadMap[ride.id] = 0;
            }
          } catch (error) {
            console.warn(`Failed to fetch messages for ride ${ride.id}:`, error);
            unreadMap[ride.id] = 0;
          }
        }
        setUnreadCounts(unreadMap);
      } catch (error) {
        console.error("Failed to fetch rides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [apiUtil]);

  // Refetch unread counts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshUnreadCounts = async () => {
        if (!currentUserId || rides.length === 0) return;
        
        const unreadMap: { [rideId: string]: number } = {};
        
        for (const ride of rides) {
          try {
            const messages = await ChatService.fetchMessages(apiUtil, ride.id);
            
            if (messages && messages.length > 0) {
              const lastReadMessageId = await AsyncStorage.getItem(`lastRead_${ride.id}`);
              
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
              unreadMap[ride.id] = unreadCount;
            } else {
              unreadMap[ride.id] = 0;
            }
          } catch (error) {
            console.warn(`Failed to refresh messages for ride ${ride.id}:`, error);
          }
        }
        setUnreadCounts(unreadMap);
      };

      refreshUnreadCounts();
    }, [currentUserId, rides, apiUtil])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${dayName} | ${day} ${month} ${year}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={localStyles.container}>
      <StatusBar backgroundColor={THEME.lightGreen} barStyle="dark-content" />
      

      <View style={localStyles.headerContainer}>

        <View style={localStyles.brandHeader}>
           <BrandInfo /> 
        </View>

        <View style={localStyles.titleRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={localStyles.backButton}>
           
             <Image 
                source={require('../../assets/arrow_back.png')} 
                style={{ width: 24, height: 24, tintColor: '#000' }} 
             />
          </TouchableOpacity>
          <Text style={localStyles.screenTitle}>Chat</Text>
        </View>

        {/* Custom Tabs */}
        <View style={localStyles.tabContainer}>
          <TouchableOpacity style={localStyles.activeTab}>
            <Text style={localStyles.activeTabText}>Groups</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={localStyles.inactiveTab}
            onPress={() => navigation?.navigate('PassengerInfoScreen' as never)}
          >
            <Text style={localStyles.inactiveTabText}>Individuals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY SECTION (Dark Green) */}
      <View style={localStyles.bodyContainer}>
        {loading ? (
          <View style={localStyles.centerContent}>
            <LoadingComponent />
          </View>
        ) : rides.length === 0 ? (
          <View style={localStyles.centerContent}>
            <Text style={localStyles.emptyText}>
              No trips found.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={localStyles.scrollContent}>
            {rides.map((ride, index) => (
              <TouchableOpacity 
                key={ride.id} 
                style={localStyles.listItem}
                onPress={() => navigation?.navigate('ChatMessages' as never, {
                  chatId: ride.id,
                  chatTitle: `${ride.start_location} to ${ride.end_location}`,
                  chatSubtitle: new Date(ride.start_time).toDateString(),
                  isGroupChat: true,
                })}
              >
                {/* Top Row: Title & Time */}
                <View style={localStyles.itemTopRow}>
                  <Text style={localStyles.itemTitle} numberOfLines={1}>
                    {`${ride.start_location} to ${ride.end_location}`}
                  </Text>
                  <Text style={localStyles.itemTime}>
                    {formatTime(ride.start_time)}
                  </Text>
                </View>

                {/* Bottom Row: Details & Badge */}
                <View style={localStyles.itemBottomRow}>
                  <View style={localStyles.detailsContainer}>
                    <Text style={localStyles.detailText}>
                      {formatDate(ride.start_time)}
                    </Text>
                    <Text style={localStyles.separator}>|</Text>
                    <Text style={localStyles.detailText}>
                      {`₹ ${ride.total_price}`}
                    </Text>
                    <Text style={localStyles.separator}>|</Text>
                    {/* Icon for people */}
                    <Image 
                      source={require('../../assets/user_group.png')} 
                      style={localStyles.smallIcon}
                    />
                    <Text style={localStyles.detailText}>
                       {ride.total_seats}
                    </Text>
                  </View>
                  
                  {unreadCounts[ride.id] > 0 && (
                    <View style={localStyles.badge}>
                      <Text style={localStyles.badgeText}>{unreadCounts[ride.id]}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={localStyles.illustrationContainer}>
           <Image 
              source={require('../../assets/traffic_bird.png')}
              style={localStyles.illustrationImage}
              resizeMode="contain"
           />
        </View>
      </View>
    </View>
  );
};


const localStyles = StyleSheet.create({
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
    //borderWidth: 1,
    //borderColor: '#333',
    //borderRadius: 8, /
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'NunitoSans_700Bold', 
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
  },
  activeTab: {
    backgroundColor: THEME.darkGreen,
    paddingVertical: 10,
    //paddingHorizontal: 30,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 20,
    width: '50%',
    alignItems: 'center',
  },
  inactiveTab: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    alignItems: 'center',
    width: '50%',
  },
  activeTabText: {
    color: THEME.lightGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  inactiveTabText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  

  bodyContainer: {
    flex: 1,
    backgroundColor: THEME.darkGreen, 
    position: 'relative',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#889995',
    fontSize: 16,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 150, 
    zIndex: 1,
  },
  listItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    color: THEME.textWhite,
    fontSize: 18,
    fontWeight: '500',
    maxWidth: '80%',
  },
  itemTime: {
    color: '#AAA',
    fontSize: 12,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: THEME.textGreen,
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    color: THEME.textGreen,
    marginHorizontal: 8,
  },
  smallIcon: {
    width: 14,
    height: 14,
    tintColor: THEME.textGreen,
    marginRight: 4,
    resizeMode: 'contain',
  },
  badge: {
    backgroundColor: THEME.lightGreen,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: THEME.darkGreen,
    fontSize: 12,
    fontWeight: 'bold',
  },

  illustrationContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 0,
    elevation: 0,
  },
  illustrationImage: {
    width: 250,
    height: 250,
  }
});

export default TripsListScreen;