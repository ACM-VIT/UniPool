// Web variant of the sign-up / complete-profile step — the new-user flow,
// matching the mobile "One last thing." screen.
//
// New users reach this after Google sign-in (AuthScreen.web sends them here
// on a 404 from /user/details). It collects the same details mobile does:
//   - a contact number, with a real country picker (flag + searchable list),
//     combined into E.164 on submit;
//   - optional gender and year of birth;
//   - an optional "Verify your university" academic step (student email +
//     6-digit code), the same email→code flow the web profile uses.
// On submit it posts to /user and continues where the user was headed.
//
// Verifying needs the backend user row to exist first (the middleware only
// sets the user context for known users), so the first tap of either
// "Verify" or "Complete profile" posts the profile; a 409 means it already
// exists and is treated as success.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import Reveal from "../../components/web/Reveal";
import { useApi } from "../../utils/ApiUtil";
import { appHref, targetHref, useDecodedLocalSearchParams } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder, floatShadow } from "../../components/web/theme";
import { COUNTRIES, Country, DEFAULT_COUNTRY, flagFor } from "../../data/countries";

const GENDERS = ["Male", "Female"];
const CURRENT_YEAR = new Date().getFullYear();

type VerifiedUser = { institute?: { name?: string } | null; institute_email?: string };

