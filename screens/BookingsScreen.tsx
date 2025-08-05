import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';
import LoadingComponent from '../components/LoadingComponent';

interface Booking {
  id: string;
  ride_id?: string;
  ride_details: {
    start_location?: string;
    end_location?: string;
    start_time?: string;
    [key: string]: any;
  };
  type?: 'booking' | 'hosted';
  [key: string]: any;
}

interface BookingsResponse {
  bookings: Booking[];
}

interface HostedRide {
  id?: string;
  ride_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
  [key: string]: any;
}

const BookingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dedupedBookings = React.useMemo(() => {
    const seen = new Set();
    return bookings.filter(b => {
      const id = b.ride_id || b.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [bookings]);

  // Function to fetch both bookings and hosted rides
  const fetchAllUserRides = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = require('@react-native-firebase/auth').getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError("Please sign in to view your bookings");
        return;
      }

      console.log('Fetching bookings and hosted rides...');
      
      const [bookingsResponse, hostedRidesResponse] = await Promise.allSettled([
        apiUtil.get<BookingsResponse>('/booking/list'),
        apiUtil.get<HostedRide[]>('/user/rides')
      ]);

      const allRides: Booking[] = [];

      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value?.bookings) {
        const passengerBookings = bookingsResponse.value.bookings.map(booking => ({
          ...booking,
          type: 'booking' as const
        }));
        allRides.push(...passengerBookings);
        console.log(`Found ${passengerBookings.length} passenger bookings`);
      } else {
        console.log('No passenger bookings or failed to fetch:', bookingsResponse);
      }

      if (hostedRidesResponse.status === 'fulfilled' && Array.isArray(hostedRidesResponse.value)) {
        const hostedRides = hostedRidesResponse.value
          .filter(ride => ride.is_user_host !== false) // Only include rides where user is host
          .map(ride => ({
            id: ride.ride_id || ride.id || `hosted-${Math.random()}`,
            ride_id: ride.ride_id || ride.id,
            ride_details: {
              start_location: ride.start_location,
              end_location: ride.end_location,
              start_time: ride.start_time,
              total_seats: ride.total_seats,
              booked_seats: ride.booked_seats,
              total_price: ride.total_price,
            },
            type: 'hosted' as const,
            ...ride
          }));
        allRides.push(...hostedRides);
        console.log(`Found ${hostedRides.length} hosted rides`);
      } else {
        console.log('No hosted rides or failed to fetch:', hostedRidesResponse);
      }

      console.log(`Total rides found: ${allRides.length}`);
      setBookings(allRides);

    } catch (error: any) {
      console.error('Error fetching user rides:', error);
      if (error.message === "AUTHENTICATION_REDIRECT") {
        console.log('Authentication redirect in BookingsScreen - not showing error');
        return;
      }
      setError('Failed to load bookings and rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUserRides();
  }, [apiUtil]);

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
      </View>
      <LoadingComponent />
    </View>
  );

  const renderBooking: ListRenderItem<Booking> = ({ item }) => {
    const details = item.ride_details;
    let summary = 'No details available';
    let roleIndicator = '';
    
    if (item.type === 'hosted') {
      roleIndicator = '🚗 Hosting: ';
    } else if (item.type === 'booking') {
      roleIndicator = '🎫 Booked: ';
    }
    
    if (details) {
      const origin = details.start_location || '';
      const destination = details.end_location || '';
      const time = details.start_time ? new Date(details.start_time).toLocaleString() : '';
      if (origin && destination && time) {
        summary = `${roleIndicator}From ${origin} to ${destination} at ${time}`;
      } else if (origin && destination) {
        summary = `${roleIndicator}From ${origin} to ${destination}`;
      } else {
        summary = roleIndicator + JSON.stringify(details);
      }
    }
    
    return (
      <View style={styles.menuItem}>
        <Text style={styles.menuItemText}>{summary}</Text>
        {/* {item.type === 'hosted' && details.total_seats && details.booked_seats !== undefined && (
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4, fontFamily: 'NunitoSans_400Regular' }}>
            {details.booked_seats}/{details.total_seats} seats booked
          </Text>
        )} */}
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ChevronBack />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Bookings</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 12, fontSize: 14 }}>
            Please check your connection or try again later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
      </View>
      <View style={styles.newSection}>
        {dedupedBookings.length === 0 ? (
          <View style={{
            minHeight: 120,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
            backgroundColor: styles.menuContainer.backgroundColor,
            borderRadius: styles.menuContainer.borderRadius,
          }}>
            <Text style={{ fontSize: 18, color: styles.headerTitle.color, textAlign: 'center', marginBottom: 12, fontWeight: '600', fontFamily: 'NunitoSans_600SemiBold' }}>
              You have no bookings or rides yet.
            </Text>
            <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', fontFamily: 'NunitoSans_400Regular' }}>
              Book a ride or create one to see your activity here!
            </Text>
          </View>
        ) : (
          <View style={styles.menuContainer}>
            <FlatList
              data={dedupedBookings}
              keyExtractor={(item) => item.id}
              renderItem={renderBooking}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default BookingsScreen;
