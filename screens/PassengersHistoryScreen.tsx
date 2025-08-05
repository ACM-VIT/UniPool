import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';
import LoadingComponent from '../components/LoadingComponent';

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
      <LoadingComponent />
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
      <View style={styles.newSection}>
        <View style={styles.menuContainer}>
          {passengers.length === 0 ? (
            <View style={{
              minHeight: 120,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 32,
              backgroundColor: styles.menuContainer.backgroundColor,
              borderRadius: styles.menuContainer.borderRadius,
            }}>
              <Text style={{ fontSize: 18, color: styles.headerTitle.color, textAlign: 'center', marginBottom: 12, fontWeight: '600', fontFamily: 'NunitoSans_600SemiBold' }}>
                You haven't travelled with any passengers yet.
              </Text>
              <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', fontFamily: 'NunitoSans_400Regular' }}>
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
