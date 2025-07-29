import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MapPin, MessageCircle, Home, Calendar, Folder, User } from 'lucide-react-native';
import { passengerInfoStyles } from './ChatScreen.styles';
import { PassengerInfoScreenProps, PassengerDestination } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';

const PassengerInfoScreen: React.FC<PassengerInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  // Hide navbar when this screen mounts
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
      
      {/* Header */}
      <View style={passengerInfoStyles.header}>
        <View style={passengerInfoStyles.headerLeft}>
          <MapPin size={20} color="#FF5722" />
          <Text style={passengerInfoStyles.instituteName}>Vellore Institute of Technology</Text>
        </View>
        <Text style={passengerInfoStyles.appName}>UniPool</Text>
      </View>

      {/* Chat Title */}
      <View style={passengerInfoStyles.chatHeader}>
        <MessageCircle size={24} color="#333" />
        <Text style={passengerInfoStyles.chatTitle}>Chat</Text>
      </View>

      {/* Toggle Buttons */}
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

      {/* Destinations List */}
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

      {/* Bottom Navigation */}
    </SafeAreaView>
  );
};

export default PassengerInfoScreen;