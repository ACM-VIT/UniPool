import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { tripInfoStyles } from './ChatScreen.styles';
import { TripInfoScreenProps, Ride } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
import LoadingComponent from '../../components/LoadingComponent';
import styles from '../ProfileScreen/ProfileScreen.styles';


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

  return (
    <View style={tripInfoStyles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={tripInfoStyles.chatHeader}>
          <Text style={tripInfoStyles.chatTitle}>Chat</Text>
        </View>

        <View style={tripInfoStyles.toggleContainer}>
          <TouchableOpacity style={tripInfoStyles.toggleButtonActive}>
            <Text style={tripInfoStyles.toggleTextActive}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={tripInfoStyles.toggleButtonInactive}
            onPress={() => navigation?.navigate('PassengerInfoScreen' as never)}
          >
            <Text style={tripInfoStyles.toggleTextInactive}>Passenger</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 200 }}>
            <LoadingComponent />
          </View>
        ) : (
          rides.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingBottom: 200 }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 18, color: AppColors.basicBlack, textAlign: 'center' }}>
                No trips found. When you join or create a ride, your trips will appear here.
              </Text>
            </View>
          ) : (
            <View style={tripInfoStyles.tripsList}>
              {rides.map((ride) => (
                <TouchableOpacity 
                  key={ride.id} 
                  style={tripInfoStyles.tripItem}
                  onPress={() => navigation?.navigate('ChatMessages' as never, {
                    chatId: ride.id,
                    chatTitle: `${ride.start_location} to ${ride.end_location}`,
                    chatSubtitle: new Date(ride.start_time).toDateString(),
                    isGroupChat: true,
                  })}
                >
                  <View style={tripInfoStyles.tripContent}>
                    <View style={tripInfoStyles.tripInfo}>
                      <Text style={tripInfoStyles.tripDestination}>{`${ride.start_location} to ${ride.end_location}`}</Text>
                      <Text style={tripInfoStyles.tripDate}>{new Date(ride.start_time).toDateString()}</Text>
                    </View>
                    <View style={tripInfoStyles.tripDetails}>
                      <View style={tripInfoStyles.priceContainer}>
                        <Image
                          source={require('../../assets/wallet.png')}
                          style={{ width: 16, height: 16, marginRight: 4, resizeMode: 'contain' }}
                        />
                        <Text style={tripInfoStyles.tripPrice}>{`₹${ride.total_price}`}</Text>
                      </View>
                      <Text style={tripInfoStyles.tripParticipants}>{`${ride.booked_seats} of ${ride.total_seats} seats`}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

export default TripsListScreen;