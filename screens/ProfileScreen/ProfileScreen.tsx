import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { ProfileScreenProps } from "./ProfileScreen.types";
import ChevronBack from "../../components/ChevronBack";
import MainNavBar from "../../components/MainNavBar";
import styles from "./ProfileScreen.styles";
import AppColors from "../../design_systems/colors";
import { useApi } from "../../utils/ApiUtil";
import bottomNavItems from "../../data/BottomNavigationItems";

interface UserData {
  id: string;
  name: string;
  email: string;
  contact_number: string;
  gender: string;
  yob: number;
  created_at: string;
  updated_at: string;
  profile_picture_url?: string;
}

interface ApiResponse {
  user: UserData;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiUtil } = useApi();

  const profileScreenNavItems = bottomNavItems.map((item, index) => ({
    ...item,
    isActive: index === 3,
  }));

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await apiUtil.get<ApiResponse>("/user/details");
      setUserData(response.user);
      console.log("User data fetched successfully:", response);
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Failed to load user data";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [apiUtil]);

  const calculateAge = (yob: number): number => {
    const currentYear = new Date().getFullYear();
    return currentYear - yob;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ChevronBack style={styles.backButton} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.secondaryDarkGreen} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <ChevronBack style={styles.backButton} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Unable to load profile data"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChevronBack style={styles.backButton} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileContent}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={
              userData.profile_picture_url 
                ? { uri: userData.profile_picture_url }
                : require("../../assets/user-male.png")
            } 
            style={styles.profileImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.userInfoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{userData.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userData.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact:</Text>
            <Text style={styles.infoValue}>{userData.contact_number}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{userData.gender}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{calculateAge(userData.yob)} years</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since:</Text>
            <Text style={styles.infoValue}>
              {new Date(userData.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.navBarView}>
        <MainNavBar
          variant={0}
          bottomNavItems={profileScreenNavItems}
          iconPath={require("../../assets/wallet.png")}
        />
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;
