import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import AppColors from "../design_systems/colors";
import BrandedAlert from "./BrandedAlert";
import SheetShell, { sheetUi } from "./SheetShell";
import { haptic } from "./PressableScale";
import { useApi } from "../utils/ApiUtil";

type PickedInstitute = {
  id: string;
  name: string;
  country?: string;
  domains: string[];
};

type VerifyStep = "pick" | "email" | "code";

export type VerifyAcademicSheetProps = {
  visible: boolean;
  /** Used as a default for the email field (e.g. the user's Firebase
   *  sign-in email). Has no effect on validation. */
  defaultEmail?: string;
  /** Lets the consumer suppress dismissal during steps where they
   *  want the user to commit (rare). Defaults to true. */
  dismissible?: boolean;
  onDismiss: () => void;
  /** Fires with the updated user row on successful verification. The
   *  shape is whatever /user/verify/confirm returns. */
  onVerified: (user: any) => void;
};

/**
 * Three-step academic-status verification:
 *   1) pick university (typeahead /institutes/search)
 *   2) enter the institute email at one of that uni's domains
 *   3) enter the 6-digit code from the email (or just tap the
 *      magic-link, which the app's VerifyDeepLinkHandler picks up)
 *
 * Step state carries between back-steps so the user doesn't lose
 * typed input. The backend mints both a 6-digit code AND a single-
 * use magic-link token per challenge; this UI exposes only the
 * code path explicitly. The link path is invisible until tapped.
 */
