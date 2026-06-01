// Web variant of Personal Information.
//
// Reads the account from /user/details, shows the identity fields, lets
// the user set their UPI ID (PATCH /user/profile), and verify their
// student email inline (POST /user/verify/start then /confirm). Reuses
// the same endpoints the mobile screen uses.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import Reveal from "../components/web/Reveal";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "../components/web/theme";

type User = {
  name?: string;
  email?: string;
  contact_number?: string;
  gender?: string;
  upi_vpa?: string;
  is_email_verified?: boolean;
  institute_email?: string;
  institute?: { name?: string } | null;
};

const InfoRow: React.FC<{ label: string; value?: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value || "Not set"}</Text>
  </View>
);

const PersonalInformationScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest } = useAuthGate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [upiEditing, setUpiEditing] = useState(false);
  const [upiDraft, setUpiDraft] = useState("");
  const [upiBusy, setUpiBusy] = useState(false);
  const [upiErr, setUpiErr] = useState<string | null>(null);

  const [vStep, setVStep] = useState<"idle" | "code">("idle");
  const [vEmail, setVEmail] = useState("");
  const [vCode, setVCode] = useState("");
  const [vBusy, setVBusy] = useState(false);
  const [vErr, setVErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = await apiUtil.get<{ user: User }>("/user/details");
      setUser(resp?.user ?? null);
      setUpiDraft(resp?.user?.upi_vpa ?? "");
    } catch (e: any) {
      setError("Could not load your details.");
    } finally {
      setLoading(false);
    }
  }, [apiUtil]);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    void load();
  }, [isGuest, load]);

  const saveUpi = async () => {
    if (upiDraft.trim() && !upiDraft.includes("@")) {
      setUpiErr("Enter a valid UPI ID, like name@bank.");
      return;
    }
    setUpiBusy(true);
    setUpiErr(null);
    try {
      const resp = await apiUtil.patch<{ user: User }>("/user/profile", { upi_vpa: upiDraft.trim() });
      setUser(resp?.user ?? user);
      setUpiEditing(false);
    } catch {
      setUpiErr("Could not save your UPI ID. Try again.");
    } finally {
      setUpiBusy(false);
    }
  };

  const sendCode = async () => {
    if (!vEmail.includes("@")) {
      setVErr("Enter your student email.");
      return;
    }
    setVBusy(true);
    setVErr(null);
    try {
      await apiUtil.post("/user/verify/start", { email: vEmail.trim() });
      setVStep("code");
    } catch (e: any) {
      const retry = e?.response?.data?.retry_after;
      setVErr(retry ? `Please wait ${retry}s before trying again.` : "Could not send the code. Try again.");
    } finally {
      setVBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(vCode.trim())) {
      setVErr("Enter the 6 digit code.");
      return;
    }
    setVBusy(true);
    setVErr(null);
    try {
      const resp = await apiUtil.post<{ status: string; user?: User }>("/user/verify/confirm", { email: vEmail.trim(), code: vCode.trim() });
      setUser((u) => ({ ...(u || {}), is_email_verified: true, institute_email: vEmail.trim(), ...(resp?.user || {}) }));
      setVStep("idle");
    } catch {
      setVErr("That code did not match. Check it and try again.");
    } finally {
      setVBusy(false);
    }
  };

  if (isGuest) {
    return (
      <WebShell active="ProfileScreen">
        <View style={styles.guest}>
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Sign in to view your details</Text>
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

        <Text style={styles.title}>Personal information</Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={WEB.forest} /></View>
        ) : error ? (
          <Text style={styles.errorBig}>{error}</Text>
        ) : (
          <Reveal delay={90}>
            <View style={styles.card}>
              <InfoRow label="Name" value={user?.name} />
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Contact" value={user?.contact_number} />
              <InfoRow label="Gender" value={user?.gender} last />
            </View>

            {/* UPI */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>UPI ID</Text>
                {!upiEditing ? (
                  <Pressable onPress={() => { setUpiEditing(true); setUpiErr(null); }}>
                    <Text style={styles.editLink}>{user?.upi_vpa ? "Edit" : "Add"}</Text>
                  </Pressable>
                ) : null}
              </View>
              {!upiEditing ? (
                <Text style={styles.cardValue}>{user?.upi_vpa || "Add a UPI ID so riders can pay you back."}</Text>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={upiDraft}
                    onChangeText={setUpiDraft}
                    placeholder="name@bank"
                    placeholderTextColor={WEB.inkMuted}
                    autoCapitalize="none"
                  />
                  {upiErr ? <Text style={styles.error}>{upiErr}</Text> : null}
                  <View style={styles.editActions}>
                    <Pressable style={styles.saveBtn} onPress={saveUpi} disabled={upiBusy}>
                      {upiBusy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </Pressable>
                    <Pressable style={styles.cancelBtn} onPress={() => { setUpiEditing(false); setUpiDraft(user?.upi_vpa ?? ""); }}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Student verification */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Student verification</Text>
                {user?.is_email_verified ? (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
              {user?.is_email_verified ? (
                <Text style={styles.cardValue}>{user?.institute?.name || user?.institute_email || "Your student status is verified."}</Text>
              ) : vStep === "idle" ? (
                <>
                  <Text style={styles.cardValue}>Verify your student email so hosts know you are a real student.</Text>
                  <TextInput
                    style={styles.input}
                    value={vEmail}
                    onChangeText={setVEmail}
                    placeholder="you@vitstudent.ac.in"
                    placeholderTextColor={WEB.inkMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {vErr ? <Text style={styles.error}>{vErr}</Text> : null}
                  <Pressable style={styles.saveBtn} onPress={sendCode} disabled={vBusy}>
                    {vBusy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.saveBtnText}>Send code</Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.cardValue}>Enter the 6 digit code we sent to {vEmail}.</Text>
                  <TextInput
                    style={styles.input}
                    value={vCode}
                    onChangeText={(t) => setVCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={WEB.inkMuted}
                    keyboardType="numeric"
                  />
                  {vErr ? <Text style={styles.error}>{vErr}</Text> : null}
                  <View style={styles.editActions}>
                    <Pressable style={styles.saveBtn} onPress={confirmCode} disabled={vBusy}>
                      {vBusy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.saveBtnText}>Verify</Text>}
                    </Pressable>
                    <Pressable style={styles.cancelBtn} onPress={() => { setVStep("idle"); setVCode(""); setVErr(null); }}>
                      <Text style={styles.cancelBtnText}>Change email</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </Reveal>
        )}
      </View>
    </WebShell>
  );
};

export default PersonalInformationScreenWeb;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingTop: 24, paddingBottom: 56 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backLinkText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkStrong },
  title: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6, marginBottom: 20 },

  center: { alignItems: "center", paddingVertical: 80 },
  errorBig: { fontFamily: FONT.semibold, fontSize: 15, color: WEB.orange, paddingVertical: 20 },
  guest: { alignItems: "center", paddingVertical: 80 },
  guestCard: { alignItems: "center", gap: 16, backgroundColor: WEB.surface, borderRadius: RADIUS.card, paddingVertical: 48, paddingHorizontal: 40, maxWidth: 420, ...cardBorder },
  guestTitle: { fontFamily: FONT.display, fontSize: 22, color: WEB.forest, textAlign: "center" },
  primaryBtn: { backgroundColor: WEB.forest, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.button },
  primaryBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },

  card: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 24, marginBottom: 14, ...cardBorder },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontFamily: FONT.black, fontSize: 16, color: WEB.forest },
  cardValue: { fontFamily: FONT.semibold, fontSize: 14.5, lineHeight: 22, color: WEB.inkStrong, marginBottom: 12 },
  editLink: { fontFamily: FONT.black, fontSize: 14, color: WEB.midOlive },

  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: WEB.inkSubtle },
  infoLabel: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkMuted },
  infoValue: { fontFamily: FONT.black, fontSize: 15, color: WEB.forest, maxWidth: "60%" },

  input: { height: 50, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16, fontFamily: FONT.bold, fontSize: 15.5, color: WEB.forest, outlineStyle: "none" as any },
  editActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  saveBtn: { backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 46, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", marginTop: 12 },
  saveBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.lime },
  cancelBtn: { height: 46, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 12 },
  cancelBtnText: { fontFamily: FONT.black, fontSize: 15, color: WEB.inkMuted },
  error: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 8 },
  verifiedPill: { backgroundColor: WEB.lime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  verifiedText: { fontFamily: FONT.black, fontSize: 11, color: WEB.forest },
});
