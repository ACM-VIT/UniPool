import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/haptics";
import PressableScale from "../components/PressableScale";
import SkeletonBlock from "../components/Skeleton";
import KeyboardAwareScreen from "../components/KeyboardAwareScreen";
import { useDecodedLocalSearchParams } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";
import { displayRideLocation } from "../utils/LocationService";

type RatingTarget = {
  user_id: string;
  name: string;
  profile_picture_url?: string;
  role: "host" | "passenger";
};

type Eligibility = {
  ride_id: string;
  start_time: string;
  start_location: string;
  end_location: string;
  eligible: boolean;
  opens_at: string;
  targets: RatingTarget[];
};

type Draft = {
  stars: number;
  comment: string;
};

/**
 * Post-trip rating screen. Opens after the backend marks a trip eligible and
 * renders one compact card for each person the viewer can rate.
 */
const PostTripRatingScreen: React.FC = () => {
  const { back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const insets = useSafeAreaInsets();
  const { apiUtil } = useApi();
  const params = useDecodedLocalSearchParams<{ rideId?: string }>();
  const rideId = params.rideId || "";
  const colors = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFocusedOnceRef = useRef(false);

  const loadEligibility = useCallback(() => {
    if (!rideId) {
      setError("Missing ride id.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiUtil.getUncached<Eligibility>(`/ride/${rideId}/rating-eligibility`);
        if (cancelled) return;
        setEligibility(resp);
        setDrafts((current) => {
          const next: Record<string, Draft> = {};
          for (const t of resp?.targets || []) {
            next[t.user_id] = current[t.user_id] ?? { stars: 0, comment: "" };
          }
          return next;
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error || "Couldn't load your trip.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUtil, rideId]);

  useEffect(() => {
    return loadEligibility();
  }, [loadEligibility]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      return loadEligibility();
    }, [loadEligibility]),
  );

  const allRated = useMemo(() => {
    const targets = eligibility?.targets || [];
    if (targets.length === 0) return false;
    return targets.every((t) => (drafts[t.user_id]?.stars || 0) > 0);
  }, [drafts, eligibility]);

  const submit = async () => {
    if (!eligibility?.targets?.length || submitting) return;
    if (!allRated) {
      BrandedAlert.alert(
        "Tap a star for each person",
        "Just one tap per row — the comment's optional.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const ratings = eligibility.targets.map((t) => ({
        rated_user_id: t.user_id,
        stars: drafts[t.user_id]?.stars || 0,
        comment: drafts[t.user_id]?.comment?.trim() || "",
      }));
      await apiUtil.post(`/ride/${rideId}/rate`, { ratings });
      haptic("success");
      back();
    } catch (err: any) {
      haptic("error");
      BrandedAlert.alert(
        "Couldn't save",
        err?.response?.data?.error || "Try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      // Skeleton outlines the heading + a rating card so the screen settles in place.
      <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
        <View style={[styles.scrollContent, { paddingTop: insets.top + 4 }]}>
          <SkeletonBlock width="70%" height={28} radius={8} style={{ marginTop: 4 }} />
          <SkeletonBlock width="55%" height={14} radius={6} style={{ marginTop: 12, marginBottom: 22 }} />
          <View style={[styles.card, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <SkeletonBlock width={44} height={44} radius={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBlock width="60%" height={17} radius={6} />
                <SkeletonBlock width="40%" height={12} radius={6} style={{ marginTop: 6 }} />
              </View>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <SkeletonBlock key={n} width={36} height={36} radius={8} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (error || !eligibility) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Nothing to rate here</Text>
        <Text style={[styles.body, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }, { textAlign: "center", marginTop: 8 }]}>
          {error || "This trip isn't open for ratings yet."}
        </Text>
        <PressableScale
          style={[
            styles.primaryBtn,
            {
              // Match the app's primary CTA contrast in each theme.
              backgroundColor: colors.mode === "dark" ? colors.primary : colors.navFill,
              marginTop: 24,
            },
          ]}
          haptic={null}
          onPress={() => back()}
        >
          <Text style={[styles.primaryBtnText, { color: colors.mode === "dark" ? colors.textOnAccent : colors.navIconInactive }]}>Got it</Text>
        </PressableScale>
      </View>
    );
  }

  if (!eligibility.eligible || eligibility.targets.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>All set</Text>
        <Text style={[styles.body, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }, { textAlign: "center", marginTop: 8 }]}>
          {new Date(eligibility.opens_at) > new Date()
            ? `Ratings open ${formatRelativeFromNow(eligibility.opens_at)}.`
            : "You've already rated everyone on this trip."}
        </Text>
        {/* Stretch inside the centered empty state while capping tablet width. */}
        <PressableScale
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.mode === "dark" ? colors.primary : colors.navFill,
              marginTop: 24,
              alignSelf: "stretch",
              maxWidth: 360,
              paddingHorizontal: 32,
            },
          ]}
          haptic={null}
          onPress={() => back()}
        >
          <Text style={[styles.primaryBtnText, { color: colors.mode === "dark" ? colors.textOnAccent : colors.navIconInactive }]}>Done</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
      <KeyboardAwareScreen
        contentContainerStyle={[
          styles.scrollContent,
          // Keep a small cushion above the modal content plus the safe area.
          { paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        {/* Toolbar row: title left, close action right. */}
        <View style={styles.topRow}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>How was the ride?</Text>
          <PressableScale
            onPress={() => back()}
            haptic={null}
            style={[styles.closeBtn, { backgroundColor: colors.inkSubtle }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close"
          >
            <Svg width={14} height={14} viewBox="0 0 16 16">
              <Path d="M3 3 L 13 13 M13 3 L 3 13" stroke={colors.textPrimary} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </PressableScale>
        </View>

        <Text style={[styles.routeLine, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]} numberOfLines={2}>
          {displayRideLocation(eligibility.start_location)} to {displayRideLocation(eligibility.end_location)}
        </Text>

        {eligibility.targets.map((target) => (
          <RatingCard
            key={target.user_id}
            target={target}
            draft={drafts[target.user_id] || { stars: 0, comment: "" }}
            onChange={(next) =>
              setDrafts((d) => ({ ...d, [target.user_id]: next }))
            }
          />
        ))}

        {/* Submit stays inside the scroll body so the keyboard cannot cover it. */}
        <PressableScale
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.mode === "dark" ? colors.primary : colors.navFill },
            styles.submitInline,
            (!allRated || submitting) && styles.primaryBtnDisabled,
          ]}
          haptic="medium"
          disabled={!allRated || submitting}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.mode === "dark" ? colors.textOnAccent : colors.navIconInactive} accessibilityLabel="Loading" />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.mode === "dark" ? colors.textOnAccent : colors.navIconInactive }]}>Submit</Text>
          )}
        </PressableScale>
      </KeyboardAwareScreen>
    </View>
  );
};

