import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { passengerInfoStyles } from './ChatScreen.styles';
import { PassengerInfoScreenProps, User } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';

const PassengerInfoScreen: React.FC<PassengerInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  const [passengers, setPassengers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { apiUtil } = useApi();

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
        const currentUserId = currentUserResponse.user.id;
        
        const allPeople: User[] = [];
        const uniquePeopleMap = new Map<string, User>();
        
        for (const ride of involvedRides) {
          try {
            const rideDetails = await apiUtil.get<{
              host: {
                id: string;
                name: string;
                email: string;
                profile_picture_url: string;
              };
              bookings: Array<{
                passenger_id: string;
                passenger_name: string;
                passenger_email: string;
                passenger_profile_picture_url: string;
                request_status: string;
              }>;
            }>(`/ride/details/${ride.id}`);
            
            if (rideDetails.host.id !== currentUserId) {
              uniquePeopleMap.set(rideDetails.host.id, {
                id: rideDetails.host.id,
                name: rideDetails.host.name,
                email: rideDetails.host.email,
              });
            }
            
            rideDetails.bookings
              .filter(booking => booking.request_status === 'accepted' && booking.passenger_id !== currentUserId)
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
      } catch (error) {
        console.error("Failed to fetch passengers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, [apiUtil]);

  return (
    <SafeAreaView style={passengerInfoStyles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
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

        <View style={passengerInfoStyles.chatHeader}>
          <Text style={passengerInfoStyles.chatTitle}>Chat</Text>
        </View>

        <View style={passengerInfoStyles.toggleContainer}>
          <TouchableOpacity 
            style={passengerInfoStyles.toggleButtonInactive}
            onPress={() => navigation?.navigate('TripsListScreen' as never)}
          >
            <Text style={passengerInfoStyles.toggleTextInactive}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={passengerInfoStyles.toggleButtonActive}>
            <Text style={passengerInfoStyles.toggleTextActive}>Passenger</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={AppColors.primaryLightGreen} style={{ marginTop: 32 }} />
        ) : (
          passengers.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 18, color: AppColors.basicBlack, textAlign: 'center' }}>
                No passengers found. When you join a ride as a passenger, they will appear here.
              </Text>
            </View>
          ) : (
            <View style={passengerInfoStyles.destinationsList}>
              {passengers.map((passenger) => (
                <TouchableOpacity 
                  key={passenger.id} 
                  style={passengerInfoStyles.destinationItem}
                  onPress={() => navigation?.navigate('ChatMessages' as never, {
                    chatId: passenger.id,
                    chatTitle: `Chat with ${passenger.name}`,
                    chatSubtitle: ``,
                    isGroupChat: false,
                  })}
                >
                  <Text style={passengerInfoStyles.destinationText}>{passenger.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PassengerInfoScreen;