const Chevron = ({ open }: { open?: boolean }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d={open ? "M6 15 L12 9 L18 15" : "M6 9 L12 15 L18 9"} stroke={WEB.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Check = ({ color = WEB.forest }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5 L10 17.5 L19 6.5" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SignUpScreenWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const params = useDecodedLocalSearchParams<{ returnTo?: { screen: string; params?: any } }>();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [yob, setYob] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The user row is created on the first "Verify" or "Complete profile" tap.
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [profileSavedSignature, setProfileSavedSignature] = useState<string | null>(null);

  // Optional academic verification: idle → email → code → verified.
  const [vStep, setVStep] = useState<"idle" | "email" | "code">("idle");
  const [vEmail, setVEmail] = useState("");
  const [vCode, setVCode] = useState("");
  const [vBusy, setVBusy] = useState(false);
  const [vErr, setVErr] = useState<string | null>(null);
  const [verifiedInstitute, setVerifiedInstitute] = useState<string | null>(null);

  const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = useMemo(() => {
    const total = country.dial.replace(/\D/g, "").length + phoneDigits.length;
    return phoneDigits.length >= 6 && total >= 8 && total <= 15;
  }, [country, phoneDigits]);
  const yobValid = useMemo(() => {
    if (!yob.trim()) return true;
    const n = parseInt(yob, 10);
    return /^\d{4}$/.test(yob.trim()) && n >= 1900 && n <= CURRENT_YEAR;
  }, [yob]);
  const canSubmit = phoneValid && yobValid && !loading;

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, "");
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || (digits.length > 0 && c.dial.includes(digits)));
  }, [countryQuery]);

  const goAfter = () => {
    if (params.returnTo && params.returnTo.screen) {
      router.replace(targetHref(params.returnTo as any));
    } else {
      router.replace(appHref("HomeScreen"));
    }
  };

  const e164Phone = () => `+${country.dial.replace(/\D/g, "")}${phoneDigits}`;
  const profileSignature = () => `${e164Phone()}|${gender ?? ""}|${yob.trim()}`;

  const createProfilePayload = () => {
    const y = yob.trim();
    const payload: { contact_number: string; gender?: string; yob?: number } = {
      contact_number: e164Phone(),
    };
    if (gender) payload.gender = gender;
    if (y) payload.yob = parseInt(y, 10);
    return payload;
  };

  const patchProfilePayload = () => {
    const y = yob.trim();
    return {
      contact_number: e164Phone(),
      gender: gender ?? "",
      yob: y ? parseInt(y, 10) : 0,
    };
  };

  const patchProfile = async (signature: string): Promise<boolean> => {
    try {
      await apiUtil.patch<{ user?: unknown; status?: string }, ReturnType<typeof patchProfilePayload>>("/user/profile", patchProfilePayload());
      setProfileSavedSignature(signature);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Could not save your profile. Please try again.");
      return false;
    }
  };

  // POST /user once. If this session already created the row, PATCH any
  // edits made after the optional university verification step.
  const ensureProfile = async (): Promise<boolean> => {
    const signature = profileSignature();
    if (profileSubmitted) {
      if (profileSavedSignature === signature) return true;
      return patchProfile(signature);
    }
    try {
      await apiUtil.post("/user", createProfilePayload());
      setProfileSubmitted(true);
      setProfileSavedSignature(signature);
      return true;
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setProfileSubmitted(true);
        return patchProfile(signature);
      }
      setError(err?.response?.data?.message || "Could not save your profile. Please try again.");
      return false;
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const ok = await ensureProfile();
    setLoading(false);
    if (ok) goAfter();
  };

  // Optional verify — needs the phone basics + the user row first.
  const startVerify = async () => {
    if (!phoneValid) {
      setError("Add your phone number first so we can finish setting up your account.");
      return;
    }
    if (!yobValid) {
      setError("Enter a valid 4 digit year before verifying.");
      return;
    }
    setLoading(true);
    setError(null);
    const ok = await ensureProfile();
    setLoading(false);
    if (ok) setVStep("email");
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
      const resp = await apiUtil.post<{ status: string; user?: VerifiedUser }, { email: string; code: string }>("/user/verify/confirm", { email: vEmail.trim(), code: vCode.trim() });
      setVerifiedInstitute(resp?.user?.institute?.name || resp?.user?.institute_email || vEmail.trim());
      setVStep("idle");
    } catch {
      setVErr("That code did not match. Check it and try again.");
    } finally {
      setVBusy(false);
    }
  };

  const logOut = async () => {
    setLoggingOut(true);
    try { await GoogleSignin.signOut(); } catch {}
    try { await signOut(getAuth()); } catch {}
    router.replace(appHref("AuthScreen", { returnTo: params.returnTo } as any));
  };

  const pickCountry = (c: Country) => {
    setCountry(c);
    setCountryOpen(false);
    setCountryQuery("");
  };

  return (
    <View style={styles.root}>
      <Text style={styles.brandText}>UniPool</Text>
      <Pressable style={styles.logout} onPress={logOut} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? "Signing out" : "Log out"}</Text>
      </Pressable>

      <Reveal style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>One last thing.</Text>
          <Text style={styles.subtitle}>We need a few details so we can connect you with other students.</Text>

          {/* Contact number — country picker + local number */}
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.phoneStack}>
            <View style={styles.phoneRow}>
              <Pressable style={styles.dialField} onPress={() => setCountryOpen((o) => !o)}>
                <Text style={styles.dialFlag}>{flagFor(country.code)}</Text>
                <Text style={styles.dialPlus}>+{country.dial}</Text>
                <Chevron open={countryOpen} />
              </Pressable>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                placeholder="98765 43210"
                placeholderTextColor={WEB.inkMuted}
                keyboardType="numeric"
                onFocus={() => setCountryOpen(false)}
              />
            </View>

            {countryOpen ? (
              <View style={styles.countryMenu}>
                <TextInput
                  style={styles.countrySearch}
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  placeholder="Search country or code"
                  placeholderTextColor={WEB.inkMuted}
                  autoFocus
                />
                <ScrollView style={styles.countryScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {filteredCountries.map((c) => {
                    const on = c.code === country.code;
                    return (
                      <Pressable key={c.code} style={({ hovered }: any) => [styles.countryRow, hovered && styles.countryRowHover, on && styles.countryRowOn]} onPress={() => pickCountry(c)}>
                        <Text style={styles.countryFlag}>{flagFor(c.code)}</Text>
                        <Text style={styles.countryName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.countryDial}>+{c.dial}</Text>
                      </Pressable>
                    );
                  })}
                  {filteredCountries.length === 0 ? <Text style={styles.countryEmpty}>No match</Text> : null}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Gender — optional */}
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

          {/* Year of birth — optional */}
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

          {/* Academic status — optional verification */}
          <Text style={[styles.label, { marginTop: 18 }]}>Academic status <Text style={styles.optional}>(optional)</Text></Text>
          {verifiedInstitute ? (
            <View style={[styles.verifyBtn, styles.verifyBtnDone]}>
              <Text style={styles.verifyDoneText} numberOfLines={1}>Verified · {verifiedInstitute}</Text>
              <Check color={WEB.forest} />
            </View>
          ) : vStep === "idle" ? (
            <Pressable style={({ hovered }: any) => [styles.verifyBtn, hovered && styles.verifyBtnHover]} onPress={startVerify} disabled={loading}>
              <Text style={styles.verifyText}>Verify your university</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M9 6 L15 12 L9 18" stroke={WEB.forest} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
          ) : (
            <View style={styles.verifyPanel}>
              <Text style={styles.verifyHint}>
                {vStep === "email" ? "Enter your university email — we'll send a 6-digit code." : `Enter the code we sent to ${vEmail || "your email"}.`}
              </Text>
              {vStep === "email" ? (
                <TextInput
                  style={styles.input}
                  value={vEmail}
                  onChangeText={setVEmail}
                  placeholder="you@university.edu"
                  placeholderTextColor={WEB.inkMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              ) : (
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={vCode}
                  onChangeText={(t) => setVCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={WEB.inkMuted}
                  keyboardType="numeric"
                  autoFocus
                />
              )}
              {vErr ? <Text style={styles.error}>{vErr}</Text> : null}
              <View style={styles.verifyActions}>
                <Pressable style={styles.verifyGhost} onPress={() => { setVStep("idle"); setVErr(null); setVCode(""); }} disabled={vBusy}>
                  <Text style={styles.verifyGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.verifyGo, vBusy && styles.submitDisabled]} onPress={vStep === "email" ? sendCode : confirmCode} disabled={vBusy}>
                  {vBusy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.verifyGoText}>{vStep === "email" ? "Send code" : "Verify"}</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.submit, !canSubmit && styles.submitDisabled]} onPress={submit} disabled={!canSubmit}>
            {loading ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.submitText}>{profileSubmitted ? "Continue" : "Complete profile"}</Text>}
          </Pressable>
          <Text style={styles.note}>We never share your data without your permission.</Text>
        </View>
      </Reveal>
    </View>
  );
};

