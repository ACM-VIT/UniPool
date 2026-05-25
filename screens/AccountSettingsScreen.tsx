import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useRouter } from "expo-router";
import { useApi } from '../utils/ApiUtil';
import BrandedAlert from "../components/BrandedAlert";
import { appHref } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";

// Brand coral the rest of the app already uses for destructive
// states (Leave ride, declined badge). Avoids dropping a raw red
// hex into the design system here.
const DESTRUCTIVE = '#FF6B5B';

const AccountSettingsScreen: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const { apiUtil } = useApi();
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    BrandedAlert.alert(
      'Delete your account?',
      'Your profile, posted rides, and bookings will be erased for good. This can\'t be undone.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiUtil.delete('/user/delete');
              const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
              const { getAuth, signOut } = await import('@react-native-firebase/auth');
              try {
                const auth = getAuth();
                await signOut(auth);
              } catch (e) {
                console.error('Firebase sign out error:', e);
              }

              try {
                await Promise.all([
                  AsyncStorage.removeItem('unipool_start_address'),
                  AsyncStorage.removeItem('defaultAddress'),
                  AsyncStorage.removeItem('lastUserVerification'),
                ]);
              } catch (e) {
                console.error('AsyncStorage cleanup error:', e);
              }

              BrandedAlert.alert('Account deleted', 'See you around. We\'ve removed your data.');
              router.replace(appHref("AuthScreen"));
            } catch (err) {
              console.error('Account deletion error:', err);
              BrandedAlert.alert('Couldn\'t delete', 'Something went wrong. Try again in a moment.');
            } finally {
              setLoading(false);
            } 
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, tabletContentStyle]}>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>
      </View>
      <View style={styles.newSection}>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.navigate(appHref("NotificationsScreen"))}
            activeOpacity={0.7}
          >
            <Text style={styles.menuItemText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={DESTRUCTIVE} accessibilityLabel="Loading" />
            ) : (
              <Text style={[styles.menuItemText, { color: DESTRUCTIVE }]}>
                Delete my account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default AccountSettingsScreen;
