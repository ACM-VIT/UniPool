import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MapPin, MessageCircle, Home, Calendar, Folder, User, Wallet } from 'lucide-react-native';
import { tripInfoStyles } from './ChatScreen.styles';
import { TripInfoScreenProps, Trip } from './ChatScreen.types';
import AppColors from '../../design_systems/colors';

const TripsListScreen: React.FC<TripInfoScreenProps> = ({ navigation, route, setNavBarVariant }) => {
  // Hide navbar when this screen mounts
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
      
      {/* Header */}
      <View style={tripInfoStyles.header}>
        <View style={tripInfoStyles.headerLeft}>
          <MapPin size={20} color="#FF5722" />
          <Text style={tripInfoStyles.instituteName}>Vellore Institute of Technology</Text>
        </View>
        <Text style={tripInfoStyles.appName}>UniPool</Text>
      </View>

      {/* Chat Title */}
      <View style={tripInfoStyles.chatHeader}>
        <MessageCircle size={24} color="#333" />
        <Text style={tripInfoStyles.chatTitle}>Chat</Text>
      </View>

      {/* Toggle Buttons */}
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

      {/* Trips List */}
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
                  <Wallet size={16} color={AppColors.basicBlack} />
                  <Text style={tripInfoStyles.tripPrice}>{trip.price}</Text>
                </View>
                <Text style={tripInfoStyles.tripParticipants}>{trip.participants}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={tripInfoStyles.bottomNav}>
        <TouchableOpacity style={tripInfoStyles.navItem}>
          <Home size={24} color="#8BC34A" />
        </TouchableOpacity>
        <TouchableOpacity style={tripInfoStyles.navItem}>
          <Calendar size={24} color="#8BC34A" />
        </TouchableOpacity>
        <TouchableOpacity style={tripInfoStyles.navItem}>
          <Folder size={24} color="#8BC34A" />
        </TouchableOpacity>
        <TouchableOpacity style={tripInfoStyles.navItem}>
          <User size={24} color="#8BC34A" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TripsListScreen;
