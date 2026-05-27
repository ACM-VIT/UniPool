import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/PressableScale";
import { appHref, useDecodedLocalSearchParams } from "../navigation/routes";
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
 * Post-trip rating screen. Surfaces ~12h after a trip's scheduled
 * start, either via FCM tap or the in-app prompt. One card per
 * person you can rate (host carries up to N passengers, passenger
 * sees a single host card). Tap a star, optionally drop a quick
 * comment, slam Submit. ~5-second flow.
 *
 * Why it's stripped down: every rating UI I've used that asks for
 * a paragraph of feedback gets blank submissions; a five-tap-stars
 * UI gets a 5x higher response rate. Comment stays as an opt-in
 * sliver.
 */
const PostTripRatingScreen: React.FC = () => {
  const router = useRouter();
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
      router.back();
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
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textPrimary} accessibilityLabel="Loading" />
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
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.navFill, marginTop: 24 }]}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Text style={[styles.primaryBtnText, { color: colors.navIconInactive }]}>Got it</Text>
        </TouchableOpacity>
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
        {/* alignSelf: "stretch" overrides the centered parent's
            shrink-to-content default so the button reads as a real
            CTA pill (~full-width minus the screen padding) instead
            of the pinched odd-shaped thing it was. minWidth +
            paddingHorizontal cap it on iPad so it doesn't stretch
            to 700pt and look like a banner. */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.navFill,
              marginTop: 24,
              alignSelf: "stretch",
              maxWidth: 360,
              paddingHorizontal: 32,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Text style={[styles.primaryBtnText, { color: colors.navIconInactive }]}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
      <KeyboardAvoidingView
        // `padding` on both platforms — the previous Android
        // `height` setting shrank the KAV but kept the Submit
        // button parked below the keyboard. Padding pushes the
        // entire content above the keyboard instead.
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // iOS modal presentation already gives the sheet a top
            // inset (the rounded-corner gap above the content), so
            // adding the full safe-area inset on top of that was
            // doubling the padding and parking the close button +
            // heading way too far down. Just a small fixed cushion
            // on top of whatever inset the system already provided.
            { paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title + close on one row. Previously the X sat on its
              own row at flex-end with the title underneath, which
              parked the heading further from the top than it needed
              to be and disconnected the two visually. Now they read
              as one toolbar: title left, close right. */}
          <View style={styles.topRow}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>How was the ride?</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={[styles.closeBtn, { backgroundColor: colors.inkSubtle }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close"
            >
              <Svg width={14} height={14} viewBox="0 0 16 16">
                <Path d="M3 3 L 13 13 M13 3 L 3 13" stroke={colors.textPrimary} strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
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

          {/* Submit lives inside the ScrollView (not as a sticky
              footer outside the KAV) so the keyboard physically
              can't hide it — the scroll content shifts up with the
              keyboard, the user scrolls one nudge if needed, the
              button is right there. The previous sticky-footer
              setup looked clean when the keyboard was closed but
              broke the moment the comment field took focus. */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.navFill },
              styles.submitInline,
              (!allRated || submitting) && styles.primaryBtnDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!allRated || submitting}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.navIconInactive} accessibilityLabel="Loading" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.navIconInactive }]}>Submit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PostTripRatingScreen;

// --------------------------------------------------------------------
// RatingCard — one row per target. Star row with animated tap-in,
// avatar/name header, optional inline comment that reveals on first
// star tap so the unrated state stays minimal.
// --------------------------------------------------------------------

type RatingCardProps = {
  target: RatingTarget;
  draft: Draft;
  onChange: (next: Draft) => void;
};

const RatingCard: React.FC<RatingCardProps> = ({ target, draft, onChange }) => {
  const colors = useThemeColors();
  const setStars = (n: number) => {
    haptic("light");
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
    // Title + close on one row — see the JSX comment. No
    // marginBottom: the routeLine below has its own marginTop, so
    // we don't double-pad the gap.
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
  // Inline submit (lives inside ScrollView, not as a sticky footer)
  // — see the JSX comment. marginTop matches the spacing between
  // RatingCard rows so the button reads as the next item in the
  // sequence rather than a detached overlay.
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
