import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ProfileScreenProps } from "./ProfileScreen.types";
import BrandInfo from "../../components/BrandInfo";
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
  total_bookings?: number;
  total_hosted_rides?: number;
  distance_travelled?: number;
  weight_saved?: number;
}

interface ApiResponse {
  user: UserData;
}

interface MenuItem {
  id: string;
  title: string;
  hasCheckmark?: boolean;
  onPress?: () => void;
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

  const myDetailsItems: MenuItem[] = [
    {
      id: "bookings",
      title: "Bookings",
      onPress: () => navigation.navigate("BookingsScreen"),
    },
    {
      id: "personal_info",
      title: "Personal Information",
      hasCheckmark: true,
      onPress: () => navigation.navigate("PersonalInformationScreen"),
    },
    {
      id: "passengers",
      title: "Passengers travelled with",
      hasCheckmark: true,
      onPress: () => navigation.navigate("PassengersHistoryScreen"),
    },
  ];

  const preferencesItems: MenuItem[] = [
    {
      id: "default_address",
      title: "Default Start Address",
      onPress: () => navigation.navigate("DefaultAddressScreen"),
    },
    // {
    //   id: "currency",
    //   title: "Currency - INR",
    //   hasCheckmark: true,
    //   onPress: () => navigation.navigate("CurrencySettings"),
    // },
    {
      id: "notifications",
      title: "Notifications",
      hasCheckmark: true,
      onPress: () => navigation.navigate("NotificationSettings"),
    },
  ];

  const openACMVITSite = () => {
    import('react-native').then(({ Linking }) => {
      Linking.openURL('https://acmvit.in');
    });
  };

  const openHelpEmail = () => {
    import('react-native').then(({ Linking }) => {
      Linking.openURL('mailto:outreach.acmvit@gmail.com');
    });
  };

  const openShareDialog = async () => {
    const { Share } = await import('react-native');
    Share.share({
      message: 'Check out UniPool by ACM-VIT: https://acmvit.in',
      url: 'https://acmvit.in',
      title: 'ACM-VIT',
    });
  };

  const openRateApp = () => {
    import('react-native').then(({ Linking, Platform }) => {
      const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.carpoolitapp';
      const appStoreUrl = 'https://apps.apple.com/app/idYOUR_APP_ID';
      const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
      Linking.openURL(url);
    });
  };

  const moreItems: MenuItem[] = [
    {
      id: "share",
      title: "Share",
      onPress: openShareDialog,
    },
    {
      id: "rate_app",
      title: "Rate App",
      hasCheckmark: true,
      onPress: openRateApp,
    },
    {
      id: "know_about",
      title: "Know about ACM-VIT",
      hasCheckmark: true,
      onPress: openACMVITSite,
    },
    {
      id: "help",
      title: "Help",
      hasCheckmark: true,
      onPress: openHelpEmail,
    },
    {
      id: "account_settings",
      title: "Account Settings",
      hasCheckmark: true,
      onPress: () => navigation.navigate("AccountSettingsScreen"),
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuItemText}>{item.title}</Text>
      {item.hasCheckmark && (
        <Image
          source={require("../../assets/favicon.png")}
          style={styles.checkmarkIcon}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );

  const renderStatsCard = (value: string, label: string, unit?: string) => (
    <View style={styles.statsCard}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
      {unit && <Text style={styles.statsUnit}>{unit}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={
                userData.profile_picture_url 
                  ? { uri: userData.profile_picture_url }
                  : require("../../assets/user-male.png")
              } 
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.userName}>{userData.name}</Text>
        </View>

        <View style={styles.statsContainer}>
          {renderStatsCard(
            (() => {
              const bookings = userData.total_bookings ?? 0;
              const hosted = userData.total_hosted_rides ?? 0;
              return (bookings + hosted).toString();
            })(),
            "trips"
          )}
          {renderStatsCard(
            userData.distance_travelled?.toString() || "9876", 
            "km", 
            "travelled"
          )}
          {renderStatsCard(
            userData.weight_saved?.toString() || "900", 
            "kg", 
            "CO₂ saved"
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Details</Text>
          <View style={styles.menuContainer}>
            {myDetailsItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuContainer}>
            {preferencesItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.menuContainer}>
            {moreItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.footerBranding}>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerTitle}>Viva</Text>
            <Text style={styles.footerSubtitle}>la Vida!</Text>
            <Text style={styles.footerCredits}>Crafted with ♡ by ACM-VIT</Text>
          </View>
          <View style={styles.footerImageContainer}>
            <Image
              source={require("../../assets/trees-footer.png")}
              style={styles.footerImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;