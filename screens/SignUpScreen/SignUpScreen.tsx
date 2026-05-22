import React, { useMemo, useState } from "react";
import {
  View,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  StatusBar,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useApi } from "../../utils/ApiUtil";
import styles from "./SignUpScreen.styles";
import AppColors from "../../design_systems/colors";
import BrandedAlert from "../../components/BrandedAlert";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import type { AppRouteTarget } from "../../navigation/routes";
import { Country, DEFAULT_COUNTRY, flagFor } from "../../data/countries";
import CountryPicker from "../../components/CountryPicker";
import VerifyAcademicSheet from "../../components/VerifyAcademicSheet";
import { shouldShowPermissionsPrompt } from "../../utils/permissionsPrompt";

type FieldKey = "phone" | "yob" | null;

type VerifiedUser = {
  is_email_verified?: boolean;
  institute?: { name?: string } | null;
  institute_email?: string;
};

const SignUpScreen: React.FC = () => {
  const { apiUtil } = useApi();
  const router = useRouter();
  const routeParams = useDecodedLocalSearchParams<{
    newUser?: any;
    returnTo?: AppRouteTarget;
  }>();
  const returnTo = routeParams.returnTo;

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [contactNumber, setContactNumber] = useState("");
  const [yob, setYob] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<FieldKey>(null);

  // Has the user posted to /user yet? Verify-academic-status needs
  // the backend row to exist (the middleware sets c.Locals("user")
  // only for known users), so we create the row on the first tap of
  // "Verify university" if it hasn't happened yet. Tracking this
  // also lets the primary CTA flip from "Complete profile" to
  // "Continue" once the work is done.
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [verifiedInstitute, setVerifiedInstitute] = useState<string | null>(null);

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const insets = useSafeAreaInsets();

  // Block hardware back — they need to either complete or log out.
  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  const handleLogout = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await signOut(getAuth());
      try {
        await GoogleSignin.signOut();
      } catch {
        // Google may not be the active provider.
      }
      router.replace(appHref("AuthScreen", { returnTo }));
    } catch (error: any) {
      BrandedAlert.alert("Couldn't log out", error?.message || "Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const phoneDigits = contactNumber.replace(/\D/g, "");
  // E.164: country dial + local digits, total 8-15. Min local of 6
  // digits keeps obviously-wrong numbers (1, 12) from validating.
  const phoneE164Length = country.dial.length + phoneDigits.length;
  const phoneValid =
    phoneDigits.length >= 6 && phoneE164Length >= 8 && phoneE164Length <= 15;

  const isValid = useMemo(() => {
    if (!phoneValid) return false;
    const yn = parseInt(yob, 10);
    if (isNaN(yn) || yn < 1900 || yn > new Date().getFullYear()) return false;
    if (!gender) return false;
    return true;
  }, [phoneValid, yob, gender]);

  // Submit /user once. Idempotent against re-tapping: if the user
  // row already exists, the backend returns 409 which we treat as
  // success.
  const submitProfile = async (): Promise<boolean> => {
    if (profileSubmitted) return true;
    const yobNum = parseInt(yob, 10);
    const e164 = `+${country.dial}${phoneDigits}`;
    try {
      await apiUtil.post("/user", {
        contact_number: e164,
        gender,
        yob: yobNum,
      });
      setProfileSubmitted(true);
      return true;
    } catch (error: any) {
      if (
        error?.response?.status === 409 ||
        (error?.response?.data?.message &&
          error.response.data.message.includes("already exists"))
      ) {
        setProfileSubmitted(true);
        return true;
      }
      if (error?.message === "AUTHENTICATION_REDIRECT") {
        BrandedAlert.alert("Let's get you back in", "Sign in again to continue.", [
          { text: "OK", onPress: () => router.replace(appHref("AuthScreen", { returnTo })) },
        ]);
        return false;
      }
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving your profile. Try again?";
      BrandedAlert.alert("Couldn't save your profile", errorMessage);
      return false;
    }
  };

  const handleComplete = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    const ok = await submitProfile();
    setLoading(false);
    if (ok) {
      let needsPermissionsStep = true;
      try {
        needsPermissionsStep = await shouldShowPermissionsPrompt();
      } catch (e) {
        console.warn("Permissions preflight failed; showing permission screen", e);
      }
      if (needsPermissionsStep) {
        router.replace(appHref("LocationPermissionScreen", { returnTo }));
      } else {
        router.replace(returnTo ? targetHref(returnTo) : appHref("HomeScreen"));
      }
    }
  };

  const handleVerifyTap = async () => {
    // Verify requires the basics + the user row in DB. If validation
    // is incomplete, point them at the missing fields first.
    if (!isValid) {
      BrandedAlert.alert(
        "Fill the basics first",
        "Add your phone, year of birth, and gender so we can finish setting up your account.",
      );
      return;
    }
    if (loading) return;
    setLoading(true);
    const ok = await submitProfile();
    setLoading(false);
    if (!ok) return;
    setVerifyOpen(true);
  };

  const handleVerified = (user: VerifiedUser) => {
    if (user?.is_email_verified) {
      setVerifiedInstitute(user.institute?.name || user.institute_email || "Verified");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLightGreen} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 12) + 4 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroBlock}>
            <View style={styles.headlineRow}>
              <Text style={styles.headline}>One last thing.</Text>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.75}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M10 7V5.8C10 4.8 10.8 4 11.8 4h5.4C18.2 4 19 4.8 19 5.8v12.4c0 1-.8 1.8-1.8 1.8h-5.4c-1 0-1.8-.8-1.8-1.8V17" stroke={AppColors.primaryLightGreen} strokeWidth={2} strokeLinecap="round" />
                  <Path d="M14 12H4m0 0 3.5-3.5M4 12l3.5 3.5" stroke={AppColors.primaryLightGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
            <Text style={styles.subhead}>
              We need a few details so we can connect you with other users.
            </Text>
          </View>

          {/* Phone number with country picker — left side opens the
              CountryPicker bottom sheet, right side is the local
              number. We send +{dial}{local} as E.164 on submit. */}
          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={[styles.inputWrap, focused === "phone" && styles.inputWrapFocused]}>
            <TouchableOpacity
              style={styles.countryBtn}
              onPress={() => setCountryPickerOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Country code, currently ${country.name}`}
            >
              <Text style={styles.countryFlag}>{flagFor(country.code)}</Text>
              <Text style={styles.countryDial}>+{country.dial}</Text>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke={AppColors.primaryLightGreen}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <View style={styles.countryDivider} />
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={(t) => setContactNumber(t.replace(/[^\d\s\-()]/g, ""))}
              keyboardType="phone-pad"
              maxLength={20}
              placeholder="98765 43210"
              placeholderTextColor="rgba(181,215,80,0.40)"
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={styles.fieldLabel}>Year of birth</Text>
          <View style={[styles.inputWrap, focused === "yob" && styles.inputWrapFocused]}>
            <TextInput
              style={styles.input}
              value={yob}
              onChangeText={(t) => setYob(t.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="YYYY"
              placeholderTextColor="rgba(181,215,80,0.40)"
              onFocus={() => setFocused("yob")}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {["Male", "Female"].map((g) => {
              const selected = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, selected && styles.genderChipSelected]}
                  activeOpacity={0.8}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional academic verify — silently posts the profile if
              not yet done, then opens the verify sheet. Once
              verified, the button flips to a lime "done" state with
              the institute name. */}
          <Text style={styles.fieldLabel}>
            Academic status <Text style={styles.fieldLabelMuted}>(Optional)</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              verifiedInstitute ? styles.verifyBtnDone : null,
            ]}
            activeOpacity={verifiedInstitute ? 1 : 0.85}
            disabled={!!verifiedInstitute || loading}
            onPress={handleVerifyTap}
          >
            <Text
              style={[
                styles.verifyBtnText,
                verifiedInstitute ? styles.verifyBtnTextDone : null,
              ]}
              numberOfLines={1}
            >
              {verifiedInstitute
                ? `Verified · ${verifiedInstitute}`
                : "Verify your university"}
            </Text>
            {verifiedInstitute ? (
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12.5 L 10 17.5 L 19 6.5"
                  stroke={AppColors.secondaryDarkGreen}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 6 L 15 12 L 9 18"
                  stroke={AppColors.primaryLightGreen}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isValid || loading) && styles.primaryBtnDisabled]}
            onPress={handleComplete}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={AppColors.primaryLightGreen} accessibilityLabel="Loading" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {profileSubmitted ? "Continue" : "Complete profile"}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.privacyNote}>
            We never share your data without your permission.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={countryPickerOpen}
        selectedCode={country.code}
        onSelect={(c) => setCountry(c)}
        onDismiss={() => setCountryPickerOpen(false)}
      />

      <VerifyAcademicSheet
        visible={verifyOpen}
        onDismiss={() => setVerifyOpen(false)}
        onVerified={handleVerified}
      />
    </View>
  );
};

export default SignUpScreen;
