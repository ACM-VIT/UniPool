import React, { useEffect, useState } from 'react';
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

import { PassengerInfoScreenProps, User } from './ChatScreen.types';
import BrandInfo from '../../components/BrandInfo';
import LoadingComponent from '../../components/LoadingComponent';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
import styles from '../ProfileScreen/ProfileScreen.styles';


const THEME = {
  lightGreen: '#C1D95E', 
  darkGreen: '#1F3329',  
  textWhite: '#FFFFFF',
  textGrey: '#8C9E96',
  separator: '#2C3E36',
  accent: '#C1D95E',     // Badge color
  black: '#000000'
};

const PassengerInfoScreen: React.FC<PassengerInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  const [passengers, setPassengers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // State to handle tab switching (Groups vs Individuals)
  const [activeTab, setActiveTab] = useState<'groups' | 'individuals'>('individuals');

  const { apiUtil } = useApi();

  const generateDMRoomId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
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
      } catch (error: any) {
        if (error?.message === "AUTHENTICATION_REDIRECT") return;
        console.error("Failed to fetch passengers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, [apiUtil]);

  // Helper to render a list item
  const renderChatItem = (user: User, isLast: boolean) => {
    const dmRoomId = generateDMRoomId(currentUserId, user.id);
    
    // Placeholder data to match the design (Time/Unread)
    // In a real app, these would come from your Chat Service
    const lastMessageTime = "8:10 AM"; 
    const unreadCount = 0; // Set to > 0 to see the badge
    const lastMessageText = "lorem ipsum dolor intem quany ui";

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
            <Text style={newStyles.lastMessage} numberOfLines={1}>
              {lastMessageText}
            </Text>
          </View>

          {/* Right Side: Time and Badge */}
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
        <View style={styles.brandInfoHeaderRow}>
          <BrandInfo />
        </View>

        <View style={newStyles.titleRow}>
            {/* Back Arrow Placeholder */}
            <TouchableOpacity onPress={() => navigation?.goBack()} style={newStyles.backButton}>
                {/* Use an Icon component here if you have one, e.g., IonIcons name="arrow-back" */}
                <Text style={{fontSize: 24, fontWeight: '300'}}>←</Text> 
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
        
        {/* Illustration at bottom right (Bird on Traffic Light) */}
        <View style={newStyles.illustrationContainer}>
          <Image 
            source={require('../../assets/traffic_bird.png')}
            style={newStyles.illustrationImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

// New Styles to match the design provided
const newStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightGreen,
  },
  headerContainer: {
    backgroundColor: THEME.lightGreen,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: THEME.black,
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'NunitoSans_600SemiBold', // Adjust font family as needed
    color: THEME.black,
  },
  // Tab Styles
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
    color: '#4A5E4D', // Darker green for inactive text on light background
  },
  // Content Styles
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
  // Chat Item Styles
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
//chekc once
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
  },
});

export default PassengerInfoScreen;