export default PostTripRatingScreen;

// RatingCard renders one rateable person with stars and an optional comment.

type RatingCardProps = {
  target: RatingTarget;
  draft: Draft;
  onChange: (next: Draft) => void;
};

const RatingCard: React.FC<RatingCardProps> = ({ target, draft, onChange }) => {
  const colors = useThemeColors();
  const setStars = (n: number) => {
    // Selection feedback — picking a star is a discrete choice, not a tap.
    haptic("selection");
    onChange({ ...draft, stars: n });
  };

  return (
    <View style={[styles.card, colors.mode === "dark" && { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        {target.profile_picture_url ? (
          <Image source={{ uri: target.profile_picture_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.navFill }]}>
            <Text style={[styles.avatarInitial, { color: colors.navIconInactive }]}>
              {(target.name?.[0] || "?").toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {target.name}
          </Text>
          <Text style={[styles.cardRole, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
            {target.role === "host" ? "Your host" : "Rode with you"}
          </Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarTap key={n} active={draft.stars >= n} onPress={() => setStars(n)} />
        ))}
      </View>

      {draft.stars > 0 ? (
        <TextInput
          style={[styles.commentInput, { color: colors.textPrimary }, colors.mode === "dark" && { backgroundColor: colors.surfaceInset }]}
          value={draft.comment}
          onChangeText={(t) => onChange({ ...draft, comment: t })}
          placeholder="Optional: one quick line (240 chars)"
          placeholderTextColor={colors.textTertiary}
          maxLength={240}
          multiline
        />
      ) : null}
    </View>
  );
};

const StarTap: React.FC<{ active: boolean; onPress: () => void }> = ({ active, onPress }) => {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(active ? 1 : 0.85)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0.85,
      friction: 5,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [active, scale]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2 L 14.6 8.5 L 21.5 9.1 L 16.3 13.6 L 17.9 20.4 L 12 16.8 L 6.1 20.4 L 7.7 13.6 L 2.5 9.1 L 9.4 8.5 Z"
            fill={active ? colors.textPrimary : "transparent"}
            stroke={colors.textPrimary}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
};

const formatRelativeFromNow = (iso: string): string => {
  try {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "soon";
    const hours = Math.round(ms / (1000 * 60 * 60));
    if (hours < 1) return "in less than an hour";
    if (hours < 24) return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.round(hours / 24);
    return `in about ${days} day${days === 1 ? "" : "s"}`;
  } catch {
    return "soon";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  center: { alignItems: "center", justifyContent: "center" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // routeLine owns the vertical gap below the toolbar.
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(38,59,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    letterSpacing: -0.6,
    color: AppColors.secondaryDarkGreen,
  },
  body: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    lineHeight: 21,
  },
  routeLine: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    marginTop: 6,
    marginBottom: 22,
  },
  card: {
    backgroundColor: AppColors.basicWhite,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 18,
    color: AppColors.primaryLightGreen,
  },
  cardName: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
  },
  cardRole: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    marginTop: 2,
  },
  starsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  commentInput: {
    marginTop: 14,
    backgroundColor: "rgba(38,59,51,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_600SemiBold",
    minHeight: 44,
    maxHeight: 110,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  // Inline submit spacing matches the rating-card rhythm.
  submitInline: {
    marginTop: 6,
    alignSelf: "stretch",
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnDisabled: {
    backgroundColor: "rgba(38,59,51,0.45)",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },
});
