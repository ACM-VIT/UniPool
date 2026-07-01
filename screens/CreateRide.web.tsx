// Web variant of the create-ride screen, styled to match the mobile
// "Create a Ride" flow: forest cards on the lime canvas (route, seats
// stepper, fare), minimal labels, no marketing copy. Posts to the same
// /ride/create endpoint. Guests are sent to sign in first.
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "../components/web/WebShell";
import WebLocationInput from "../components/web/WebLocationInput";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { appHref } from "../navigation/routes";
import { WEB, RADIUS, FONT, cardFloat } from "../components/web/theme";

// A two-hours-from-now default keeps the picker off a past time.
const defaultWhen = () => {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
      await apiUtil.post("/ride/create", {
        start_location: from.trim(),
        end_location: to.trim(),
        start_time: new Date(when).toISOString(),
        total_seats: seats,
        total_price: fareNum,
        start_latitude: null,
        start_longitude: null,
        end_latitude: null,
        end_longitude: null,
      });
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
        <Text style={styles.title}>Create a Ride</Text>

        {/* Route — forest card with connected From / To */}
        <View style={styles.routeCard}>
          <WebLocationInput
            value={from}
            onChangeText={setFrom}
            onSelect={(label) => setFrom(label)}
            placeholder="Leaving from"
            icon={<View style={styles.fromDot} />}
          />
          <View style={styles.routeSep} />
          <WebLocationInput
            value={to}
            onChangeText={setTo}
            onSelect={(label) => setTo(label)}
            placeholder="Going to"
            icon={(
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M3 11 L21 3 L13 21 L11 13 Z" fill={WEB.lime} />
              </Svg>
            )}
          />
        </View>

        <Text style={styles.label}>When</Text>
        <input type="datetime-local" value={when} onChange={(e: any) => setWhen(e.target.value)} style={webInputStyle} />

        <Text style={styles.label}>Total seats <Text style={styles.labelHint}>(including you)</Text></Text>
        <View style={styles.forestCard}>
          <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.max(2, s - 1))}>
            <Text style={styles.stepBtnText}>{"−"}</Text>
          </Pressable>
          <View style={styles.stepValueWrap}>
            <Text style={styles.stepValue}>{seats}</Text>
            <Text style={styles.stepUnit}>{seats === 1 ? "seat" : "seats"}</Text>
          </View>
          <Pressable style={styles.stepBtn} onPress={() => setSeats((s) => Math.min(20, s + 1))}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Fare per seat</Text>
        <View style={styles.fareCard}>
          <Text style={styles.fareCurrency}>{"₹"}</Text>
          <TextInput
            style={styles.fareInput}
            value={fare}
            onChangeText={(t) => setFare(t.replace(/[^0-9]/g, ""))}
            placeholder="250"
            placeholderTextColor={WEB.onForestMuted}
            keyboardType="numeric"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ hovered }: any) => [
            styles.submit,
            hovered && (isGuest || canSubmit) && styles.submitHover,
            (busy || (!isGuest && !canSubmit)) && styles.submitDisabled,
          ]}
          onPress={submit}
          disabled={busy || (!isGuest && !canSubmit)}
        >
          {busy ? <ActivityIndicator color={WEB.lime} /> : <Text style={styles.submitText}>{isGuest ? "Sign in to post" : "Post ride"}</Text>}
        </Pressable>
      </View>
    </WebShell>
  );
};

export default CreateRideWeb;

const webInputStyle: any = {
  height: 56,
  borderRadius: RADIUS.card,
  border: "none",
  padding: "0 18px",
  fontFamily: "NunitoSans_700Bold, sans-serif",
  fontSize: 15.5,
  color: WEB.onForest,
  background: WEB.forest,
  colorScheme: "dark",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  marginBottom: 8,
};

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 520, alignSelf: "center", paddingTop: 32, paddingBottom: 64 },
  title: { fontFamily: FONT.displayBlack, fontSize: 38, color: WEB.forest, letterSpacing: -1, marginBottom: 22 },

  label: { fontFamily: FONT.black, fontSize: 14, color: WEB.forest, marginTop: 22, marginBottom: 10 },
  labelHint: { fontFamily: FONT.semibold, fontSize: 13, color: WEB.inkMuted },

  // position+zIndex so the location autocomplete dropdown stacks ABOVE the
  // When / seats / fare cards that follow it in the form.
  routeCard: { backgroundColor: WEB.forest, borderRadius: RADIUS.card, paddingHorizontal: 6, position: "relative", zIndex: 30, ...cardFloat },
  fromDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 3, borderColor: WEB.onForest },
  routeSep: { height: 1, backgroundColor: WEB.onForestLine, marginLeft: 20 },

  forestCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WEB.forest, borderRadius: RADIUS.card, height: 64, paddingHorizontal: 12, ...cardFloat },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: WEB.lime, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontFamily: FONT.black, fontSize: 24, color: WEB.forest, lineHeight: 26 },
  stepValueWrap: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  stepValue: { fontFamily: FONT.displayBlack, fontSize: 26, color: WEB.cream, letterSpacing: -0.5 },
  stepUnit: { fontFamily: FONT.bold, fontSize: 14, color: WEB.onForestMuted },

  fareCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WEB.forest, borderRadius: RADIUS.card, height: 64, paddingHorizontal: 20, ...cardFloat },
  fareCurrency: { fontFamily: FONT.displayBlack, fontSize: 22, color: WEB.lime },
  fareInput: { flex: 1, fontFamily: FONT.black, fontSize: 20, color: WEB.onForest, outlineStyle: "none" as any },

  error: { fontFamily: FONT.semibold, fontSize: 13.5, color: WEB.orange, marginTop: 16 },
  submit: { marginTop: 28, backgroundColor: WEB.forest, borderRadius: RADIUS.button, height: 56, alignItems: "center", justifyContent: "center", ...cardFloat },
  submitHover: { backgroundColor: WEB.forestDeep },
  submitDisabled: { opacity: 0.45 },
  submitText: { fontFamily: FONT.black, fontSize: 16, color: WEB.lime },
});
