import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';

interface Passenger {
  id: string;
  name: string;
  [key: string]: any;
}

const PassengersHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiUtil.get<Passenger[]>("/user/passengers")
      .then((data: Passenger[]) => {
        setPassengers(data ?? []);
        setError(null);
      })
      .catch((err) => {
        console.log('Error fetching passengers:', err);
        setError(err?.message || 'Failed to load passengers');
      })
      .finally(() => setLoading(false));
  }, [apiUtil]);

  if (loading) return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => { if (typeof navigation !== 'undefined') navigation.goBack(); }}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passengers History</Text>
        </View>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={styles.headerTitle.color} />
        <Text style={styles.loadingText}>Loading passengers...</Text>
      </View>
    </View>
  );
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if (typeof navigation !== 'undefined') navigation.goBack(); }}>
              <ChevronBack />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Passengers History</Text>
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

  const renderPassenger: ListRenderItem<Passenger> = ({ item }) => (
    <View style={styles.menuItem}>
      <Text style={styles.menuItemText}>{item.name || 'No name available'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => { if (typeof navigation !== 'undefined') navigation.goBack(); }}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passengers History</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.menuContainer}>
          {passengers.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Text style={{ fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 12 }}>
                You haven't travelled with any passengers yet.
              </Text>
              <Text style={{ fontSize: 14, color: '#aaa', textAlign: 'center' }}>
                Book a ride or join one to see passengers here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={passengers}
              keyExtractor={(item) => item.id}
              renderItem={renderPassenger}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default PassengersHistoryScreen;
