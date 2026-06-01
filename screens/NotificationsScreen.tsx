import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Switch, ActivityIndicator } from "react-native";
import { TouchableOpacity, ScrollView } from "react-native";
import ChevronBack from "../components/ChevronBack/ChevronBack";
import BrandInfo from "../components/BrandInfo/BrandInfo";
import AppColors from "../design_systems/colors";
import { useApi } from "../utils/ApiUtil";
import { useRouter } from "expo-router";
import BrandedAlert from "../components/BrandedAlert";
import profileStyles from "./ProfileScreen/ProfileScreen.styles";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../utils/responsive";
import { useThemeColors } from "../contexts/ThemeContext";

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
  const { back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const { apiUtil } = useApi();
  const colors = useThemeColors();
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
    <View style={[profileStyles.container, { backgroundColor: colors.background }]}>
      <View style={profileStyles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={profileStyles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[profileStyles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.textPrimary} accessibilityLabel="Loading" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}
        >
          {Object.entries(sections).map(([sectionTitle, items]) => (
            <View style={styles.section} key={sectionTitle}>
              <Text style={[styles.sectionTitle, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>{sectionTitle}</Text>
              <View style={[
                styles.menuContainer,
                colors.mode === "dark" && { backgroundColor: colors.surface, borderColor: colors.inkSubtle },
              ]}>
                {items.map((item, idx) => (
                  <View
                    style={[
                      styles.settingItem,
                      colors.mode === "dark" && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle },
                      idx === items.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    key={item.key}
                  >
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingTitle, colors.mode === "dark" && { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.settingDescription, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>{item.description}</Text>
                    </View>
                    <Switch
                      value={prefs[item.key]}
                      onValueChange={(value) => updatePref(item.key, value)}
                      trackColor={{
                        false: colors.inkSoft,
                        true: colors.primary,
                      }}
                      thumbColor={prefs[item.key]
                        ? (colors.mode === "dark" ? colors.textOnAccent : AppColors.basicWhite)
                        : (colors.mode === "dark" ? colors.surfaceElevated : AppColors.basicWhite)}
                      ios_backgroundColor={colors.inkSoft}
                      style={styles.switch}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={[styles.infoSection, colors.mode === "dark" && { backgroundColor: colors.surfaceInset }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
    // Quiet mile-marker above each card — matches the Profile / Home
    // section titles (14pt forest @ 0.7), not an oversized headline.
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: height * 0.01,
    marginLeft: 2,
    letterSpacing: -0.05,
    opacity: 0.7,
  },
  menuContainer: {
    // Forest card floating on the lime canvas — matches the Profile /
    // Account Settings menu cards. Was a lime card on the lime
    // background, so it vanished into the canvas behind a hairline.
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: width * 0.04,
    marginBottom: height * 0.03,
    overflow: "hidden",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.045,
    paddingVertical: height * 0.018,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderBottomWidth: 1,
    // Light hairline between rows on the forest card — matches the
    // Profile menu row separators.
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  settingTextContainer: {
    flex: 1,
    marginRight: width * 0.051,
  },
  settingTitle: {
    fontSize: width * 0.042,
    fontWeight: "600",
    color: AppColors.basicWhite,
    marginBottom: height * 0.005,
    fontFamily: "NunitoSans_600SemiBold",
  },
  settingDescription: {
    fontSize: width * 0.034,
    // Soft lime secondary text on the forest card — the app's standard
    // "secondary on forest" pairing (cf. Profile stat labels).
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_400Regular",
    opacity: 0.7,
    lineHeight: width * 0.046,
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
