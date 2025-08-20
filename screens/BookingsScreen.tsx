import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity, StyleSheet } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import RideCard from '../components/RideCard';
import AppColors from '../design_systems/colors';
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

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{
          width: '100%',
          maxWidth: 680,
          backgroundColor: styles.menuContainer.backgroundColor,
          borderRadius: 12,
          padding: 28,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}>
          <LoadingComponent />
        </View>
      </View>
    </View>
  );

  const renderBooking: ListRenderItem<Booking> = ({ item }) => {
    const details = item.ride_details || item.ride || {};
    const origin = details.start_location || 'Unknown';
    const destination = details.end_location || 'Unknown';
    const timeRaw = details.start_time || '';
    const price = details.total_price !== undefined ? Number(details.total_price) : undefined;
    const seatsAvailable = details.booked_seats !== undefined && details.total_seats !== undefined ? `${details.booked_seats}/${details.total_seats}` : (details.seatsAvailable || '0/0');

    // Try several common fields to find a ride id. Avoid passing 'undefined'.
    const rideId = item.ride_id || item.ride?.ride_id || item.ride?.id || item.ride_details?.ride_id || item.ride_details?.id || undefined;

    return (
      <RideCard
        id={rideId ? String(rideId) : String(item.id || '')}
        origin={origin}
        destination={destination}
        time={typeof timeRaw === 'string' ? timeRaw : (timeRaw ? new Date(timeRaw).toLocaleTimeString() : '')}
        price={price}
        seatsAvailable={seatsAvailable}
        totalSeats={details.total_seats}
        onSelect={(id: string) => {
          // Only navigate to ride details if we have a valid ride id
          if (rideId) {
            try {
              // RideDetailsScreen expects a param named `rideId` (not an object `ride`)
              (navigation as any).navigate('RideDetailsScreen', { rideId: String(rideId) });
            } catch (e) {
              console.warn('Navigation to RideDetailsScreen failed', e);
            }
          } else {
            console.warn('No ride id available for this booking; cannot navigate to ride details', item);
          }
        }}
        variant={item.type === 'hosted' ? 'upcoming' : 'upcoming'}
        date={details.start_time ? String(details.start_time) : ''}
      />
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
            padding: 24,
            backgroundColor: styles.menuContainer.backgroundColor,
            borderRadius: styles.menuContainer.borderRadius,
            borderWidth: 0,
            borderColor: 'transparent',
          }}>
            <Text style={{ fontSize: 18, color: styles.headerTitle.color, textAlign: 'center', marginBottom: 8, fontWeight: '600', fontFamily: 'NunitoSans_600SemiBold' }}>
              You have no bookings or rides yet.
            </Text>
            <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 14, fontFamily: 'NunitoSans_400Regular' }}>
              Book a ride or create one to see your activity here!
            </Text>

            <TouchableOpacity
              onPress={() => {
                try {
                  (navigation as any).navigate('CreateRide');
                } catch (e) {
                  console.warn('Navigation to CreateRide failed', e);
                }
              }}
              style={{
                backgroundColor: AppColors.secondaryDarkGreen,
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: AppColors.basicWhite, fontFamily: 'NunitoSans_600SemiBold' }}>Create a ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.menuContainer, { borderColor: 'transparent', borderWidth: 0 }]}> 
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
