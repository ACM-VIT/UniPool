// Web variant of the profile screen. Reads from the shared UserContext
// (no new fetches) and links out to the detail screens. Quiet surfaces:
// a white profile header and a white list with hairline-divided rows on
// the cream page. Forest is ink + the avatar fallback + the CTA only.
import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import WebShell from "../../components/web/WebShell";
import { useUser } from "../../contexts/UserContext";
import { useAuthGate } from "../../contexts/AuthGate";
import { appHref } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "../../components/web/theme";

const ICONS: Record<string, React.ReactNode> = {
  person: (
    <>
      <Path d="M12 12 a4 4 0 1 0 0-8 4 4 0 0 0 0 8 Z" stroke={WEB.forest} strokeWidth={2} />
      <Path d="M5 20 C 5 16, 8 14.5, 12 14.5 C 16 14.5, 19 16, 19 20" stroke={WEB.forest} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  trips: (
    <>
      <Path d="M4 17 V7 a1 1 0 0 1 1-1 h14 a1 1 0 0 1 1 1 v10 M3 17 h18" stroke={WEB.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 17 a1.4 1.4 0 1 0 0.01 0 M16.5 17 a1.4 1.4 0 1 0 0.01 0" stroke={WEB.forest} strokeWidth={2} />
    </>
  ),
  settings: (
    <>
      <Path d="M12 15 a3 3 0 1 0 0-6 3 3 0 0 0 0 6 Z" stroke={WEB.forest} strokeWidth={2} />
      <Path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M5 5 l2 2 M17 17 l2 2 M19 5 l-2 2 M7 17 l-2 2" stroke={WEB.forest} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
};

const Row: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void; last?: boolean }> = ({ icon, label, onPress, last }) => (
  <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
    <View style={styles.rowIcon}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">{icon}</Svg>
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6 L15 12 L9 18" stroke={WEB.inkMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </Pressable>
);

const ProfileScreenWeb: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { isGuest } = useAuthGate();

  const handleSignOut = async () => {
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
    router.replace(appHref("HomeScreen"));
  };

  if (isGuest || !user) {
    return (
      <WebShell active="ProfileScreen">
        <View style={styles.guest}>
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Sign in to see your profile</Text>
            <Text style={styles.guestBody}>Your rides, ratings, and account settings live here once you sign in.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(appHref("AuthScreen"))}>
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </WebShell>
    );
  }

  const initial = (user.name || "U").trim().charAt(0).toUpperCase();

  return (
    <WebShell active="ProfileScreen">
      <View style={styles.wrap}>
        <View style={styles.headerCard}>
          {user.profile_picture_url ? (
            <Image source={{ uri: user.profile_picture_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
              {user.is_email_verified ? (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
            {user.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
            {user.institute_name ? <Text style={styles.institute} numberOfLines={1}>{user.institute_name}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Row icon={ICONS.person} label="Personal information" onPress={() => router.push(appHref("PersonalInformationScreen"))} />
          <Row icon={ICONS.trips} label="Your trips" onPress={() => router.push(appHref("TripsListScreen"))} />
          <Row icon={ICONS.settings} label="Settings" onPress={() => router.push(appHref("AccountSettingsScreen"))} last />
        </View>

        <Pressable style={styles.signOut} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </WebShell>
  );
};

export default ProfileScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 560, alignSelf: "center", paddingTop: 36, paddingBottom: 56 },
  guest: { alignItems: "center", paddingVertical: 72 },
  guestCard: { alignItems: "center", gap: 12, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, maxWidth: 460, ...cardBorder },
  guestTitle: { fontFamily: FONT.display, fontSize: 22, color: WEB.forest, textAlign: "center" },
  guestBody: { fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.inkMuted, marginBottom: 8, textAlign: "center", lineHeight: 21 },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 26, paddingVertical: 13, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: WEB.surface,
    borderRadius: RADIUS.card,
    padding: 24,
    ...cardBorder,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: FONT.black, fontSize: 26, color: WEB.lime },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontFamily: FONT.display, fontSize: 23, color: WEB.forest, letterSpacing: -0.4 },
  verifiedPill: { backgroundColor: WEB.lime, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill },
  verifiedText: { fontFamily: FONT.black, fontSize: 10.5, color: WEB.forest },
  email: { fontFamily: FONT.semibold, fontSize: 14, color: WEB.inkStrong, marginTop: 6 },
  institute: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted, marginTop: 2 },

  section: { marginTop: 14, backgroundColor: WEB.surface, borderRadius: RADIUS.card, overflow: "hidden", ...cardBorder },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 17 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.hairline },
  rowIcon: { width: 22, alignItems: "center" },
  rowLabel: { flex: 1, fontFamily: FONT.bold, fontSize: 15, color: WEB.forest },

  signOut: { marginTop: 18, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 4 },
  signOutText: { fontFamily: FONT.black, fontSize: 15, color: WEB.orange },
});
