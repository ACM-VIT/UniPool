// Web variant of Account Settings. Links into the other account screens
// and the legal pages, and handles account deletion (DELETE /user/delete)
// with an inline confirmation, mirroring the mobile flow. Push
// notification settings are native only and are omitted on the web.
import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "../components/web/theme";

const Chevron = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6 L15 12 L9 18" stroke={WEB.inkMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Row: React.FC<{ label: string; onPress: () => void; last?: boolean }> = ({ label, onPress, last }) => (
  <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Chevron />
  </Pressable>
);

const AccountSettingsScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest } = useAuthGate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiUtil.delete("/user/delete");
      try {
        await AsyncStorage.multiRemove(["unipool_start_address", "defaultAddress", "lastUserVerification"]);
      } catch {
        // Storage may be empty on the web; ignore.
      }
      try {
        await GoogleSignin.signOut();
      } catch {}
      try {
        await signOut(getAuth());
      } catch {}
      router.replace(appHref("AuthScreen"));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not delete your account. Try again.");
      setDeleting(false);
    }
  };

  if (isGuest) {
    return (
      <WebShell active="ProfileScreen">
        <View style={styles.guest}>
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Sign in to manage your account</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("AuthScreen"))}>
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell active="ProfileScreen">
      <View style={styles.wrap}>
        <Pressable style={styles.backLink} onPress={() => router.push(appHref("ProfileScreen"))}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5 L8 12 L15 19" stroke={WEB.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.backLinkText}>Profile</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Row label="Personal information" onPress={() => router.push(appHref("PersonalInformationScreen"))} />
          <Row label="Your trips" onPress={() => router.push(appHref("TripsListScreen"))} last />
        </View>

        <View style={styles.section}>
          <Row label="Terms of Service" onPress={() => router.push(appHref("TermsOfServiceScreen"))} />
          <Row label="Privacy Policy" onPress={() => router.push(appHref("PrivacyPolicyScreen"))} last />
        </View>

        <View style={styles.dangerCard}>
          {!confirming ? (
            <Pressable style={styles.dangerRow} onPress={() => setConfirming(true)}>
              <Text style={styles.dangerLabel}>Delete my account</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Delete your account?</Text>
              <Text style={styles.confirmBody}>This permanently removes your account, rides, and data. It cannot be undone.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.confirmActions}>
                <Pressable style={styles.deleteBtn} onPress={deleteAccount} disabled={deleting}>
                  {deleting ? <ActivityIndicator color={WEB.cream} /> : <Text style={styles.deleteBtnText}>Delete forever</Text>}
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => { setConfirming(false); setError(null); }} disabled={deleting}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </WebShell>
  );
};

export default AccountSettingsScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingTop: 24, paddingBottom: 56 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backLinkText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkStrong },
  title: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6, marginBottom: 20 },

  guest: { alignItems: "center", paddingVertical: 80 },
  guestCard: { alignItems: "center", gap: 16, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, maxWidth: 420, ...cardBorder },
  guestTitle: { fontFamily: FONT.display, fontSize: 22, color: WEB.forest, textAlign: "center" },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  section: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 14, ...cardBorder },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 17 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  rowLabel: { fontFamily: FONT.bold, fontSize: 15, color: WEB.forest },

  dangerCard: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", ...cardBorder },
  dangerRow: { paddingHorizontal: 20, paddingVertical: 17 },
  dangerLabel: { fontFamily: FONT.black, fontSize: 15.5, color: WEB.orange },
  confirmBox: { padding: 22 },
  confirmTitle: { fontFamily: FONT.black, fontSize: 17, color: WEB.forest, marginBottom: 8 },
  confirmBody: { fontFamily: FONT.semibold, fontSize: 14, lineHeight: 21, color: WEB.inkStrong, marginBottom: 16 },
  confirmActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  deleteBtn: { backgroundColor: WEB.orange, borderRadius: RADIUS.button, height: 48, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  deleteBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.cream },
  cancelBtn: { height: 48, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.inkMuted },
  error: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginBottom: 10 },
});
