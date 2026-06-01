import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo/BrandInfo';
import ChevronBack from '../components/ChevronBack/ChevronBack';
import { useFocusEffect, useRouter } from "expo-router";
import LoadingComponent from '../components/LoadingComponent';
import EmptyState from '../components/EmptyState';
import SmileyGlyph from '../components/SmileyGlyph';
import { appHref } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";
import { useThemeColors } from "../contexts/ThemeContext";

interface Passenger {
  id: string;
  name: string;
  [key: string]: any;
}

const PassengersHistoryScreen: React.FC = () => {
  const { back, navigate } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const { apiUtil } = useApi();
  const colors = useThemeColors();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const hasFocusedOnceRef = useRef(false);

  const loadPassengers = useCallback(() => {
    setLoading(true);
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

  useEffect(() => {
    loadPassengers();
  }, [loadPassengers]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      loadPassengers();
      return undefined;
    }, [loadPassengers]),
  );

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
      <LoadingComponent />
    </View>
  );
  if (error) {
    return (
      <View style={[styles.container, tabletContentStyle, { backgroundColor: colors.background }]}>
        <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => back()}>
              <ChevronBack />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Passengers History</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      </View>
    );
  }

  const renderPassenger: ListRenderItem<Passenger> = ({ item }) => (
    <View style={[styles.menuItem, colors.mode === "dark" && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}>
      <Text style={[styles.menuItemText, { color: colors.textOnDark }]}>{item.name || 'No name available'}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Passengers History</Text>
        </View>
      </View>
      {passengers.length === 0 ? (
        <EmptyState
          // Vector glyph stays sharp and color-tracks the active palette.
          glyph={<SmileyGlyph size={150} />}
          title="No co-riders yet"
          body="The people you share a ride with will live here once you've taken your first trip together."
          ctaLabel="Find a ride"
          onPressCta={() => navigate(appHref("HomeScreen"))}
        />
      ) : (
        <View style={styles.newSection}>
          <View style={[styles.menuContainer, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
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
