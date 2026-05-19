import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useRouter } from "expo-router";
import LoadingComponent from '../components/LoadingComponent';
import AppColors from '../design_systems/colors';
import EmptyState from '../components/EmptyState';
import { appHref } from "../navigation/routes";

interface Passenger {
  id: string;
  name: string;
  [key: string]: any;
}

const PassengersHistoryScreen: React.FC = () => {
  const router = useRouter();
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
            <TouchableOpacity onPress={() => router.back()}>
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
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passengers History</Text>
        </View>
      </View>
      {passengers.length === 0 ? (
        <EmptyState
          image={require('../assets/happy-emoji.png')}
          title="No co-riders yet"
          body="The people you share a ride with will live here once you've taken your first trip together."
          ctaLabel="Find a ride"
          onPressCta={() => router.navigate(appHref("HomeScreen"))}
        />
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
