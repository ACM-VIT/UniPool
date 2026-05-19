import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';
import LoadingComponent from '../components/LoadingComponent';
import AppColors from '../design_systems/colors';

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
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
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
      {passengers.length === 0 ? (
        // Title-only empty state, same shape the BookingScreen uses.
        // No body help-text — the title is enough.
        <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 36 }}>
          <Text style={{
            fontFamily: 'NunitoSans_800ExtraBold',
            fontSize: 22,
            color: AppColors.secondaryDarkGreen,
            letterSpacing: -0.4,
          }}>
            No co-riders yet
          </Text>
        </View>
      ) : (
        <View style={styles.newSection}>
          <View style={styles.menuContainer}>
            <FlatList
              data={passengers}
              keyExtractor={(item) => item.id}
              renderItem={renderPassenger}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default PassengersHistoryScreen;