const VerifyAcademicSheet: React.FC<VerifyAcademicSheetProps> = ({
  visible,
  defaultEmail = "",
  dismissible = true,
  onDismiss,
  onVerified,
}) => {
  const { apiUtil } = useApi();
  const [step, setStep] = useState<VerifyStep>("pick");
  const [picked, setPicked] = useState<PickedInstitute | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PickedInstitute[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Server enforces a 45s cooldown on /verify/start. Mirrored here
  // so the resend button reads as obviously inactionable instead of
  // letting users retry into a 429.
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (visible) {
      setStep("pick");
      setPicked(null);
      setSearchQuery("");
      setSearchResults([]);
      setEmail(defaultEmail);
      setCode("");
      setResendIn(0);
    }
  }, [visible, defaultEmail]);

  // Resend countdown tick.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Debounced typeahead. 250ms keeps the picker responsive while
  // saving the backend from one request per keystroke.
  useEffect(() => {
    if (step !== "pick") return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const resp = await apiUtil.get<{ institutes: PickedInstitute[] }>(
          `/institutes/search?q=${encodeURIComponent(q)}`,
        );
        setSearchResults(resp?.institutes ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, step, apiUtil]);

  const pickInstitute = (inst: PickedInstitute) => {
    haptic("selection");
    setPicked(inst);
    const local = email.split("@")[0] || "";
    if (inst.domains.length > 0) {
      setEmail(`${local}@${inst.domains[0]}`);
    }
    setStep("email");
  };

  const sendCode = async () => {
    const target = email.trim().toLowerCase();
    // The institute-picker prefills `@<domain>` so the user only has
    // to type the local part. If they tap Send before typing
    // anything, `target` ends up `@<domain>` — passes the includes("@")
    // check but is invalid. Explicitly require a non-empty local part.
    // SES rejects empty-local emails with a cryptic "Missing local
    // name" cascade we don't want surfacing to the user.
    const atIdx = target.indexOf("@");
    if (atIdx <= 0 || atIdx === target.length - 1) {
      BrandedAlert.alert(
        "Invalid email",
        "Type the part before the @ — for example yourname@vitstudent.ac.in.",
      );
      return;
    }
    if (picked && picked.domains.length > 0) {
      const domain = target.split("@")[1] || "";
      if (!picked.domains.includes(domain)) {
        BrandedAlert.alert(
          "Email doesn’t match this university",
          `Use an address ending with ${picked.domains.map((d) => `@${d}`).join(" or ")}.`,
        );
        return;
      }
    }
    setBusy(true);
    try {
      await apiUtil.post<{ status: string; expires_in: number }, { email: string }>(
        "/user/verify/start",
        { email: target },
      );
      haptic("success");
      setStep("code");
      setCode("");
      setResendIn(45);
    } catch (err: any) {
      haptic("error");
      const data = err?.response?.data;
      if (err?.response?.status === 429 && typeof data?.retry_after === "number") {
        setResendIn(data.retry_after);
        setStep("code");
        return;
      }
      BrandedAlert.alert(
        "Couldn't send the code",
        data?.error || "Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    const target = email.trim().toLowerCase();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      BrandedAlert.alert("Enter the full code", "The verification code is 6 digits long.");
      return;
    }
    setBusy(true);
    try {
      const resp = await apiUtil.post<{ status: string; user?: any }, { email: string; code: string }>(
        "/user/verify/confirm",
        { email: target, code: digits },
      );
      if (resp?.user) onVerified(resp.user);
      haptic("success");
      onDismiss();
    } catch (err: any) {
      // Self-healing fallback for the common "network blip after the
      // server already processed" case. The verify-confirm endpoint
      // is fast server-side (~50ms), but on a slow client connection
      // the response can be lost while the row already got marked
      // verified. Re-fetch /user/details before alerting — if the
      // user is now verified, treat the apparent failure as success
      // and dismiss the sheet quietly. Otherwise surface the alert.
      const status = err?.response?.status;
      // 4xx errors (wrong code / expired / cooldown) are real — show
      // them immediately, don't waste a round-trip checking.
      if (status && status >= 400 && status < 500) {
        haptic("error");
        BrandedAlert.alert(
          err?.response?.data?.error?.includes("code") ? "Wrong code" : "Couldn't verify",
          err?.response?.data?.error || "Try again in a moment.",
        );
        setBusy(false);
        return;
      }
      try {
        const me = await apiUtil.getUncached<{ user?: { is_email_verified?: boolean } }>("/user/details");
        if (me?.user?.is_email_verified) {
          if (me.user) onVerified(me.user);
          haptic("success");
          onDismiss();
          return;
        }
      } catch {
        // Re-check itself failed — fall through to the original alert.
      }
      haptic("error");
      BrandedAlert.alert(
        "Couldn't verify",
        err?.response?.data?.error || "Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetShell visible={visible} onDismiss={onDismiss} busy={busy} dismissible={dismissible}>
      {step === "pick" ? (
        <>
          <Text style={sheetUi.sheetTitle}>Pick your university</Text>

          <View style={sheetUi.inputWrap}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="University name or email domain"
              placeholderTextColor={AppColors.inkMuted}
              // Universities are usually proper nouns OR lowercase email
              // domains — disabling auto-capitalisation lets users type
              // "vitstudent" or "iitb" without the system uppercasing
              // the first letter and breaking the match.
              autoCapitalize="none"
              autoCorrect={false}
              style={sheetUi.input}
              autoFocus
            />
          </View>

          <View style={styles.resultsWrap}>
            {searchQuery.trim().length < 2 ? null
            : searching ? (
              <SearchSkeleton />
            ) : searchResults.length === 0 ? (
              <Text style={styles.resultsHint}>
                No matches. Try the full school name or your email's
                domain (the part after the @).
              </Text>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.resultsScroll}
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map((inst) => (
                  <TouchableOpacity
                    key={inst.id}
                    style={styles.resultRow}
                    activeOpacity={0.7}
                    onPress={() => pickInstitute(inst)}
                  >
                    <Text style={styles.resultName} numberOfLines={2}>
                      {inst.name}
                    </Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {[inst.country, inst.domains.slice(0, 2).map((d) => `@${d}`).join(" · ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      ) : step === "email" ? (
        <>
          <Text style={sheetUi.sheetTitle}>Your student email</Text>
          <View style={styles.institutePill}>
            <Text style={styles.institutePillText} numberOfLines={1}>
              {picked?.name}
            </Text>
          </View>

          <View style={sheetUi.inputWrap}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={picked?.domains?.[0] ? `you@${picked.domains[0]}` : "you@university.edu"}
              placeholderTextColor={AppColors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={sheetUi.input}
              maxLength={120}
              editable={!busy}
              autoFocus
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={sendCode}
            style={[sheetUi.primaryBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={AppColors.primaryLightGreen} accessibilityLabel="Loading" />
            ) : (
              <Text style={sheetUi.primaryBtnText}>Send verification link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={busy}
            onPress={() => setStep("pick")}
            style={sheetUi.linkBtn}
          >
            <Text style={sheetUi.linkBtnText}>Change university</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={sheetUi.sheetTitle}>Check your inbox</Text>
          <Text style={sheetUi.sheetBody}>
            Sent to{" "}
            <Text style={{ color: AppColors.secondaryDarkGreen, fontFamily: "NunitoSans_800ExtraBold" }}>
              {email}
            </Text>
            .
          </Text>

          <View style={sheetUi.inputWrap}>
            <Text style={sheetUi.inputLabel}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={AppColors.inkMuted}
              keyboardType="number-pad"
              style={[sheetUi.input, sheetUi.inputCode]}
              maxLength={6}
              editable={!busy}
              autoFocus
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy || code.length !== 6}
            onPress={submitCode}
            style={[sheetUi.primaryBtn, (busy || code.length !== 6) && { opacity: 0.4 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={AppColors.primaryLightGreen} accessibilityLabel="Loading" />
            ) : (
              <Text style={sheetUi.primaryBtnText}>Verify with code</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={busy}
              onPress={() => setStep("email")}
              style={sheetUi.linkBtn}
            >
              <Text style={sheetUi.linkBtnText}>Change email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={busy || resendIn > 0}
              onPress={sendCode}
              style={sheetUi.linkBtn}
            >
              <Text style={[sheetUi.linkBtnText, resendIn > 0 && { opacity: 0.4 }]}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SheetShell>
  );
};

/**
 * Skeleton placeholder for the university search while the debounced
 * request is in flight. Looks like four institute rows with their
 * name + meta bars greyed out and softly pulsing — the layout
 * matches the results that are about to render, so the panel
 * doesn't jump when data lands.
 */
const SearchSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  // Vary widths per row so the skeleton doesn't read as a single
  // repeating bar — looks more like real institute names of
  // different lengths.
  const rows = ["78%", "62%", "84%", "55%"];

  return (
    <View style={skeletonStyles.container}>
      {rows.map((w, i) => (
        <View key={i} style={skeletonStyles.row}>
          <Animated.View
            style={[skeletonStyles.nameBar, { width: w as any, opacity }]}
          />
          <Animated.View style={[skeletonStyles.metaBar, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

const skeletonStyles = {
  container: {
    flex: 1,
    backgroundColor: "rgba(38,59,51,0.03)",
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(38,59,51,0.06)",
  },
  nameBar: {
    height: 14,
    borderRadius: 6,
    backgroundColor: "rgba(38,59,51,0.16)",
    marginBottom: 8,
  },
  metaBar: {
    height: 10,
    width: "42%" as any,
    borderRadius: 5,
    backgroundColor: "rgba(38,59,51,0.10)",
  },
};

export default VerifyAcademicSheet;

const styles = {
  resultsWrap: {
    // Fixed-height stage so the sheet stays a stable size as the
    // results stream in / out — without it, the keyboard, the layout
    // and the user's eye all shift each time results land. The
    // Android keyboard-clip bug that this height once contributed to
    // is now handled by SheetShell capping itself to the actual
    // KeyboardAvoidingView height (post-codex rewrite), so it's safe
    // to keep this reservation again.
    marginBottom: 12,
    height: 320,
  },
  resultsScroll: {
    flex: 1,
    backgroundColor: "rgba(38,59,51,0.03)",
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  resultsHint: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    paddingHorizontal: 4,
    lineHeight: 19,
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(38,59,51,0.06)",
  },
  resultName: {
    fontFamily: "NunitoSans_700Bold" as const,
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  resultMeta: {
    fontFamily: "NunitoSans_400Regular" as const,
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginTop: 3,
  },
  institutePill: {
    alignSelf: "flex-start" as const,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 14,
  },
  institutePillText: {
    fontFamily: "NunitoSans_800ExtraBold" as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
};
