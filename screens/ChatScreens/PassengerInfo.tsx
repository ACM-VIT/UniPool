import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
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
        const fetchedPassengers = await RideService.getAllPassengers(apiUtil);
        setPassengers(fetchedPassengers);
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
        <ActivityIndicator size="large" color={AppColors.primaryLightGreen} />
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
      )}
    </SafeAreaView>
  );
};

export default PassengerInfoScreen;