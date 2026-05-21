import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './ProfileScreen/ProfileScreen.styles';
import { useApi } from '../utils/ApiUtil';
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import { useRouter } from "expo-router";
import LoadingComponent from '../components/LoadingComponent';
import AppColors from '../design_systems/colors';
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/PressableScale";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
 * Personal Information screen. Shows the user's identity fields
 * (name, email, contact, gender) as read-only rows + two editable
 * affordances:
 *
 *   - A single editable row for the UPI VPA so hosts can opt in to
 *     receiving post-trip payments via the home-screen pay sheet's
 *     UPI deeplink.
 *   - A "Verify" pill beside the email row so users who signed in
 *     with a personal Google account can still prove they own a
 *     real institute email — they'd otherwise look like outsiders
 *     forever even after switching to the right address.
 */
const PersonalInformationScreen: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
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

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <LoadingComponent />
    </View>
  );

  const header = (title: string) => (
    <>
      <View style={styles.brandInfoHeaderRow}><BrandInfo /></View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>
    </>
  );

  if (error) return (
    <View style={styles.container}>
      {header('Personal Information')}
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    </View>
  );

  if (!user) return (
    <View style={styles.container}>
      {header('Personal Information')}
      <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 36 }}>
        <Text style={{
          fontFamily: 'NunitoSans_800ExtraBold',
          fontSize: 22,
          color: AppColors.secondaryDarkGreen,
          letterSpacing: -0.4,
        }}>
          Nothing here yet
        </Text>
      </View>
    </View>
  );

  const verified = !!user.is_email_verified;

  return (
    <View style={styles.container}>
      {header('Personal Information')}

      <View style={styles.newSection}>
        <View style={styles.menuContainer}>
          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Name</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.name}</Text>
          </View>

          {/* Email row is now purely informational — the sign-in
              identity isn't what we're verifying, the user's
              academic affiliation is. The Verify CTA lives on the
              Institute row below. */}
          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Email</Text>
            <Text
              style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.email}
            </Text>
          </View>

          <View style={styles.menuItem}>
            <Text style={[styles.menuItemText, { flex: 1 }]}>Contact</Text>
            <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.contact_number}</Text>
          </View>
          {user.gender ? (
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Gender</Text>
              <Text style={[styles.menuItemText, { flex: 2, flexWrap: 'wrap', textAlign: 'right' }]}>{user.gender}</Text>
            </View>
          ) : null}

          {/* Academic status row — the verification surface. Three
              states:
                · verified + institute known  → badge + school name
                · verified only (rare)        → green check, "Verified"
                · unverified                  → tappable Verify pill */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={verified ? 1 : 0.7}
            disabled={verified}
            onPress={() => {
              if (verified) return;
              haptic('selection');
              setVerifyOpen(true);
            }}
          >
            <Text style={[styles.menuItemText, { flex: 1 }]}>Institute</Text>
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
              {verified ? (
                <>
                  <Text
                    style={[styles.menuItemText, { textAlign: 'right' }]}
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
                    ]}
                  >
                    Not verified
                  </Text>
                  <View style={ui.badgeAction}>
                    <Text style={ui.badgeActionText}>Verify academic status →</Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Editable UPI VPA row — tap to open the slide-up editor.
              Empty state reads "Add UPI ID →" so the affordance is
              obvious; filled state shows the saved value. */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => {
              haptic('selection');
              setUpiOpen(true);
            }}
          >
            <Text style={[styles.menuItemText, { flex: 1 }]}>UPI ID</Text>
            <Text
              style={[
                styles.menuItemText,
                {
                  flex: 2,
                  textAlign: 'right',
                  opacity: user.upi_vpa ? 1 : 0.55,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.upi_vpa || 'Add UPI ID →'}
            </Text>
          </TouchableOpacity>
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
          // Refetch /user/details so the institute relation lands
          // even if /verify/confirm's preload didn't surface it.
          fetchUser();
        }}
      />
    </View>
  );
};

export default PersonalInformationScreen;

// --------------------------------------------------------------------
// Sheet chrome — shared between the UPI editor and the verify flow.
// Slide-up overlay with backdrop dim, grab handle, optional close X.
// Modelled on `AuthSheet` but lighter (no OAuth ceremony).
// --------------------------------------------------------------------

type SheetShellProps = {
  visible: boolean;
  onDismiss: () => void;
  busy?: boolean;
  children: React.ReactNode;
};

