import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from "expo-router";
import { passengerInfoStyles } from './ChatScreen.styles';
import { PassengerInfoScreenProps, User } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';
import LoadingComponent from '../../components/LoadingComponent';
import { useApi } from '../../utils/ApiUtil';
import RideService from '../../utils/RideService';
import styles from '../ProfileScreen/ProfileScreen.styles';
import { appHref } from "../../navigation/routes";

const PassengerInfoScreen: React.FC<Pick<PassengerInfoScreenProps, "setNavBarVariant">> = ({ setNavBarVariant }) => {
  const router = useRouter();
  const [passengers, setPassengers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
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
        if (error?.message === "AUTHENTICATION_REDIRECT") {
          console.log("Authentication redirect in PassengerInfo");
          return;
        }
        
        // Handle user not found - should redirect to signup (handled by ApiUtil)
        if (error?.response?.status === 404 && 
            error?.response?.data?.message === "User not found in database, signup required") {
          console.log("User not found in database - redirect to signup handled by ApiUtil");
          return;
        }
        
        console.error("Failed to fetch passengers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, [apiUtil]);

  return (
    <View style={passengerInfoStyles.container}>
      <StatusBar backgroundColor={AppColors.primaryLightGreen} barStyle="dark-content" />
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={passengerInfoStyles.chatHeader}>
          <Text style={passengerInfoStyles.chatTitle}>Chat</Text>
        </View>

        <View style={passengerInfoStyles.toggleContainer}>
          <TouchableOpacity 
            style={passengerInfoStyles.toggleButtonInactive}
            onPress={() => router.navigate(appHref("TripsListScreen"))}
          >
            <Text style={passengerInfoStyles.toggleTextInactive}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={passengerInfoStyles.toggleButtonActive}>
            <Text style={passengerInfoStyles.toggleTextActive}>Passenger</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 200 }}>
            <LoadingComponent />
          </View>
        ) : (
          passengers.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 180 }}>
              <Image
                source={require('../../assets/happy-emoji.png')}
                style={{ width: 96, height: 96, marginBottom: 20 }}
                resizeMode="contain"
              />
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 20, color: AppColors.secondaryDarkGreen, textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 }}>
                No co-riders yet
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 15, lineHeight: 22, color: AppColors.secondaryDarkGreen, opacity: 0.65, textAlign: 'center' }}>
                When you share a ride, the people you've travelled with show up here for direct messages.
              </Text>
            </View>
          ) : (
            <View style={passengerInfoStyles.destinationsList}>
              {passengers.map((passenger) => {
                const dmRoomId = generateDMRoomId(currentUserId, passenger.id);
                return (
                  <TouchableOpacity 
                    key={passenger.id} 
                    style={passengerInfoStyles.destinationItem}
                    onPress={() => router.navigate(appHref("ChatMessages", {
                      chatId: dmRoomId,
                      chatTitle: `Chat with ${passenger.name}`,
                      chatSubtitle: ``,
                      isGroupChat: false,
                      otherUserId: passenger.id,
                    }))}
                  >
                    <Text style={passengerInfoStyles.destinationText}>{passenger.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

export default PassengerInfoScreen;
