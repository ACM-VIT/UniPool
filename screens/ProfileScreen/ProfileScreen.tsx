import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, Platform, StatusBar, Share, Linking } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ProfileScreenProps } from "./ProfileScreen.types";
import BrandInfo from "../../components/BrandInfo";
import styles from "./ProfileScreen.styles";
import AppColors from "../../design_systems/colors";
import LoadingComponent from "../../components/LoadingComponent";
import { useApi } from "../../utils/ApiUtil";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../../utils/responsive";
import bottomNavItems from "../../data/BottomNavigationItems";
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import BrandedAlert from "../../components/BrandedAlert";
import { appHref } from "../../navigation/routes";
import { useUser } from "../../contexts/UserContext";

const DEBUG_PROFILE =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_PROFILE === "1";

const debugLog = (...args: any[]) => {
  if (DEBUG_PROFILE) console.log(...args);
};

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
  completed_trips?: number;
  distance_travelled?: number;
  weight_saved?: number;
}

interface ApiResponse {
  user: UserData;
}

interface MenuItem {
  id: string;
  title: string;
  icon?: any;
  hasCheckmark?: boolean;
  onPress?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiUtil } = useApi();
  // iPad-only: phone-shape centred column so the stat cards and
  // account/help/about sections sit in a readable width instead of
  // stretching the full 1032pt canvas. Hook returns null on phones.
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const screenActiveRef = useRef(true);
  const hasFocusedOnceRef = useRef(false);
  const { user: contextUser, loading: contextUserLoading } = useUser();

  const showProfileError = useCallback((message: string) => {
    if (screenActiveRef.current) {
      BrandedAlert.alert('Error', message);
    }
  }, []);

  const profileScreenNavItems = bottomNavItems.map((item, index) => ({
    ...item,
    isActive: index === 3,
  }));

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      const auth = require('@react-native-firebase/auth').getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        debugLog("No authenticated user found in ProfileScreen");
        setError("Please sign in to view your profile");
        setLoading(false);
        return;
      }

      if (contextUser && contextUser.completed_trips !== undefined) {
        setUserData(contextUser as unknown as UserData);
        return;
      }

      debugLog("User authenticated, fetching profile data...");
      const response = await apiUtil.get<ApiResponse>("/user/details");
      setUserData(response.user);
      debugLog("User data fetched successfully:", response);
    } catch (error: any) {
      if (error?.message === "AUTHENTICATION_REDIRECT") {
        debugLog("Authentication redirect in ProfileScreen - not showing error");
        return;
      }
      
      if (error?.response?.status === 404 && 
          error?.response?.data?.message === "User not found in database, signup required") {
        debugLog("User not found in database - redirect to signup handled by ApiUtil");
        return;
      }
      
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Failed to load user data";
      setError(errorMessage);
      BrandedAlert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiUtil, contextUser]);

  useEffect(() => {
    return () => {
      screenActiveRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      screenActiveRef.current = true;
      return () => {
        screenActiveRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    if (contextUser) {
      setUserData(contextUser as unknown as UserData);
      setLoading(false);
    } else if (!contextUserLoading) {
      fetchUserData();
    }
  }, [contextUser, contextUserLoading, fetchUserData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      void fetchUserData();
    }, [fetchUserData]),
  );

  const profileStats = useMemo(() => {
    const completedTrips = userData?.completed_trips ?? 0;
    const totalTrips =
      completedTrips > 0
        ? completedTrips
        : (userData?.total_bookings ?? 0) + (userData?.total_hosted_rides ?? 0);
    return {
      trips: totalTrips,
      distanceKm: userData?.distance_travelled ?? 0,
    };
  }, [userData]);


  // "Bookings" row was removed — the Trips tab in the main nav is the
  // canonical surface for booked / hosted / past rides, so a second
  // entry point under Settings was redundant.
  const myDetailsItems: MenuItem[] = [
    {
      id: "personal_info",
      title: "Personal Information",
      icon: require("../../assets/user-male.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to PersonalInformationScreen");
        try {
          router.navigate(appHref("PersonalInformationScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Personal Information screen");
        }
      },
    },
    {
      id: "passengers",
      title: "Passengers travelled with",
      icon: require("../../assets/car.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to PassengersHistoryScreen");
        try {
          router.navigate(appHref("PassengersHistoryScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Passengers History screen");
        }
      },
    },
    {
      id: "trip_history",
      title: "Trip history",
      icon: require("../../assets/clock.png"),
      hasCheckmark: true,
      onPress: () => {
        try {
          router.navigate(appHref("TripHistoryScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Trip history screen");
        }
      },
    },
  ];

  const preferencesItems: MenuItem[] = [
    {
      id: "default_address",
      title: "Default Start Address",
      icon: require("../../assets/location-pin-2.png"),
      onPress: () => {
        debugLog("Navigating to DefaultAddressScreen");
        try {
          router.navigate(appHref("DefaultAddressScreen"));
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Default Address screen");
        }
      },
    },
    // {
    //   id: "currency",
    //   title: "Currency - INR",
    //   hasCheckmark: true,
    //   onPress: () => navigation.navigate("CurrencySettings"),
    // },
    // {
    //   id: "notifications",
    //   title: "Notifications",
    //   icon: require("../../assets/notification-icon.png"),
    //   hasCheckmark: true,
    //   onPress: () => {
    //     console.log("Navigating to NotificationsScreen");
    //     try {
    //       navigation.navigate("NotificationsScreen");
    //     } catch (error) {
    //       console.error("Navigation error:", error);
    //       BrandedAlert.alert("Navigation Error", "Unable to navigate to Notifications screen");
    //     }
    //   },
    // },
  ];

  const openACMVITSite = () => {
    Linking.openURL('https://acmvit.in').catch((error) => {
      console.warn('[ProfileScreen] ACM-VIT link failed', error);
      showProfileError('Unable to open the link.');
    });
  };

  const openHelpEmail = () => {
    Linking.openURL('mailto:outreach.acmvit@gmail.com').catch((error) => {
      console.warn('[ProfileScreen] help email failed', error);
      showProfileError('Unable to open mail app.');
    });
  };

  const openShareDialog = async () => {
    try {
      await Share.share({
        message: 'Check out UniPool by ACM-VIT: https://acmvit.in',
        url: 'https://acmvit.in',
        title: 'ACM-VIT',
      });
    } catch (error) {
      console.warn('[ProfileScreen] share failed', error);
      showProfileError('Unable to open share sheet.');
    }
  };

  const openRateApp = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.carpoolitapp';
    // App Store URL will use bundle ID - update with actual App ID after first submission
    const appStoreUrl = 'https://apps.apple.com/app/unipool/id6740000000';
    const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
    Linking.openURL(url).catch((error) => {
      console.warn('[ProfileScreen] app store link failed', error);
      showProfileError('Unable to open app store. Please search for UniPool manually.');
    });
  };

  const handleLogout = () => {
    debugLog("Logout button pressed");
    BrandedAlert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            debugLog("User confirmed logout");
            try {
              const { getAuth, signOut } = await import('@react-native-firebase/auth');
              const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');

              debugLog("Starting logout process...");
              const auth = getAuth();
              await signOut(auth);
              debugLog("Firebase signout completed");

              await AsyncStorage.removeItem('unipool_start_address');
              await AsyncStorage.removeItem('defaultAddress');
              await AsyncStorage.removeItem('lastUserVerification');
              debugLog("AsyncStorage cleared (including lastUserVerification)");

              setUserData(null);
              debugLog("Navigating to AuthScreen...");

              router.replace(appHref("AuthScreen"));
              debugLog("Navigation reset completed");
            } catch (e) {
              console.error('Logout error:', e);
              BrandedAlert.alert('Logout Failed', 'An error occurred while logging out.');
            }
          },
        },
      ]
    );
  };

  const moreItems: MenuItem[] = [
    {
      id: "share",
      title: "Share",
      icon: require("../../assets/megaphone.png"),
      onPress: openShareDialog,
    },
    {
      id: "rate_app",
      title: "Rate App",
      icon: require("../../assets/star.png"),
      hasCheckmark: true,
      onPress: openRateApp,
    },
    {
      id: "know_about",
      title: "Know about ACM-VIT",
      icon: require("../../assets/acm.png"),
      hasCheckmark: true,
      onPress: openACMVITSite,
    },
    {
      id: "help",
      title: "Help",
      icon: require("../../assets/question.png"),
      hasCheckmark: true,
      onPress: openHelpEmail,
    },
    {
      id: "privacy_policy",
      title: "Privacy Policy",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        router.navigate(appHref("PrivacyPolicyScreen"));
      },
    },
    {
      id: "terms_of_service",
      title: "Terms of Service",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        router.navigate(appHref("TermsOfServiceScreen"));
      },
    },
    {
      id: "account_settings",
      title: "Account Settings",
      icon: require("../../assets/setting-3.png"),
      hasCheckmark: true,
      onPress: () => {
        debugLog("Navigating to AccountSettingsScreen");
        try {
          router.navigate(appHref("AccountSettingsScreen"));
          debugLog("Navigation to AccountSettingsScreen completed");
        } catch (error) {
          console.error("Navigation error:", error);
          BrandedAlert.alert("Navigation Error", "Unable to navigate to Account Settings");
        }
      },
    },
    {
      id: "logout",
      title: "Logout",
      icon: require("../../assets/arrow-square-left.png"),
      onPress: handleLogout,
    },
  ];

  const renderMenuItem = (item: MenuItem) => {
    const isHighPriorityItem = ['help', 'account_settings', 'logout'].includes(item.id);
    const itemStyle = isHighPriorityItem 
      ? [styles.menuItem, { zIndex: 3000, elevation: 3000, position: 'relative' as const }] 
      : styles.menuItem;

    return (
      <TouchableOpacity
        key={item.id}
        style={itemStyle}
        onPress={() => {
          debugLog(`Menu item pressed: ${item.title} (${item.id})`);
          if (item.onPress) {
            item.onPress();
          } else {
            console.warn(`No onPress handler for item: ${item.title}`);
          }
        }}
        activeOpacity={0.7}
      >
        {item.icon && (
          <Image
            source={item.icon}
            style={styles.menuItemIcon}
            resizeMode="contain"
          />
        )}
        <Text style={styles.menuItemText}>{item.title}</Text>
        {/* {item.hasCheckmark && (
          <Image
            source={require("../../assets/favicon.png")}
            style={styles.checkmarkIcon}
            resizeMode="contain"
          />
        )} */}
      </TouchableOpacity>
    );
  };  const renderStatsCard = (value: string, label: string, unit?: string, icon?: any) => (
    <View style={styles.statsCard}>
      {icon && (
        <Image
          source={icon}
          style={styles.statsIcon}
          resizeMode="contain"
        />
      )}
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
      {unit && <Text style={styles.statsUnit}>{unit}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingComponent />
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Unable to load profile data"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      
      <View style={[styles.headerRow, tabletContentStyle]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}
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
            profileStats.trips.toString(),
            "trips"
          )}
          {renderStatsCard(
            profileStats.distanceKm.toString(),
            "travelled",
            "km"
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
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
          <View style={[styles.menuContainer, { zIndex: 2000, elevation: 2000, position: 'relative' }]}>
            {moreItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={[styles.footerBranding, { zIndex: 1 }]}>
          <Text style={styles.footerSubtitle}>Viva la Vida!</Text>
          <View style={styles.footerImageContainer}>
            <Image
              source={require("../../assets/trees-footer.png")}
              style={styles.footerImage}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.footerTextContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -100 }]}>  
            <Text style={[styles.footerCredits, { fontSize: 16, fontFamily: "NunitoSans_400Regular", color: AppColors.secondaryDarkGreen, textAlign: 'center', marginBottom: 4 }]}>Crafted with </Text>
            <View style={{ marginHorizontal: 4, marginBottom: 2 }}>
              <Svg width={22} height={20} viewBox="0 0 41 37" fill="none">
                <G clipPath="url(#clip0_75_2248)">
                  <Path d="M18.8159 35.4322L19.0203 35.4944C19.7717 35.7218 20.4815 35.9362 20.9492 36.876C20.9611 36.8997 20.9777 36.9207 20.9981 36.9376C21.0185 36.9544 21.0422 36.9667 21.0676 36.9737C21.0836 36.9779 21.1 36.9802 21.1166 36.9802C21.1529 36.9802 21.1882 36.9695 21.2187 36.9496C21.5636 36.7228 21.8885 36.5174 22.1969 36.3223C22.8432 35.9132 23.4014 35.5603 23.9352 35.1491C25.8498 33.7063 27.5968 32.0501 29.1433 30.2115C31.1758 27.7539 33.2774 25.2125 35.2557 22.5522C36.4939 20.8868 37.5497 19.0276 38.4419 17.4163C39.3342 15.786 39.8655 13.9796 39.9991 12.1217C40.2412 9.06857 39.522 6.31658 37.8618 3.94232C36.0139 1.29984 33.5563 0.0129204 30.5627 0.112139C27.1855 0.226084 24.2154 1.52953 21.7346 3.98644C21.6143 4.11123 21.5029 4.24446 21.4014 4.38516C21.2085 4.63919 21.0254 4.88033 20.75 4.97587C17.8563 2.13 15.6438 1.01675 12.3341 0.731431C8.93742 0.438376 6.18756 1.54135 4.16053 4.00801C3.15455 5.22727 2.27284 6.54579 1.52877 7.94362C-0.057273 10.9421 -0.387768 14.1315 0.547998 17.4237C1.38255 20.3622 2.77409 23.109 4.64544 25.5118C8.38686 30.331 13.1546 33.6691 18.8159 35.4322ZM4.80495 8.51149C5.2396 7.68449 5.72382 6.88505 6.25483 6.11755C7.51729 4.25706 9.29657 3.31807 11.5529 3.31807C11.8325 3.31807 12.1193 3.33246 12.4134 3.36131C15.4273 3.65712 17.845 4.99777 19.5993 7.34589C19.81 7.6279 20.0395 7.88897 20.2419 8.11906C20.3243 8.21294 20.4018 8.30116 20.4701 8.38197C20.4986 8.41565 20.538 8.43808 20.5812 8.44542C21.3948 8.58716 21.7237 8.16118 21.9678 7.75216C23.3766 5.39281 25.5694 3.98447 28.8689 3.32031C29.6502 3.18415 30.4473 3.16395 31.2345 3.26045C32.4843 3.37955 33.5565 3.99977 34.4215 5.10333C35.4072 6.36917 35.9915 7.90599 36.0976 9.51269C36.2721 11.3698 35.9343 13.2396 35.1217 14.9149C34.5094 16.2134 33.8124 17.4695 33.0354 18.6747C31.5927 20.8209 30.0519 22.9546 28.5621 25.0179L28.0443 25.7358C26.9348 27.274 25.7874 28.8245 24.6781 30.3238C24.2777 30.8648 23.8778 31.406 23.478 31.9476C23.3055 32.1814 23.1259 32.4104 22.936 32.653C22.8733 32.7329 22.8097 32.8142 22.7449 32.8973C22.2128 32.6764 21.6947 32.4604 21.1866 32.2495C19.9874 31.7514 18.844 31.2763 17.7033 30.7942C14.546 29.4813 11.6861 27.5337 9.29747 25.07C6.8484 22.5257 5.15098 19.8037 4.10857 16.7483C3.15804 13.9614 3.38572 11.267 4.80495 8.51149Z" fill="#263B33"/>
                </G>
                <Defs>
                  <ClipPath id="clip0_75_2248">
                    <Rect width="40.1069" height="37" fill="white"/>
                  </ClipPath>
                </Defs>
              </Svg>
            </View>
            <Text style={[styles.footerCredits, { fontSize: 16, fontFamily: "NunitoSans_400Regular", color: AppColors.secondaryDarkGreen, textAlign: 'center', marginBottom: 4 }]}>by ACM-VIT</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
