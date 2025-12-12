import React, { useEffect, useState } from 'react';
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

import { TripInfoScreenProps, Ride } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
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
      } catch (error) {
        console.error("Failed to fetch rides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [apiUtil]);

  // Helper to format date like "Fri | 3 Jun 2024"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${dayName} | ${day} ${month} ${year}`;
  };

  // Helper to format time like "8:10 AM"
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={localStyles.container}>
      <StatusBar backgroundColor={THEME.lightGreen} barStyle="dark-content" />
      
      {/* HEADER SECTION (Light Green) */}
      <View style={localStyles.headerContainer}>
        {/* Brand Header */}
        <View style={localStyles.brandHeader}>
           {/* Assuming BrandInfo contains the Location and UniPool text */}
           {/* If BrandInfo has its own background, ensure it is transparent or matches lightGreen */}
           <BrandInfo /> 
        </View>

        {/* Chat Title with Back Arrow */}
        <View style={localStyles.titleRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={localStyles.backButton}>
             {/* Replace this Image with an Icon component if you have one installed */}
             <Image 
                source={require('../../assets/arrow_back.png')} // Ensure you have a back arrow asset
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
                      source={require('../../assets/user_group.png')} // Need a user icon asset
                      style={localStyles.smallIcon}
                    />
                    <Text style={localStyles.detailText}>
                       {ride.total_seats}
                    </Text>
                  </View>
                  
                  {/* Notification Badge (Example logic: show if index is 0) */}
                  {index === 0 && (
                    <View style={localStyles.badge}>
                      <Text style={localStyles.badgeText}>4</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Illustration at bottom right (Bird on Traffic Light) */}
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

// Styles to match the image
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightGreen, // Top half background
  },
  headerContainer: {
    backgroundColor: THEME.lightGreen,
    paddingTop: 10,
    paddingBottom: 0, // Tabs sit on the bottom
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
  
  // Body Section
  bodyContainer: {
    flex: 1,
    backgroundColor: THEME.darkGreen, // The dark background
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
    paddingBottom: 150, // Space for illustration
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