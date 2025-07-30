import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { tripInfoStyles } from './ChatScreen.styles';
import { TripInfoScreenProps, Ride } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';


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
    <SafeAreaView style={tripInfoStyles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <BrandInfo />
      </View>

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
        <ActivityIndicator size="large" color={AppColors.primaryLightGreen} />
      ) : (
        rides.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 18, color: AppColors.basicBlack, textAlign: 'center' }}>
              No trips found. When you join or create a ride, your trips will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView style={tripInfoStyles.tripsList}>
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
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
};

export default TripsListScreen;