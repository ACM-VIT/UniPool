import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';
import LoadingComponent from '../components/LoadingComponent';
import AppColors from '../design_systems/colors';

interface User {
  name: string;
  email: string;
  contact_number: string;
  [key: string]: any;
}

interface UserResponse {
  user: User;
}

const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiUtil.get<UserResponse>('/user/details')
      .then((data: UserResponse) => setUser(data.user))
      .catch((err: any) => {
        if (err?.message === "AUTHENTICATION_REDIRECT") {
          console.log("Authentication redirect in PersonalInformationScreen");
          return;
        }
        
        if (err?.response?.status === 404 && 
            err?.response?.data?.message === "User not found in database, signup required") {
          console.log("User not found in database - redirect to signup handled by ApiUtil");
          return;
        }
        
        setError('Failed to load user info');
      })
      .finally(() => setLoading(false));
  }, [apiUtil]);

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
      <LoadingComponent />
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
          <Text style={styles.headerTitle}>Personal Information</Text>
        </View>
      </View>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
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
          <Text style={styles.headerTitle}>Personal Information</Text>
        </View>
      </View>
      {user ? (
        <View style={styles.newSection}>
          <View style={styles.menuContainer}>
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, {flex: 1}]}>Name</Text>
              <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap', textAlign: 'right'}]}>{user.name}</Text>
            </View>
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, {flex: 1}]}>Email</Text>
              <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap', textAlign: 'right'}]}>{user.email}</Text>
            </View>
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, {flex: 1}]}>Contact</Text>
              <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap', textAlign: 'right'}]}>{user.contact_number}</Text>
            </View>
            {user.gender && (
              <View style={styles.menuItem}>
                <Text style={[styles.menuItemText, {flex: 1}]}>Gender</Text>
                <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap', textAlign: 'right'}]}>{user.gender}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        // Same title-only empty state as the BookingScreen — no body
        // copy, no extra hand-holding.
        <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 36 }}>
          <Text style={{
            fontFamily: 'NunitoSans_800ExtraBold',
            fontSize: 22,
            color: AppColors.secondaryDarkGreen,
            letterSpacing: -0.4,
          }}>
            Nothing here yet
          </Text>
        </View>
      )}
    </View>
  );
};

export default PersonalInformationScreen;
