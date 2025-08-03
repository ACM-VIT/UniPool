import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useNavigation } from '@react-navigation/native';
import LoadingComponent from '../components/LoadingComponent';

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
      .catch(() => setError('Failed to load user info'))
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
          <Text style={styles.headerTitle}>Personal Information</Text>
        </View>
      </View>
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
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 12, fontSize: 14 }}>
          Please check your connection or try again later.
        </Text>
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
      <View style={styles.newSection}>
        <Text style={styles.sectionTitle}>My Details</Text>
        <View style={styles.menuContainer}>
          {user ? (
            <>
              <View style={styles.menuItem}>
                <Text style={[styles.menuItemText, {flex: 1}]}>Name</Text>
                <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap'}]}>{user.name}</Text>
              </View>
              <View style={styles.menuItem}>
                <Text style={[styles.menuItemText, {flex: 1}]}>Email</Text>
                <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap'}]}>{user.email}</Text>
              </View>
              <View style={styles.menuItem}>
                <Text style={[styles.menuItemText, {flex: 1}]}>Contact</Text>
                <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap'}]}>{user.contact_number}</Text>
              </View>
              {user.gender && (
                <View style={styles.menuItem}>
                  <Text style={[styles.menuItemText, {flex: 1}]}>Gender</Text>
                  <Text style={[styles.menuItemText, {flex: 2, flexWrap: 'wrap'}]}>{user.gender}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Text style={{ fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 12 }}>
                No personal information found.
              </Text>
              <Text style={{ fontSize: 14, color: '#aaa', textAlign: 'center' }}>
                Please update your profile to see your information here!
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default PersonalInformationScreen;
