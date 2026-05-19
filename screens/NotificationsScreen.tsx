import React, { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Dimensions, Switch } from "react-native";
import { TouchableOpacity, ScrollView } from "react-native";
import ChevronBack from "../components/ChevronBack";
import BrandInfo from "../components/BrandInfo";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import { useNavigation } from "../navigation/router-compat";
import BrandedAlert from "../components/BrandedAlert";

const { width, height } = Dimensions.get("window");

interface NotificationSettings {
  pushNotifications: boolean;
  rideUpdates: boolean;
  bookingConfirmations: boolean;
  chatMessages: boolean;
  promotions: boolean;
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    rideUpdates: true,
    bookingConfirmations: true,
    chatMessages: true,
    promotions: false,
  });
  const [loading, setLoading] = useState(false);
  const { apiUtil } = useApi();

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      setLoading(true);
      try {
        // Try to get cached settings first
        const cachedSettings = await AsyncStorage.getItem("notificationSettings");
        if (cachedSettings) {
          setSettings(JSON.parse(cachedSettings));
        } else {
          // Try to fetch from API
          try {
            const response = await apiUtil.get("/user/notification-settings");
            if (response && typeof response === "object") {
              const apiSettings = response as NotificationSettings;
              setSettings(apiSettings);
              await AsyncStorage.setItem("notificationSettings", JSON.stringify(apiSettings));
            }
          } catch (apiError) {
            console.log("No existing notification settings found, using defaults");
          }
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationSettings();
  }, [apiUtil]);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem("notificationSettings", JSON.stringify(newSettings));
      
      // Save to API
      await apiUtil.put("/user/notification-settings", newSettings);
      
      console.log(`Updated ${key} to ${value}`);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      // Revert the change if API call fails
      setSettings(settings);
      BrandedAlert.alert("Couldn't update", "We couldn't save that change. Try again in a moment.");
    }
  };

  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string
  ) => (
    <View style={styles.settingItem} key={key}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ 
          false: AppColors.secondaryDarkGreen + "30", 
          true: AppColors.secondaryDarkGreen 
        }}
        thumbColor={settings[key] ? AppColors.primaryLightGreen : AppColors.basicWhite}
        ios_backgroundColor={AppColors.secondaryDarkGreen + "30"}
        style={styles.switch}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>

      <View style={styles.headerRowWithChevron}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.menuContainer}>
            {renderSettingItem(
              "pushNotifications",
              "Enable Push Notifications",
              "Receive notifications on your device"
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Notifications</Text>
          <View style={styles.menuContainer}>
            {renderSettingItem(
              "rideUpdates",
              "Ride Updates",
              "Get notified about ride status changes"
            )}
            {renderSettingItem(
              "bookingConfirmations",
              "Booking Confirmations",
              "Receive booking confirmations and cancellations"
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>
          <View style={styles.menuContainer}>
            {renderSettingItem(
              "chatMessages",
              "Chat Messages",
              "Get notified about new messages"
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing</Text>
          <View style={styles.menuContainer}>
            {renderSettingItem(
              "promotions",
              "Promotions & Offers",
              "Receive promotional notifications and special offers"
            )}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            You can manage your notification preferences here. Changes will be saved automatically.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    paddingHorizontal: "2.5%",
    paddingVertical: "2%",
  },
  headerRowWithChevron: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "2.5%",
    paddingVertical: "2%",
    gap: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: width * 0.051,
    paddingBottom: height * 0.15,
  },
  section: {
    marginBottom: height * 0.025,
  },
  sectionTitle: {
    fontSize: width * 0.046,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: height * 0.015,
  },
  menuContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: width * 0.046,
    borderWidth: 1,
    borderColor: AppColors.secondaryDarkGreen,
    marginBottom: height * 0.03,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.041,
    paddingVertical: height * 0.0175,
    backgroundColor: AppColors.primaryLightGreen,
    borderBottomWidth: 0.5,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: width * 0.051,
  },
  settingTitle: {
    fontSize: width * 0.041,
    fontWeight: "600",
    color: AppColors.secondaryDarkGreen,
    marginBottom: height * 0.005,
    fontFamily: "NunitoSans_600SemiBold",
  },
  settingDescription: {
    fontSize: width * 0.035,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.75,
    lineHeight: width * 0.041,
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
    alignSelf: "center",
  },
  infoSection: {
    backgroundColor: AppColors.primaryLightGreen + "20",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "NunitoSans_400Regular",
  },
});

export default NotificationsScreen;
