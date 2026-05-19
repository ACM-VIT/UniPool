import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Platform, KeyboardAvoidingView, TouchableOpacity, Text, ScrollView, TextInput, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { SignUpScreenProps } from "./SignUpScreen.types";
import { useApi } from "../../utils/ApiUtil";
import styles from "./SignUpScreen.styles";
import AppColors from "../../design_systems/colors";
import BrandedAlert from "../../components/BrandedAlert";

type FieldKey = "phone" | "yob" | null;

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { apiUtil } = useApi();
  const insets = useSafeAreaInsets();
  const returnTo = route?.params?.returnTo;

  const [contactNumber, setContactNumber] = useState("");
  const [yob, setYob] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<FieldKey>(null);

  const isValid = useMemo(() => {
    if (!/^\d{10}$/.test(contactNumber)) return false;
    const yn = parseInt(yob, 10);
    if (isNaN(yn) || yn < 1900 || yn > new Date().getFullYear()) return false;
    if (!gender) return false;
    return true;
  }, [contactNumber, yob, gender]);

  const handleProfileCompletion = async () => {
    if (!isValid || loading) return;
    try {
      setLoading(true);
      const yobNum = parseInt(yob, 10);
      await apiUtil.post("/user", {
        contact_number: contactNumber,
        gender,
        yob: yobNum,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: "LocationPermissionScreen", params: { returnTo } }],
      });
    } catch (error: any) {
      setLoading(false);
      if (error?.message === "AUTHENTICATION_REDIRECT") {
        BrandedAlert.alert("Let's get you back in", "Sign in again to continue.", [
          { text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: "AuthScreen", params: { returnTo } }] }) },
        ]);
        return;
      }
      if (
        error?.response?.status === 409 ||
        (error?.response?.data?.message && error.response.data.message.includes("already exists"))
      ) {
        navigation.reset({ index: 0, routes: [{ name: "LocationPermissionScreen", params: { returnTo } }] });
        return;
      }
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving your profile. Try again?";
      BrandedAlert.alert("Couldn't save your profile", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLightGreen} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)}
              activeOpacity={0.7}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M15 6 L 9 12 L 15 18" stroke={AppColors.secondaryDarkGreen} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 2 of 2</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroBlock}>
            <Text style={styles.headline}>One last thing.</Text>
            <Text style={styles.subhead}>
              We need a few details so drivers can reach you and we can keep the community safe.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={[styles.inputWrap, focused === "phone" && styles.inputWrapFocused]}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={(t) => setContactNumber(t.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="98765 43210"
              placeholderTextColor="rgba(38,59,51,0.30)"
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
            />
          </View>
          <Text style={styles.helper}>10-digit Indian number. Shared only with co-riders you book with.</Text>

          <Text style={styles.fieldLabel}>Year of birth</Text>
          <View style={[styles.inputWrap, focused === "yob" && styles.inputWrapFocused]}>
            <TextInput
              style={styles.input}
              value={yob}
              onChangeText={(t) => setYob(t.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="YYYY"
              placeholderTextColor="rgba(38,59,51,0.30)"
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

          <View style={{ height: 32 }} />
        </ScrollView>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isValid || loading) && styles.primaryBtnDisabled]}
            onPress={handleProfileCompletion}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Setting up…" : "Complete profile"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.privacyNote}>
            We never share your data without your permission.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