const SheetShell: React.FC<SheetShellProps> = ({ visible, onDismiss, busy, children }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      haptic('selection');
      content.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(160),
          Animated.spring(content, {
            toValue: 1,
            damping: 18,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(content, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const settleStyle = {
    opacity: content,
    transform: [
      {
        translateY: content.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => !busy && onDismiss()}
    >
      <Animated.View
        style={{
          ...sheetFill,
          backgroundColor: 'rgba(0,0,0,0.42)',
          opacity: backdrop,
        }}
      >
        <Pressable style={sheetFill} onPress={() => !busy && onDismiss()} disabled={busy} />
      </Animated.View>

      <KeyboardAvoidingView
        // `behavior="height"` on Android (not `undefined`) — the
        // transparent Modal sits OVER the OS-resized window, so the
        // manifest's `adjustResize` doesn't reach inside it. Without
        // an explicit behavior here, the UPI input stays pinned to
        // the bottom of the screen, hidden behind the keyboard.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ ...sheetFill, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            backgroundColor: AppColors.basicWhite,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            transform: [{ translateY }],
            shadowColor: AppColors.basicBlack,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.22,
            shadowRadius: 28,
            elevation: 18,
            // Same Android keyboard guard as components/SheetShell: cap
            // the sheet so it can't slide behind the translucent status
            // bar when an autofocused field opens the keyboard.
            maxHeight: SCREEN_HEIGHT - insets.top - 8,
          }}
        >
          {/* Grab handle */}
          <View style={{
            alignSelf: 'center',
            width: 44,
            height: 5,
            borderRadius: 3,
            backgroundColor: 'rgba(38,59,51,0.18)',
            marginBottom: 18,
          }} />

          {/* Close X — top right, mirrors AuthSheet */}
          <TouchableOpacity
            onPress={() => !busy && onDismiss()}
            disabled={busy}
            activeOpacity={0.6}
            style={{
              position: 'absolute',
              top: 22,
              right: 18,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(38,59,51,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4,
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16">
              <Path d="M3 3 L 13 13 M13 3 L 3 13" stroke={AppColors.secondaryDarkGreen} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>

          <Animated.View style={settleStyle}>
            {children}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --------------------------------------------------------------------
// UPI editor sheet. Single text field + helper copy + primary button.
// Calls PATCH /user/profile.
// --------------------------------------------------------------------

type UpiEditSheetProps = {
  visible: boolean;
  initialValue: string;
  onDismiss: () => void;
  onSaved: (user: Partial<User>) => void;
};

const UpiEditSheet: React.FC<UpiEditSheetProps> = ({ visible, initialValue, onDismiss, onSaved }) => {
  const { apiUtil } = useApi();
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
      <Text style={ui.sheetTitle}>UPI ID</Text>
      <Text style={ui.sheetBody}>
        Passengers can tap a Pay button after the trip to send your fare via UPI.
        Leave blank to keep collecting cash.
      </Text>

      <View style={ui.inputWrap}>
        <Text style={ui.inputLabel}>Your UPI ID</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="yourname@bank"
          placeholderTextColor={AppColors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={ui.input}
          maxLength={120}
          editable={!busy}
        />
        <Text style={ui.inputHint}>e.g. yash@upi, 9999999999@paytm</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={busy}
        onPress={save}
        style={[ui.primaryBtn, busy && { opacity: 0.6 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={AppColors.primaryLightGreen} />
        ) : (
          <Text style={ui.primaryBtnText}>Save UPI ID</Text>
        )}
      </TouchableOpacity>

      {initialValue ? (
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={busy}
          onPress={() => {
            setDraft('');
          }}
          style={ui.linkBtn}
        >
          <Text style={ui.linkBtnText}>Clear UPI ID</Text>
        </TouchableOpacity>
      ) : null}
    </SheetShell>
  );
};

// --------------------------------------------------------------------
// Verify academic-status sheet. Three steps in one surface:
//
//   1) pick a university (typeahead against /institutes/search)
//   2) enter the institute email at one of that uni's domains
//   3) enter the 6-digit code (or tap the magic-link in the email)
//
// Step state carries between steps so back-stepping doesn't lose
// what the user typed. SES sends the code + a unipool:// deeplink;
// backend stamps `is_email_verified` + `institute_id` +
// `institute_email` on success.
// --------------------------------------------------------------------

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
  const [step, setStep] = useState<VerifyStep>('pick');
  const [picked, setPicked] = useState<PickedInstitute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickedInstitute[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Disabled-resend window. Server enforces a 45s cooldown; we mirror
  // it on the client so the button is clearly inactionable instead of
  // letting the user retry into a 429.
  const [resendIn, setResendIn] = useState(0);

  // Reset every time the sheet re-opens.
  useEffect(() => {
    if (visible) {
      setStep('pick');
      setPicked(null);
      setSearchQuery('');
      setSearchResults([]);
      // If the user signed in with a domain that matches a known
      // institute, default the email entry to that — saves typing
      // on the happy path.
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

  // Debounced search against /institutes/search. 250ms is short
  // enough to feel reactive when typing and long enough to avoid
  // pummeling the API on every keystroke.
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

  const pickInstitute = (inst: PickedInstitute) => {
    haptic('selection');
    setPicked(inst);
    // Pre-seed the email field: keep whatever local-part the user
    // typed before (if any) and append the first listed domain.
    const local = email.split('@')[0] || '';
    if (inst.domains.length > 0) {
      setEmail(`${local}@${inst.domains[0]}`);
    }
    setStep('email');
  };

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
      await apiUtil.post<{ status: string; expires_in: number }, { email: string }>(
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
      const resp = await apiUtil.post<{ status: string; user?: User }, { email: string; code: string }>(
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
          <Text style={ui.sheetTitle}>Pick your university</Text>

          <View style={ui.inputWrap}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="University name or email domain"
              placeholderTextColor={AppColors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={ui.input}
              autoFocus
            />
          </View>

          {/* Results area — fixed height so the sheet stays a stable
              size whether 0 or 20 rows render. Hint / loader / list
              all occupy the same surface. */}
          <View style={ui.resultsWrap}>
            {searchQuery.trim().length < 2 ? (
              <Text style={ui.resultsHint}>
                Type at least 2 letters. You can search by name
                ("Vellore"), acronym ("VIT") or email domain
                ("vitstudent").
              </Text>
            ) : searching ? (
              <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} style={{ marginTop: 12 }} />
            ) : searchResults.length === 0 ? (
              <Text style={ui.resultsHint}>
                No matches. Try the full school name or your email's
                domain (the part after the @).
              </Text>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={ui.resultsScroll}
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map((inst) => (
                  <TouchableOpacity
                    key={inst.id}
                    style={ui.resultRow}
                    activeOpacity={0.7}
                    onPress={() => pickInstitute(inst)}
                  >
                    <Text style={ui.resultName} numberOfLines={2}>
                      {inst.name}
                    </Text>
                    <Text style={ui.resultMeta} numberOfLines={1}>
                      {[
                        inst.country,
                        inst.domains.slice(0, 2).map((d) => `@${d}`).join(' · '),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      ) : step === 'email' ? (
        <>
          <Text style={ui.sheetTitle}>Your student email</Text>
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
              placeholderTextColor={AppColors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={ui.input}
              maxLength={120}
              editable={!busy}
              autoFocus
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={sendCode}
            style={[ui.primaryBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={AppColors.primaryLightGreen} />
            ) : (
              <Text style={ui.primaryBtnText}>Send verification link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={busy}
            onPress={() => setStep('pick')}
            style={ui.linkBtn}
          >
            <Text style={ui.linkBtnText}>← Change university</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={ui.sheetTitle}>Check your inbox</Text>
          <Text style={ui.sheetBody}>
            Sent to{' '}
            <Text style={{ color: AppColors.secondaryDarkGreen, fontFamily: 'NunitoSans_800ExtraBold' }}>
              {email}
            </Text>
            .
          </Text>

          <View style={ui.inputWrap}>
            <Text style={ui.inputLabel}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={AppColors.inkMuted}
              keyboardType="number-pad"
              style={[ui.input, ui.inputCode]}
              maxLength={6}
              editable={!busy}
              autoFocus
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy || code.length !== 6}
            onPress={submitCode}
            style={[ui.primaryBtn, (busy || code.length !== 6) && { opacity: 0.4 }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={AppColors.primaryLightGreen} />
            ) : (
              <Text style={ui.primaryBtnText}>Verify with code</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={busy}
              onPress={() => setStep('email')}
              style={ui.linkBtn}
            >
              <Text style={ui.linkBtnText}>← Change email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={busy || resendIn > 0}
              onPress={sendCode}
              style={ui.linkBtn}
            >
              <Text style={[ui.linkBtnText, resendIn > 0 && { opacity: 0.4 }]}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SheetShell>
  );
};

// --------------------------------------------------------------------
// Local UI tokens. Kept inline because they're tightly coupled to the
// two sheets here and reuse the brand palette directly.
// --------------------------------------------------------------------

const sheetFill = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, bottom: 0,
};

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
  // Actionable "Verify →" pill (unverified state).
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
  // University picker — step 1 of the verify flow. Fixed height
  // so the sheet doesn't jump as results stream in; the inner
  // ScrollView absorbs longer lists.
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
  // Picked-university chip shown on step 2 so the user can see what
  // they're verifying against without scrolling back.
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
