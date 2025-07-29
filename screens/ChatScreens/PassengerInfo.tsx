import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { passengerInfoStyles } from './ChatScreen.styles';
import { PassengerInfoScreenProps, PassengerDestination } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';
import BrandInfo from '../../components/BrandInfo';

const PassengerInfoScreen: React.FC<PassengerInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);

  const destinations: PassengerDestination[] = [
    { id: '1', name: 'Bhallaldeva' },
    { id: '2', name: 'Kattapa' },
    { id: '3', name: 'Sivagami' },
    { id: '4', name: 'Bijjaladeva' },
    { id: '5', name: 'Devasena' },
    { id: '6', name: 'Devasena' },
    { id: '7', name: 'Devasena' },
  ];

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

      <View style={passengerInfoStyles.destinationsList}>
        {destinations.map((destination) => (
          <TouchableOpacity 
            key={destination.id} 
            style={passengerInfoStyles.destinationItem}
            onPress={() => navigation?.navigate('ChatConversationScreen' as never, {
              chatId: destination.id,
              chatTitle: `Chat with ${destination.name}`,
              chatSubtitle: `Destination: ${destination.name}`,
              messages: []
            })}
          >
            <Text style={passengerInfoStyles.destinationText}>{destination.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default PassengerInfoScreen;