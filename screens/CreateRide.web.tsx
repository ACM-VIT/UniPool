// Web variant of the create-ride screen. A focused web form that posts
// to the same /ride/create endpoint as mobile. Coordinates are optional
// on the backend, so the web form collects readable locations, time,
// seats, and the per-seat fare. Guests are sent to sign in first.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import Reveal from "../components/web/Reveal";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "../components/web/theme";

// A two-hours-from-now default keeps the picker from defaulting to a
// time in the past. We pass it as a local datetime-local string.
const defaultWhen = () => {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Field: React.FC<{ label: string; children: React.ReactNode; style?: any }> = ({ label, children, style }) => (
  <View style={[styles.field, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const CreateRideWeb: React.FC = () => {
  const router = useRouter();
  const { apiUtil } = useApi();
  const { isGuest, requireAuth } = useAuthGate();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState(defaultWhen());
  const [seats, setSeats] = useState(3);
  const [fare, setFare] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fareNum = useMemo(() => parseInt(fare, 10) || 0, [fare]);
  const canSubmit = from.trim() && to.trim() && when && seats >= 2 && fareNum > 0;

  const submit = async () => {
    if (isGuest) {
      requireAuth({ screen: "CreateRide" } as any, "to post a ride");
      return;
    }
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        start_location: from.trim(),
        end_location: to.trim(),
        start_time: new Date(when).toISOString(),
        total_seats: seats,
        total_price: fareNum,
        start_latitude: null,
        start_longitude: null,
        end_latitude: null,
        end_longitude: null,
      };
      await apiUtil.post("/ride/create", payload);
      router.replace(appHref("TripsListScreen"));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not post the ride. Check the details and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WebShell active="CreateRide">
      <View style={styles.wrap}>
        <Reveal>
          <Text style={styles.title}>Post a ride</Text>
          <Text style={styles.subtitle}>Share your route and let students heading the same way ride along.</Text>
        </Reveal>

        <Reveal delay={100}>
          <View style={styles.card}>
            {/* Route — connected from/to, matching the search selector */}
            <Text style={styles.fieldLabel}>Route</Text>
            <View style={styles.routeStack}>
              <View style={styles.routeRow}>
                <View style={styles.fromDot} />
                <TextInput style={styles.routeInput} value={from} onChangeText={setFrom} placeholder="Leaving from" placeholderTextColor={WEB.inkMuted} />
              </View>
              <View style={styles.routeSep} />
              <View style={styles.routeRow}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 11 L21 3 L13 21 L11 13 Z" fill={WEB.forest} />
                </Svg>
                <TextInput style={styles.routeInput} value={to} onChangeText={setTo} placeholder="Going to" placeholderTextColor={WEB.inkMuted} />
              </View>
            </View>

            <Field label="When" style={{ marginTop: 18 }}>
              {/* Native datetime picker on web for an accurate, familiar control. */}
              <input
                type="datetime-local"
                value={when}
                onChange={(e: any) => setWhen(e.target.value)}
                style={webInputStyle}
              />
            </Field>

            <View style={styles.twoCol}>
              <Field label="Total seats (including you)" style={{ flex: 1 }}>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.max(2, s - 1))}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{seats}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.min(20, s + 1))}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </Field>
              <Field label="Fare per seat (₹)" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={fare} onChangeText={(t) => setFare(t.replace(/[^0-9]/g, ""))} placeholder="e.g. 250" placeholderTextColor={WEB.inkMuted} keyboardType="numeric" />
              </Field>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.submit, (!canSubmit || busy) && styles.submitDisabled]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.submitText}>{isGuest ? "Sign in to post" : "Post ride"}</Text>}
            </Pressable>
            <Text style={styles.note}>Riders pay you per seat over UPI after the trip. You can cancel any time before it leaves.</Text>
          </View>
        </Reveal>
      </View>
    </WebShell>
  );
};

export default CreateRideWeb;

const webInputStyle: any = {
  height: 52,
  borderRadius: RADIUS.field,
  border: "none",
  padding: "0 16px",
  fontFamily: "NunitoSans_700Bold, sans-serif",
  fontSize: 15.5,
  color: WEB.forest,
  background: WEB.fieldFill,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 560, alignSelf: "center", paddingTop: 36, paddingBottom: 56 },
  title: { fontFamily: FONT.display, fontSize: 28, color: WEB.forest, letterSpacing: -0.6 },
  subtitle: { fontFamily: FONT.semibold, fontSize: 15.5, lineHeight: 23, color: WEB.inkMuted, marginTop: 8, marginBottom: 24, maxWidth: 460 },
  card: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 24, ...cardBorder },

  routeStack: { backgroundColor: WEB.fieldFill, borderRadius: RADIUS.field, paddingHorizontal: 16, marginTop: 8 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 13, height: 54 },
  fromDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 3, borderColor: WEB.forest },
  routeInput: { flex: 1, fontFamily: FONT.bold, fontSize: 15.5, color: WEB.forest, outlineStyle: "none" as any },
  routeSep: { height: 1, backgroundColor: WEB.inkSoft, marginLeft: 28 },

  field: { marginBottom: 18 },
  fieldLabel: { fontFamily: FONT.black, fontSize: 12.5, color: WEB.inkStrong, marginBottom: 8, letterSpacing: 0.2 },
  input: {
    height: 52,
    borderRadius: RADIUS.field,
    paddingHorizontal: 16,
    fontFamily: FONT.bold,
    fontSize: 15.5,
    color: WEB.forest,
    backgroundColor: WEB.fieldFill,
    outlineStyle: "none" as any,
  },
  twoCol: { flexDirection: "row", gap: 16 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, backgroundColor: WEB.fieldFill, borderRadius: RADIUS.field, paddingHorizontal: 8 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: WEB.lime, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontFamily: FONT.black, fontSize: 22, color: WEB.forest, lineHeight: 24 },
  stepValue: { fontFamily: FONT.display, fontSize: 20, color: WEB.forest, minWidth: 24, textAlign: "center" },
  error: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.orange, marginBottom: 12 },
  submit: { marginTop: 8, backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 56, alignItems: "center", justifyContent: "center" },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: FONT.black, fontSize: 16, color: WEB.lime },
  note: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 18, color: WEB.inkMuted, marginTop: 14, textAlign: "center" },
});
