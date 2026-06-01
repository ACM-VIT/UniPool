// Web variant of the sign-up / complete-profile step.
//
// New users reach this after the Google popup (AuthScreen.web sends them
// here on a 404 from /user/details). It collects the same profile fields
// the mobile screen does: a contact number (combined into E.164), and an
// optional gender and year of birth. On success it posts to /user and
// continues to where the user was headed, or home. Student-email
// verification happens later in the profile, same as on mobile.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import Reveal from "../../components/web/Reveal";
import { useApi } from "../../utils/ApiUtil";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder, floatShadow } from "../../components/web/theme";

const GENDERS = ["Male", "Female"];
const CURRENT_YEAR = new Date().getFullYear();

const SignUpScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const params = useDecodedLocalSearchParams<{ returnTo?: { screen: string; params?: any } }>();

  const [dial, setDial] = useState("91");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [yob, setYob] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const dialDigits = useMemo(() => dial.replace(/\D/g, ""), [dial]);
  const phoneValid = useMemo(() => {
    const total = dialDigits.length + phoneDigits.length;
    return phoneDigits.length >= 6 && total >= 8 && total <= 15;
  }, [dialDigits, phoneDigits]);
  const yobValid = useMemo(() => {
    if (!yob.trim()) return true; // optional
    const n = parseInt(yob, 10);
    return /^\d{4}$/.test(yob.trim()) && n >= 1900 && n <= CURRENT_YEAR;
  }, [yob]);
  const canSubmit = phoneValid && yobValid && !loading;

  const goAfter = () => {
    if (params.returnTo && params.returnTo.screen) {
      router.replace(targetHref(params.returnTo as any));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const payload: { contact_number: string; gender?: string; yob?: number } = {
      contact_number: `+${dialDigits}${phoneDigits}`,
    };
    if (gender) payload.gender = gender;
    if (yob.trim()) payload.yob = parseInt(yob, 10);
    try {
      await apiUtil.post("/user", payload);
      goAfter();
    } catch (err: any) {
      // A 409 means the profile already exists; that is success here.
      if (err?.response?.status === 409) {
        goAfter();
        return;
      }
      setError(err?.response?.data?.message || "Could not save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoggingOut(true);
    try {
      await GoogleSignin.signOut();
    } catch {
      // Not signed in with Google; carry on.
    }
    try {
      await signOut(getAuth());
    } catch {
      // Already signed out.
    }
    router.replace(appHref("AuthScreen", { returnTo: params.returnTo } as any));
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.brandTop} onPress={logOut} disabled={loggingOut}>
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>UniPool</Text>
      </Pressable>
      <Pressable style={styles.logout} onPress={logOut} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? "Signing out" : "Log out"}</Text>
      </Pressable>

      <Reveal style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>Almost there</Text>
          <Text style={styles.subtitle}>A few details so hosts and riders know who they are travelling with.</Text>

          <Text style={styles.label}>Contact number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.dialField}>
              <Text style={styles.dialPlus}>+</Text>
              <TextInput
                style={styles.dialInput}
                value={dial}
                onChangeText={(t) => setDial(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="numeric"
                accessibilityLabel="Country code"
              />
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
              placeholder="Phone number"
              placeholderTextColor={WEB.inkMuted}
              keyboardType="numeric"
            />
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Gender <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => {
              const on = gender === g;
              return (
                <Pressable key={g} style={[styles.chip, on && styles.chipOn]} onPress={() => setGender(on ? null : g)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Year of birth <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={yob}
            onChangeText={(t) => setYob(t.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="e.g. 2005"
            placeholderTextColor={WEB.inkMuted}
            keyboardType="numeric"
          />
          {!yobValid ? <Text style={styles.error}>Enter a valid 4 digit year.</Text> : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.submit, !canSubmit && styles.submitDisabled]} onPress={submit} disabled={!canSubmit}>
            {loading ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.submitText}>Complete profile</Text>}
          </Pressable>
          <Text style={styles.note}>You can verify your student email later from your profile.</Text>
        </View>
      </Reveal>
    </View>
  );
};

export default SignUpScreenWeb;

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: "100vh" as unknown as number, alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", backgroundColor: WEB.page },
  brandTop: { position: "absolute", top: 24, left: 28, flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: WEB.lime, borderWidth: 2.5, borderColor: WEB.forest },
  brandText: { fontFamily: FONT.display, fontSize: 21, color: WEB.forest, letterSpacing: -0.3 },
  logout: { position: "absolute", top: 22, right: 28, paddingVertical: 9, paddingHorizontal: 16, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: "rgba(38,59,51,0.2)" },
  logoutText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.forest },

  center: { width: "100%", alignItems: "center" },
  card: { width: "100%", maxWidth: 440, backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 32, ...cardBorder, ...floatShadow },
  title: { fontFamily: FONT.display, fontSize: 26, color: WEB.forest, letterSpacing: -0.6 },
  subtitle: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 22, color: WEB.inkStrong, marginTop: 10, marginBottom: 24 },

  label: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkStrong, marginBottom: 8, letterSpacing: 0.2 },
  optional: { fontFamily: FONT.semibold, color: WEB.inkMuted, textTransform: "none", letterSpacing: 0 },
  phoneRow: { flexDirection: "row", gap: 10 },
  dialField: { flexDirection: "row", alignItems: "center", backgroundColor: WEB.fieldFill, borderRadius: RADIUS.field, paddingHorizontal: 14, height: 52, gap: 2 },
  dialPlus: { fontFamily: FONT.bold, fontSize: 16, color: WEB.forest },
  dialInput: { width: 40, fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, outlineStyle: "none" as any },
  phoneInput: { flex: 1, height: 52, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16, fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, outlineStyle: "none" as any },
  input: { height: 52, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16, fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, outlineStyle: "none" as any },

  chipRow: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, height: 48, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  chipOn: { backgroundColor: WEB.lime, borderColor: WEB.forest },
  chipText: { fontFamily: FONT.black, fontSize: 15, color: WEB.inkStrong },
  chipTextOn: { color: WEB.forest },

  error: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 10 },
  submit: { marginTop: 22, backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 56, alignItems: "center", justifyContent: "center" },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: FONT.black, fontSize: 16, color: WEB.lime },
  note: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 18, color: WEB.inkMuted, marginTop: 14, textAlign: "center" },
});
