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
  ride_details: {
    start_location?: string;
    end_location?: string;
    start_time?: string;
    [key: string]: any;
  };
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

  const dedupedBookings = React.useMemo(() => {
    const seen = new Set();
    return bookings.filter(b => {
      if (seen.has(b.ride_id)) return false;
      seen.add(b.ride_id);
      return true;
    });
  }, [bookings]);

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
      <View style={styles.newSection}>
        <LoadingComponent />
      </View>
    </View>
  );

  const renderBooking: ListRenderItem<Booking> = ({ item }) => {
    const details = item.ride_details;
    let summary = 'No details available';
    if (details) {
      const origin = details.start_location || '';
      const destination = details.end_location || '';
      const time = details.start_time ? new Date(details.start_time).toLocaleString() : '';
      if (origin && destination && time) {
        summary = `From ${origin} to ${destination} at ${time}`;
      } else if (origin && destination) {
        summary = `From ${origin} to ${destination}`;
      } else {
        summary = JSON.stringify(details);
      }
    }
    return (
      <View style={styles.menuItem}>
        <Text style={styles.menuItemText}>{summary}</Text>
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
              You have no bookings yet.
            </Text>
            <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', fontFamily: 'NunitoSans_400Regular' }}>
              Book a ride to see your bookings here!
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
