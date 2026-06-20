import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  ListRenderItem,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo/BrandInfo';
import ChevronBack from '../components/ChevronBack/ChevronBack';
import { useRouter } from "expo-router";
import LoadingComponent from '../components/LoadingComponent';
import AppColors from '../design_systems/colors';
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/haptics";
import PressableScale from "../components/PressableScale";
import EmptyState from "../components/EmptyState";
import SheetShell from "../components/SheetShell";
import { useTabletContentStyle } from "../utils/responsive";
import { useThemeColors } from "../contexts/ThemeContext";

interface User {
  name: string;
  email: string;
  contact_number: string;
  upi_vpa?: string;
  is_email_verified?: boolean;
  institute_email?: string;
  institute?: { name?: string } | null;
  [key: string]: any;
}

interface UserResponse {
  user: User;
}

/**
 * Personal information screen with read-only identity rows plus editable UPI
 * and academic-verification actions.
 */
const PersonalInformationScreen: React.FC = () => {
  const { back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const { apiUtil } = useApi();
  const colors = useThemeColors();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [upiOpen, setUpiOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const fetchUser = React.useCallback(() => {
    return apiUtil.get<UserResponse>('/user/details')
      .then((data: UserResponse) => setUser(data.user))
      .catch((err: any) => {
        if (err?.message === "AUTHENTICATION_REDIRECT") return;
        if (err?.response?.status === 404 &&
            err?.response?.data?.message === "User not found in database, signup required") {
          return;
        }
        setError('Failed to load user info');
      });
  }, [apiUtil]);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const isDark = colors.mode === "dark";

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }, isDark && { backgroundColor: colors.background }]}>
      <LoadingComponent />
    </View>
  );

  const header = (title: string) => (
    <>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>{title}</Text>
        </View>
      </View>
    </>
  );

  if (error) return (
    <View style={[styles.container, tabletContentStyle, isDark && { backgroundColor: colors.background }]}>
      {header('Personal Information')}
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, isDark && { color: colors.destructive }]}>{error}</Text>
      </View>
    </View>
  );

  if (!user) return (
    <View style={[styles.container, isDark && { backgroundColor: colors.background }]}>
      {header('Personal Information')}
      <EmptyState
        title="Nothing here yet"
        body="We couldn't find your profile details. Pull back and sign in again to load them."
      />
    </View>
  );

  const verified = !!user.is_email_verified;

  return (
    <View style={[styles.container, isDark && { backgroundColor: colors.background }]}>
      {header('Personal Information')}

      <View style={styles.newSection}>
        <View style={[styles.menuContainer, isDark && { backgroundColor: colors.surface }]}>
          <View style={[styles.menuItem, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}>
            <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>Name</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }, isDark && { color: colors.textOnDark }]}>{user.name}</Text>
          </View>

          {/* Sign-in email is informational; academic verification lives below. */}
          <View style={[styles.menuItem, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}>
            <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>Email</Text>
            <Text
              style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }, isDark && { color: colors.textOnDark }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.email}
            </Text>
          </View>

          <View style={[styles.menuItem, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}>
            <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>Contact</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }, isDark && { color: colors.textOnDark }]}>{user.contact_number}</Text>
          </View>
          {user.gender ? (
            <View style={[styles.menuItem, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}>
              <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>Gender</Text>
              <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }, isDark && { color: colors.textOnDark }]}>{user.gender}</Text>
            </View>
          ) : null}

          {/* Academic status row: verified school, verified fallback, or CTA. */}
          <PressableScale
            style={[styles.menuItem, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle }]}
            haptic={null}
            disabled={verified}
            onPress={() => {
              if (verified) return;
              haptic('selection');
              setVerifyOpen(true);
            }}
          >
            <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>Institute</Text>
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
              {verified ? (
                <>
                  <Text
                    style={[styles.menuItemText, { textAlign: 'right' }, isDark && { color: colors.textOnDark }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {user.institute?.name || 'Verified'}
                  </Text>
                  <View style={ui.badgeVerified}>
                    <Svg width={10} height={10} viewBox="0 0 12 12">
                      <Path
                        d="M2.2 6.4 L 4.8 9 L 9.8 3.2"
                        stroke={AppColors.secondaryDarkGreen}
                        strokeWidth={2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text style={ui.badgeVerifiedText}>Verified</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.menuItemText,
                      { textAlign: 'right', opacity: 0.55 },
                      isDark && { color: colors.textTertiary, opacity: 1 },
                    ]}
                  >
                    Not verified
                  </Text>
                  <View style={ui.badgeAction}>
                    <Text style={ui.badgeActionText}>Verify academic status</Text>
                  </View>
                </>
              )}
            </View>
          </PressableScale>

          {/* Editable UPI VPA row. */}
          <PressableScale
            style={[
              styles.menuItem,
              { borderBottomWidth: 0 },
              isDark && { backgroundColor: colors.surface, borderBottomColor: colors.inkSubtle },
            ]}
            haptic={null}
            onPress={() => {
              haptic('selection');
              setUpiOpen(true);
            }}
          >
            <Text style={[styles.menuItemText, { flex: 1 }, isDark && { color: colors.textOnDark }]}>UPI ID</Text>
            <Text
              style={[
                styles.menuItemText,
                {
                  flex: 2,
                  textAlign: 'right',
                  opacity: user.upi_vpa ? 1 : 0.55,
                },
                isDark && {
                  opacity: 1,
                  color: user.upi_vpa ? colors.textOnDark : colors.textTertiary,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.upi_vpa || 'Add UPI ID'}
            </Text>
          </PressableScale>
        </View>
      </View>

      <UpiEditSheet
        visible={upiOpen}
        initialValue={user.upi_vpa ?? ''}
        onDismiss={() => setUpiOpen(false)}
        onSaved={(next) => setUser({ ...user, ...next })}
      />

      <VerifyEmailSheet
        visible={verifyOpen}
        defaultEmail={user.email}
        onDismiss={() => setVerifyOpen(false)}
        onVerified={(next) => {
          setUser((u) => (u ? { ...u, ...next } : null));
          // Refetch so the institute relation is populated after verification.
          fetchUser();
        }}
      />
    </View>
  );
};

export default PersonalInformationScreen;

// UPI editor sheet. Calls PATCH /user/profile.

type UpiEditSheetProps = {
  visible: boolean;
  initialValue: string;
  onDismiss: () => void;
  onSaved: (user: Partial<User>) => void;
};

const UpiEditSheet: React.FC<UpiEditSheetProps> = ({ visible, initialValue, onDismiss, onSaved }) => {
  const { apiUtil } = useApi();
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";
  const [draft, setDraft] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setDraft(initialValue);
  }, [visible, initialValue]);

  const save = async () => {
    const next = draft.trim();
    if (next && !next.includes('@')) {
      BrandedAlert.alert('Invalid UPI ID', 'A UPI ID looks like name@bank — for example yash@upi.');
      return;
    }
    setBusy(true);
    try {
      const resp = await apiUtil.patch<UserResponse, { upi_vpa: string }>(
        '/user/profile',
        { upi_vpa: next },
      );
      if (resp?.user) onSaved(resp.user);
      haptic('success');
      onDismiss();
    } catch (err: any) {
      haptic('error');
      BrandedAlert.alert(
        "Couldn't save",
        err?.response?.data?.error || "We hit a snag saving your UPI ID. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetShell visible={visible} onDismiss={onDismiss} busy={busy}>
      <Text style={[ui.sheetTitle, isDark && { color: colors.textPrimary }]}>UPI ID</Text>
      <Text style={[ui.sheetBody, isDark && { color: colors.textSecondary, opacity: 1 }]}>
        Passengers can tap a Pay button after the trip to send your fare via UPI.
        Leave blank to keep collecting cash.
      </Text>

      <View style={ui.inputWrap}>
        <Text style={[ui.inputLabel, isDark && { color: colors.textTertiary, opacity: 1 }]}>Your UPI ID</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="yourname@bank"
          placeholderTextColor={isDark ? colors.textTertiary : AppColors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[ui.input, isDark && { backgroundColor: colors.surfaceInset, borderColor: colors.inkSoft, color: colors.textPrimary }]}
          maxLength={120}
          editable={!busy}
        />
        <Text style={[ui.inputHint, isDark && { color: colors.textTertiary, opacity: 1 }]}>e.g. yash@upi, 9999999999@paytm</Text>
      </View>

      <PressableScale
        haptic="medium"
        disabled={busy}
        onPress={save}
        style={[ui.primaryBtn, isDark && { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={isDark ? colors.textOnAccent : AppColors.primaryLightGreen} accessibilityLabel="Loading" />
        ) : (
          <Text style={[ui.primaryBtnText, isDark && { color: colors.textOnAccent }]}>Save UPI ID</Text>
        )}
      </PressableScale>

      {initialValue ? (
        <PressableScale
          haptic={null}
          disabled={busy}
          onPress={() => {
            setDraft('');
          }}
          style={ui.linkBtn}
        >
          <Text style={[ui.linkBtnText, isDark && { color: colors.textSecondary, opacity: 1 }]}>Clear UPI ID</Text>
        </PressableScale>
      ) : null}
    </SheetShell>
  );
};

// Verify academic status through university search, student email, and code.

type VerifyEmailSheetProps = {
  visible: boolean;
  defaultEmail: string;
  onDismiss: () => void;
  onVerified: (user: Partial<User>) => void;
};

type VerifyStep = 'pick' | 'email' | 'code';

type PickedInstitute = {
  id: string;
  name: string;
  country?: string;
  domains: string[];
};

const VerifyEmailSheet: React.FC<VerifyEmailSheetProps> = ({ visible, defaultEmail, onDismiss, onVerified }) => {
  const { apiUtil } = useApi();
  const colors = useThemeColors();
  const isDark = colors.mode === "dark";
  const [step, setStep] = useState<VerifyStep>('pick');
  const [picked, setPicked] = useState<PickedInstitute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickedInstitute[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Mirror the backend resend cooldown in the button state.
  const [resendIn, setResendIn] = useState(0);

  // Reset every time the sheet re-opens.
  useEffect(() => {
    if (visible) {
      setStep('pick');
      setPicked(null);
      setSearchQuery('');
      setSearchResults([]);
      // Default to the sign-in email; the selected institute can rewrite it.
      setEmail(defaultEmail);
      setCode('');
      setResendIn(0);
    }
  }, [visible, defaultEmail]);

  // Countdown tick.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Debounced university search against /institutes/search.
  useEffect(() => {
    if (step !== 'pick') return;
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

  const pickInstitute = React.useCallback((inst: PickedInstitute) => {
    haptic('selection');
    setPicked(inst);
    // Preserve the local part and attach the selected institute domain.
    const local = email.split('@')[0] || '';
    if (inst.domains.length > 0) {
      setEmail(`${local}@${inst.domains[0]}`);
    }
    setStep('email');
  }, [email]);

  const renderInstituteResult = React.useCallback<ListRenderItem<PickedInstitute>>(
    ({ item: inst }) => (
      <PressableScale
        style={[ui.resultRow, isDark && { borderBottomColor: colors.inkSubtle }]}
        haptic={null}
        onPress={() => pickInstitute(inst)}
      >
        <Text style={[ui.resultName, isDark && { color: colors.textPrimary }]} numberOfLines={2}>
          {inst.name}
        </Text>
        <Text style={[ui.resultMeta, isDark && { color: colors.textTertiary, opacity: 1 }]} numberOfLines={1}>
          {[
            inst.country,
            inst.domains.slice(0, 2).map((d) => `@${d}`).join(' · '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </PressableScale>
    ),
    [pickInstitute, colors, isDark],
  );

  const instituteKeyExtractor = React.useCallback((inst: PickedInstitute) => inst.id, []);

  const sendCode = async () => {
    const target = email.trim().toLowerCase();
    if (!target || !target.includes('@')) {
      BrandedAlert.alert('Invalid email', 'Please enter a complete email address.');
      return;
    }
    if (picked && picked.domains.length > 0) {
      const domain = target.split('@')[1] || '';
      if (!picked.domains.includes(domain)) {
        BrandedAlert.alert(
          'Email doesn’t match this university',
          `Use an address ending with ${picked.domains.map((d) => `@${d}`).join(' or ')}.`,
        );
        return;
      }
    }
    setBusy(true);
    try {
      // Keep verification errors local to this sheet.
      await apiUtil.postSilent<{ status: string; expires_in: number }, { email: string }>(
        '/user/verify/start',
        { email: target },
      );
      haptic('success');
      setStep('code');
      setCode('');
      setResendIn(45);
    } catch (err: any) {
      haptic('error');
      const data = err?.response?.data;
      if (err?.response?.status === 429 && typeof data?.retry_after === 'number') {
        setResendIn(data.retry_after);
        setStep('code');
        return;
      }
      BrandedAlert.alert(
        "Couldn't send the code",
        data?.error || 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    const target = email.trim().toLowerCase();
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      BrandedAlert.alert('Enter the full code', 'The verification code is 6 digits long.');
      return;
    }
    setBusy(true);
    try {
      // Silent for the same reason as /verify/start.
      const resp = await apiUtil.postSilent<{ status: string; user?: User }, { email: string; code: string }>(
        '/user/verify/confirm',
        { email: target, code: digits },
      );
      if (resp?.user) onVerified(resp.user);
      haptic('success');
      onDismiss();
    } catch (err: any) {
      haptic('error');
      BrandedAlert.alert(
        err?.response?.data?.error?.includes('code')
          ? 'Wrong code'
          : "Couldn't verify",
        err?.response?.data?.error || 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetShell visible={visible} onDismiss={onDismiss} busy={busy}>
      {step === 'pick' ? (
        <>
          <Text style={[ui.sheetTitle, isDark && { color: colors.textPrimary }]}>Pick your university</Text>

          <View style={ui.inputWrap}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="University name or domain"
              placeholderTextColor={isDark ? colors.textTertiary : AppColors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[ui.input, isDark && { backgroundColor: colors.surfaceInset, borderColor: colors.inkSoft, color: colors.textPrimary }]}
              autoFocus
            />
          </View>

          {/* Results area collapses until the user enters a searchable query. */}
          <View style={ui.resultsWrap}>
            {searchQuery.trim().length < 2 ? null
            : searching ? (
              <ActivityIndicator size="small" color={isDark ? colors.textPrimary : AppColors.secondaryDarkGreen} style={{ marginTop: 12 }} accessibilityLabel="Loading" />
            ) : searchResults.length === 0 ? (
              <Text style={[ui.resultsHint, isDark && { color: colors.textTertiary, opacity: 1 }]}>
                No matches. Try the full school name or your email's
                domain (the part after the @).
              </Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={instituteKeyExtractor}
                renderItem={renderInstituteResult}
                keyboardShouldPersistTaps="handled"
                style={[ui.resultsScroll, isDark && { backgroundColor: colors.surfaceInset }]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                updateCellsBatchingPeriod={48}
                windowSize={5}
              />
            )}
          </View>
        </>
      ) : step === 'email' ? (
        <>
          <Text style={[ui.sheetTitle, isDark && { color: colors.textPrimary }]}>Your student email</Text>
          <View style={ui.institutePill}>
            <Text style={ui.institutePillText} numberOfLines={1}>
              {picked?.name}
            </Text>
          </View>

          <View style={ui.inputWrap}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={picked?.domains?.[0] ? `you@${picked.domains[0]}` : 'you@university.edu'}
              placeholderTextColor={isDark ? colors.textTertiary : AppColors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[ui.input, isDark && { backgroundColor: colors.surfaceInset, borderColor: colors.inkSoft, color: colors.textPrimary }]}
              maxLength={120}
              editable={!busy}
              autoFocus
            />
          </View>

          <PressableScale
            haptic="medium"
            disabled={busy}
            onPress={sendCode}
            style={[ui.primaryBtn, isDark && { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={isDark ? colors.textOnAccent : AppColors.primaryLightGreen} accessibilityLabel="Loading" />
            ) : (
              <Text style={[ui.primaryBtnText, isDark && { color: colors.textOnAccent }]}>Send verification link</Text>
            )}
          </PressableScale>

          <PressableScale
            haptic={null}
            disabled={busy}
            onPress={() => setStep('pick')}
            style={ui.linkBtn}
          >
            <Text style={[ui.linkBtnText, isDark && { color: colors.textSecondary, opacity: 1 }]}>Change university</Text>
          </PressableScale>
        </>
      ) : (
        <>
          <Text style={[ui.sheetTitle, isDark && { color: colors.textPrimary }]}>Check your inbox</Text>
          <Text style={[ui.sheetBody, isDark && { color: colors.textSecondary, opacity: 1 }]}>
            Sent to{' '}
            <Text style={{ color: isDark ? colors.textPrimary : AppColors.secondaryDarkGreen, fontFamily: 'NunitoSans_800ExtraBold' }}>
              {email}
            </Text>
            .
          </Text>

          <View style={ui.inputWrap}>
            <Text style={[ui.inputLabel, isDark && { color: colors.textTertiary, opacity: 1 }]}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={isDark ? colors.textTertiary : AppColors.inkMuted}
              keyboardType="number-pad"
              style={[ui.input, ui.inputCode, isDark && { backgroundColor: colors.surfaceInset, borderColor: colors.inkSoft, color: colors.textPrimary }]}
              maxLength={6}
              editable={!busy}
              autoFocus
            />
          </View>

          <PressableScale
            haptic="medium"
            disabled={busy || code.length !== 6}
            onPress={submitCode}
            style={[ui.primaryBtn, isDark && { backgroundColor: colors.primary }, (busy || code.length !== 6) && { opacity: 0.4 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={isDark ? colors.textOnAccent : AppColors.primaryLightGreen} accessibilityLabel="Loading" />
            ) : (
              <Text style={[ui.primaryBtnText, isDark && { color: colors.textOnAccent }]}>Verify with code</Text>
            )}
          </PressableScale>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <PressableScale
              haptic={null}
              disabled={busy}
              onPress={() => setStep('email')}
              style={ui.linkBtn}
            >
              <Text style={[ui.linkBtnText, isDark && { color: colors.textSecondary, opacity: 1 }]}>Change email</Text>
            </PressableScale>

            <PressableScale
              haptic={null}
              disabled={busy || resendIn > 0}
              onPress={sendCode}
              style={ui.linkBtn}
            >
              <Text style={[ui.linkBtnText, isDark && { color: colors.textSecondary, opacity: 1 }, resendIn > 0 && { opacity: 0.4 }]}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend'}
              </Text>
            </PressableScale>
          </View>
        </>
      )}
    </SheetShell>
  );
};

// Local UI tokens for the two sheets in this file.

const ui = {
  sheetTitle: {
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    fontSize: 26,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 6,
    paddingRight: 44, // clear the close X
  },
  sheetBody: {
    fontFamily: 'NunitoSans_400Regular' as const,
    fontSize: 14.5,
    lineHeight: 21,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    marginBottom: 22,
  },
  inputWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: 'NunitoSans_700Bold' as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  input: {
    backgroundColor: 'rgba(38,59,51,0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_700Bold' as const,
    borderWidth: 1,
    borderColor: 'rgba(38,59,51,0.10)',
  },
  inputCode: {
    fontSize: 26,
    letterSpacing: 12,
    textAlign: 'center' as const,
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    paddingVertical: 16,
  },
  inputHint: {
    fontFamily: 'NunitoSans_400Regular' as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 6,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    color: AppColors.primaryLightGreen,
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  linkBtn: {
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  linkBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_700Bold' as const,
    fontSize: 13.5,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  // Verified status chip used on the email row.
  badgeVerified: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
    gap: 4,
  },
  badgeVerifiedText: {
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    fontSize: 11,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
  // Actionable verify pill for the unverified state.
  badgeAction: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
    marginTop: 6,
  },
  badgeActionText: {
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    fontSize: 11,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
  // Fixed-height university picker stage keeps the sheet size stable.
  resultsWrap: {
    marginBottom: 12,
    height: 320,
  },
  resultsScroll: {
    flex: 1,
    backgroundColor: 'rgba(38,59,51,0.03)',
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  resultsHint: {
    fontFamily: 'NunitoSans_400Regular' as const,
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
    borderBottomColor: 'rgba(38,59,51,0.06)',
  },
  resultName: {
    fontFamily: 'NunitoSans_700Bold' as const,
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  resultMeta: {
    fontFamily: 'NunitoSans_400Regular' as const,
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginTop: 3,
  },
  // Picked-university chip shown on the email step.
  institutePill: {
    alignSelf: 'flex-start' as const,
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 14,
  },
  institutePillText: {
    fontFamily: 'NunitoSans_800ExtraBold' as const,
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
};