export default SignUpScreenWeb;

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: "100vh" as unknown as number, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: WEB.page },
  brandText: { position: "absolute", top: 26, left: 28, fontFamily: FONT.black, fontSize: 21, color: WEB.forest, letterSpacing: -0.5 },
  logout: { position: "absolute", top: 22, right: 28, paddingVertical: 9, paddingHorizontal: 16, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: "rgba(38,59,51,0.2)" },
  logoutText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.forest },

  center: { width: "100%", alignItems: "center" },
  card: { width: "100%", maxWidth: 440, backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 32, ...cardBorder, ...floatShadow },
  title: { fontFamily: FONT.displayBlack, fontSize: 28, color: WEB.forest, letterSpacing: -0.8 },
  subtitle: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 22, color: WEB.inkStrong, marginTop: 10, marginBottom: 24 },

  label: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkStrong, marginBottom: 8, letterSpacing: 0.2 },
  optional: { fontFamily: FONT.semibold, color: WEB.inkMuted, textTransform: "none", letterSpacing: 0 },

  // Phone row + country picker
  phoneStack: { position: "relative", zIndex: 30 },
  phoneRow: { flexDirection: "row", gap: 10 },
  dialField: { flexDirection: "row", alignItems: "center", backgroundColor: WEB.fieldFill, borderRadius: RADIUS.field, paddingHorizontal: 14, height: 52, gap: 7 },
  dialFlag: { fontSize: 18 },
  dialPlus: { fontFamily: FONT.bold, fontSize: 16, color: WEB.forest },
  phoneInput: { flex: 1, height: 52, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16, fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, outlineStyle: "none" as any },
  countryMenu: { position: "absolute", top: 58, left: 0, right: 0, backgroundColor: WEB.surface, borderRadius: RADIUS.field, overflow: "hidden", ...cardBorder, ...floatShadow, zIndex: 40 },
  countrySearch: { height: 46, paddingHorizontal: 16, fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.forest, backgroundColor: WEB.fieldFill, outlineStyle: "none" as any },
  countryScroll: { maxHeight: 220 },
  countryRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16, paddingVertical: 11 },
  countryRowHover: { backgroundColor: WEB.fieldFill },
  countryRowOn: { backgroundColor: WEB.fieldFill },
  countryFlag: { fontSize: 18 },
  countryName: { flex: 1, fontFamily: FONT.semibold, fontSize: 14.5, color: WEB.forest },
  countryDial: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkMuted },
  countryEmpty: { fontFamily: FONT.semibold, fontSize: 14, color: WEB.inkMuted, padding: 16 },

  input: { height: 52, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16, fontFamily: FONT.bold, fontSize: 16, color: WEB.forest, outlineStyle: "none" as any },
  codeInput: { letterSpacing: 8, textAlign: "center" },

  chipRow: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, height: 48, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  chipOn: { backgroundColor: WEB.lime, borderColor: WEB.forest },
  chipText: { fontFamily: FONT.black, fontSize: 15, color: WEB.inkStrong },
  chipTextOn: { color: WEB.forest },

  // Academic verify
  verifyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, borderRadius: RADIUS.field, backgroundColor: WEB.fieldFill, paddingHorizontal: 16 },
  verifyBtnHover: { backgroundColor: "#F0EEDF" },
  verifyText: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.forest },
  verifyBtnDone: { backgroundColor: WEB.lime },
  verifyDoneText: { flex: 1, fontFamily: FONT.black, fontSize: 14.5, color: WEB.forest },
  verifyPanel: { backgroundColor: WEB.fieldFill, borderRadius: RADIUS.field, padding: 14, gap: 12 },
  verifyHint: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 19, color: WEB.inkStrong },
  verifyActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  verifyGhost: { height: 44, paddingHorizontal: 18, borderRadius: RADIUS.button, alignItems: "center", justifyContent: "center" },
  verifyGhostText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkMuted },
  verifyGo: { height: 44, paddingHorizontal: 22, borderRadius: RADIUS.button, backgroundColor: WEB.forest, alignItems: "center", justifyContent: "center", minWidth: 110 },
  verifyGoText: { fontFamily: FONT.black, fontSize: 14, color: WEB.lime },

  error: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.orange, marginTop: 10 },
  submit: { marginTop: 22, backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 56, alignItems: "center", justifyContent: "center" },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: FONT.black, fontSize: 16, color: WEB.lime },
  note: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 18, color: WEB.inkMuted, marginTop: 14, textAlign: "center" },
});
