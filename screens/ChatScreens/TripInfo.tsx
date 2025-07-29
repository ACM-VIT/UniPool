import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { tripInfoStyles } from './ChatScreen.styles';
import { TripInfoScreenProps, Trip } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';

const TripsListScreen: React.FC<TripInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);
  
  const trips: Trip[] = [
    {
      id: 1,
      destination: 'Vellore to Chennai',
      date: 'Fri 3 Jun 2024',
      price: '₹500',
      participants: 'You and 3 more',
    },
    {
      id: 2,
      destination: 'Vellore to Chennai',
      date: 'Fri 3 Jun 2024',
      price: '₹500',
      participants: 'You and 3 more',
    },
    {
      id: 3,
      destination: 'Vellore to Chennai',
      date: 'Fri 3 Jun 2024',
      price: '₹500',
      participants: 'You and 3 more',
    },
    {
      id: 4,
      destination: 'Vellore to Chennai',
      date: 'Fri 3 Jun 2024',
      price: '₹500',
      participants: 'You and 3 more',
    },
    {
      id: 5,
      destination: 'Vellore to Chennai',
      date: 'Fri 3 Jun 2024',
      price: '₹500',
      participants: 'You and 3 more',
    },
  ];

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

      <ScrollView style={tripInfoStyles.tripsList}>
        {trips.map((trip) => (
          <TouchableOpacity 
            key={trip.id} 
            style={tripInfoStyles.tripItem}
            onPress={() => navigation?.navigate('ChatConversationScreen' as never, {
              chatRoom: {
                id: trip.id.toString(),
                title: trip.destination,
                subtitle: `${trip.participants} - ${trip.date}`,
              }
            })}
          >
            <View style={tripInfoStyles.tripContent}>
              <View style={tripInfoStyles.tripInfo}>
                <Text style={tripInfoStyles.tripDestination}>{trip.destination}</Text>
                <Text style={tripInfoStyles.tripDate}>{trip.date}</Text>
              </View>
              <View style={tripInfoStyles.tripDetails}>
                <View style={tripInfoStyles.priceContainer}>
                  <Image
                    source={require('../../assets/wallet.png')}
                    style={{ width: 16, height: 16, marginRight: 4, resizeMode: 'contain' }}
                  />
                  <Text style={tripInfoStyles.tripPrice}>{trip.price}</Text>
                </View>
                <Text style={tripInfoStyles.tripParticipants}>{trip.participants}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TripsListScreen;