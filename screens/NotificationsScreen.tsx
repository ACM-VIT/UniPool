import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Switch, ActivityIndicator } from "react-native";
import { TouchableOpacity, ScrollView } from "react-native";
import ChevronBack from "../components/ChevronBack";
import BrandInfo from "../components/BrandInfo";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import { useRouter } from "expo-router";
import BrandedAlert from "../components/BrandedAlert";
import profileStyles from "./ProfileScreen/ProfileScreen.styles";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../utils/responsive";

const { width, height } = Dimensions.get("window");

// Canonical categories, mirrored from helpers.AllNotifCategories on
// the backend. Order here drives the order rendered in the UI.
type Category = "chat_messages" | "ride_updates" | "trip_reminders" | "rating_prompts";

const CATEGORY_META: { key: Category; title: string; description: string; sectionTitle: string }[] = [
  {
    key: "chat_messages",
    sectionTitle: "Communication",
    title: "Chat messages",
    description: "New messages from your ride hosts and passengers",
  },
  {
    key: "ride_updates",
    sectionTitle: "Ride activity",
    title: "Booking updates",
    description: "When your request is accepted, rejected, or a ride is cancelled",
  },
  {
    key: "trip_reminders",
    sectionTitle: "Ride activity",
    title: "Trip reminders",
    description: "A nudge 30 minutes before a ride you're on starts",
  },
  {
    key: "rating_prompts",
    sectionTitle: "After the trip",
    title: "Rate-your-ride prompts",
    description: "A reminder ~12 hours after a trip to leave a rating",
  },
];

type PrefsState = Record<Category, boolean>;

const DEFAULT_STATE: PrefsState = {
  chat_messages: true,
  ride_updates: true,
  trip_reminders: true,
  rating_prompts: true,
};

const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const { apiUtil } = useApi();
  const [prefs, setPrefs] = useState<PrefsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response: any = await apiUtil.get("/user/notification-prefs");
        const list: { category: Category; enabled: boolean }[] = response?.preferences ?? [];
        const next: PrefsState = { ...DEFAULT_STATE };
        for (const row of list) {
          if (row.category in next) {
            next[row.category] = row.enabled;
          }
        }
        setPrefs(next);
      } catch (error) {
        console.error("Error fetching notification preferences:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [apiUtil]);

  const updatePref = async (category: Category, value: boolean) => {
    const prior = prefs[category];
    setPrefs((s) => ({ ...s, [category]: value }));
    try {
      await apiUtil.put("/user/notification-prefs", { category, enabled: value });
    } catch (error) {
      console.error("Error updating notification preference:", error);
      setPrefs((s) => ({ ...s, [category]: prior }));
      BrandedAlert.alert("Couldn't update", "We couldn't save that change. Try again in a moment.");
    }
  };

  // Group categories by their section so the layout reads as a few
  // tidy panels instead of a flat wall of switches.
  const sections = CATEGORY_META.reduce<Record<string, typeof CATEGORY_META>>((acc, item) => {
    (acc[item.sectionTitle] ||= []).push(item);
    return acc;
  }, {});

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={profileStyles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={profileStyles.headerTitle}>Notifications</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={AppColors.secondaryDarkGreen} accessibilityLabel="Loading" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}
        >
          {Object.entries(sections).map(([sectionTitle, items]) => (
            <View style={styles.section} key={sectionTitle}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>
              <View style={styles.menuContainer}>
                {items.map((item, idx) => (
                  <View
                    style={[
                      styles.settingItem,
                      idx === items.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    key={item.key}
                  >
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>{item.title}</Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                    <Switch
                      value={prefs[item.key]}
                      onValueChange={(value) => updatePref(item.key, value)}
                      trackColor={{
                        false: AppColors.secondaryDarkGreen + "30",
                        true: AppColors.secondaryDarkGreen,
                      }}
                      thumbColor={prefs[item.key] ? AppColors.primaryLightGreen : AppColors.basicWhite}
                      ios_backgroundColor={AppColors.secondaryDarkGreen + "30"}
                      style={styles.switch}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              You can mute notifications for a specific ride from inside that ride's chat.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: width * 0.051,
    paddingBottom: height * 0.15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
