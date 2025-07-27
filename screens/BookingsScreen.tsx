import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';

interface Booking {
  id: string;
  rideDetails: string;
  [key: string]: any;
}

interface BookingsResponse {
  bookings: Booking[];
}

const BookingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiUtil.get<BookingsResponse>('/booking/list')
      .then((data) => {
        console.log('Bookings API response:', data);
        setBookings(data.bookings);
      })
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={styles.headerTitle.color} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    </View>
  );
  if (error) return (
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

  const renderBooking: ListRenderItem<Booking> = ({ item }) => (
    <View style={styles.menuItem}>
      <Text style={styles.menuItemText}>{item.rideDetails || 'No details available'}</Text>
    </View>
  );

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
        {Array.isArray(bookings) && bookings.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 12 }}>
              You have no bookings yet.
            </Text>
            <Text style={{ fontSize: 14, color: '#aaa', textAlign: 'center' }}>
              Book a ride or join one to see your bookings here!
            </Text>
          </View>
        ) : Array.isArray(bookings) ? (
          <View style={styles.menuContainer}>
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              renderItem={renderBooking}
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 12 }}>
              Unable to load bookings.
            </Text>
            <Text style={{ fontSize: 14, color: '#aaa', textAlign: 'center' }}>
              Please try again later.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default BookingsScreen;
