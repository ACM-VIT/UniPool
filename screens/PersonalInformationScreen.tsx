import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  upi_vpa?: string;
  is_email_verified?: boolean;
  institute?: { name?: string } | null;
  [key: string]: any;
}

interface UserResponse {
  user: User;
}

/**
 * Personal Information screen. Shows the user's identity fields
 * (name, email, contact, gender) as read-only rows + a single
 * editable row for the UPI VPA so hosts can opt in to receiving
 * post-trip payments via the home-screen pay sheet's UPI deeplink.
 *
 * No other fields are editable here — name and email come from
 * the Firebase identity, verification status from email-domain
 * matching, etc. Anything truly stale (e.g. switching email
 * accounts) goes through the auth flow instead.
 */
const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // VPA edit sheet state. Opens when the user taps the UPI row.
  // Saves via PATCH /user/profile, then merges the returned row
  // back into local state so the screen reflects the change
  // without a re-fetch.
  const [vpaEdit, setVpaEdit] = useState<{ open: boolean; draft: string; busy: boolean }>(
    { open: false, draft: '', busy: false },
  );

  useEffect(() => {
    apiUtil.get<UserResponse>('/user/details')
      .then((data: UserResponse) => setUser(data.user))
      .catch((err: any) => {
        if (err?.message === "AUTHENTICATION_REDIRECT") {
          return;
        }
        if (err?.response?.status === 404 &&
            err?.response?.data?.message === "User not found in database, signup required") {
          return;
        }
        setError('Failed to load user info');
      })
      .finally(() => setLoading(false));
  }, [apiUtil]);

  const openVpaEdit = () => {
    setVpaEdit({ open: true, draft: user?.upi_vpa ?? '', busy: false });
  };
  const closeVpaEdit = () => {
    if (vpaEdit.busy) return;
    setVpaEdit((s) => ({ ...s, open: false }));
  };
  const saveVpa = async () => {
    const next = vpaEdit.draft.trim();
    if (next && !next.includes('@')) {
      Alert.alert('Invalid UPI ID', 'A UPI ID looks like name@bank — for example yash@upi.');
      return;
    }
    setVpaEdit((s) => ({ ...s, busy: true }));
    try {
      const resp = await apiUtil.patch<UserResponse, { upi_vpa: string }>(
        '/user/profile',
        { upi_vpa: next },
      );
      if (resp?.user) setUser(resp.user);
      setVpaEdit({ open: false, draft: '', busy: false });
    } catch (err: any) {
      setVpaEdit((s) => ({ ...s, busy: false }));
      Alert.alert(
        "Couldn't save",
        err?.response?.data?.error || "We hit a snag saving your UPI ID. Try again.",
      );
    }
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <LoadingComponent />
    </View>
  );

  const header = (title: string) => (
    <>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>
    </>
  );

  if (error) return (
    <View style={styles.container}>
      {header('Personal Information')}
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    </View>
  );

  if (!user) return (
    <View style={styles.container}>
      {header('Personal Information')}
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
    </View>
  );

  return (
    <View style={styles.container}>
      {header('Personal Information')}

      <View style={styles.newSection}>
        <View style={styles.menuContainer}>
          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Name</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.name}</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Email</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.email}</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Contact</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.contact_number}</Text>
          </View>
          {user.gender ? (
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Gender</Text>
              <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.gender}</Text>
            </View>
          ) : null}
          {user.institute?.name ? (
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Institute</Text>
              <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>
                {user.institute.name}
              </Text>
            </View>
          ) : null}

          {/* Editable UPI VPA row — tap to open the small editor.
              Empty state reads "Add UPI ID →" so the affordance is
              obvious; filled state shows the saved value with a
              quiet "Edit" hint on the right. */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={openVpaEdit}
          >
            <Text style={[styles.menuItemText, { flex: 1 }]}>UPI ID</Text>
            <Text
              style={[
                styles.menuItemText,
                {
                  flex: 2,
                  textAlign: 'right',
                  opacity: user.upi_vpa ? 1 : 0.55,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.upi_vpa || 'Add UPI ID →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit sheet — slide-up modal, single text field + Save / Cancel.
          Same chrome as the other modals in the app. */}
      <Modal
        visible={vpaEdit.open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeVpaEdit}
      >
        <View style={{ flex: 1, backgroundColor: AppColors.primaryLightGreen }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 16,
          }}>
            <TouchableOpacity onPress={closeVpaEdit} disabled={vpaEdit.busy}>
              <Text style={{
                color: AppColors.secondaryDarkGreen,
                fontFamily: 'NunitoSans_800ExtraBold',
                fontSize: 15,
                letterSpacing: 0.2,
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={{
              color: AppColors.secondaryDarkGreen,
              fontFamily: 'NunitoSans_800ExtraBold',
              fontSize: 17,
              letterSpacing: -0.2,
            }}>
              UPI ID
            </Text>
            <View style={{ width: 56 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, paddingHorizontal: 22 }}
          >
            <Text style={{
              fontFamily: 'NunitoSans_600SemiBold',
              fontSize: 14,
              lineHeight: 20,
              color: AppColors.secondaryDarkGreen,
              opacity: 0.7,
              marginBottom: 16,
            }}>
              Passengers can tap a Pay button after the trip to send your fare via UPI.
              Leave blank if you'd rather collect cash.
            </Text>

            <TextInput
              value={vpaEdit.draft}
              onChangeText={(t) => setVpaEdit((s) => ({ ...s, draft: t }))}
              placeholder="yourname@bank"
              placeholderTextColor="rgba(38,59,51,0.45)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                backgroundColor: AppColors.basicWhite,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15.5,
                color: AppColors.secondaryDarkGreen,
                fontFamily: 'NunitoSans_700Bold',
                borderWidth: 1,
                borderColor: 'rgba(38,59,51,0.12)',
              }}
              maxLength={120}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={vpaEdit.busy}
              onPress={saveVpa}
              style={{
                marginTop: 22,
                paddingVertical: 15,
                borderRadius: 16,
                backgroundColor: vpaEdit.busy
                  ? 'rgba(38,59,51,0.35)'
                  : AppColors.secondaryDarkGreen,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: AppColors.primaryLightGreen,
                fontFamily: 'NunitoSans_800ExtraBold',
                fontSize: 15.5,
                letterSpacing: 0.2,
              }}>
                {vpaEdit.busy ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default PersonalInformationScreen;
