import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Modal, Platform, StyleSheet } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import SheetShell from "./SheetShell";
import PressableScale from "./PressableScale";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { useApi } from "../utils/ApiUtil";
import { haptic } from "./haptics";

// The fields the host can edit + everything the /ride/update contract needs
// echoed back so unchanged values (locations, seats, coords) are preserved.
export interface EditableRide {
  id: string;
  host_user_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_same_gender?: number;
  start_latitude?: number;
  start_longitude?: number;
  end_latitude?: number;
  end_longitude?: number;
  vehicle_type?: string;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  ride: EditableRide;
  /** Called after a successful save so the screen can refetch. */
  onSaved: () => void;
}

/**
 * Host-only sheet to edit a ride's departure (date + time) and fare.
 * PUTs /ride/update/:id, which is host-gated and notifies accepted
 * passengers when the time or fare changes.
 */
const EditRideSheet: React.FC<Props> = ({ visible, onDismiss, ride, onSaved }) => {
  const colors = useThemeColors();
  const { apiUtil } = useApi();

  const [when, setWhen] = useState<Date>(() => new Date(ride.start_time));
  const [price, setPrice] = useState<string>(String(ride.total_price ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // iOS uses an inline spinner in a modal; Android drives the native dialogs.
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(when);

  // Re-seed from the ride each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setWhen(new Date(ride.start_time));
      setPrice(String(ride.total_price ?? ""));
      setError(null);
    }
  }, [visible, ride.start_time, ride.total_price]);

  // Android: date dialog, then chain into the time dialog, then combine.
  // onValueChange fires only on selection (Cancel triggers onDismiss instead),
  // so the two steps chain cleanly without inspecting event.type.
  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: when,
      mode: "date",
      minimumDate: new Date(),
      onValueChange: (_e, d) => {
        DateTimePickerAndroid.open({
          value: d,
          mode: "time",
          is24Hour: false,
          onValueChange: (_e2, t) => {
            const combined = new Date(d);
            combined.setHours(t.getHours(), t.getMinutes(), 0, 0);
            if (combined.getTime() > Date.now()) setWhen(combined);
          },
        });
      },
    });
  };

  const openPicker = () => {
    haptic("selection");
    if (Platform.OS === "android") {
      openAndroidPicker();
    } else {
      setTempDate(when);
      setShowPicker(true);
    }
  };

  const save = async () => {
    setError(null);
    if (when.getTime() <= Date.now()) {
      setError("Pick a date and time in the future.");
      return;
    }
    const priceNum = Math.round(Number(price));
    if (!Number.isFinite(priceNum) || priceNum < 25 || priceNum > 10000) {
      setError("Fare must be between ₹25 and ₹10,000 per seat.");
      return;
    }
    setSaving(true);
    try {
      await apiUtil.put(`/ride/update/${ride.id}`, {
        host_user_id: ride.host_user_id,
        start_location: ride.start_location,
        end_location: ride.end_location,
        start_time: when.toISOString(),
        total_seats: ride.total_seats,
        booked_seats: ride.booked_seats,
        total_price: priceNum,
        is_same_gender: ride.is_same_gender ?? 0,
        start_latitude: ride.start_latitude,
        start_longitude: ride.start_longitude,
        end_latitude: ride.end_latitude,
        end_longitude: ride.end_longitude,
        vehicle_type: ride.vehicle_type,
      });
      haptic("success");
      onSaved();
      onDismiss();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell visible={visible} onDismiss={onDismiss} busy={saving}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Edit ride</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Accepted passengers are notified when the time or fare changes.
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Date & time</Text>
      <PressableScale
        style={[styles.field, { backgroundColor: colors.inkSubtle, borderColor: colors.inkSoft }]}
        onPress={openPicker}
        haptic={null}
      >
        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
          {format(when, "EEE, d MMM yyyy '·' h:mm a")}
        </Text>
      </PressableScale>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Fare per seat (₹)</Text>
      <View style={[styles.field, styles.fareRow, { backgroundColor: colors.inkSubtle, borderColor: colors.inkSoft }]}>
        <Text style={[styles.fareCurrency, { color: colors.textTertiary }]}>₹</Text>
        <TextInput
          style={[styles.fareInput, { color: colors.textPrimary }]}
          value={price}
          onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder="Per seat"
          placeholderTextColor={colors.textTertiary}
          maxLength={5}
        />
        <Text style={[styles.farePer, { color: colors.textTertiary }]}>/ seat</Text>
      </View>

      {error ? <Text style={[styles.error, { color: colors.accentOrange }]}>{error}</Text> : null}

      <PressableScale
        style={[styles.saveBtn, { backgroundColor: AppColors.secondaryDarkGreen }, saving && { opacity: 0.7 }]}
        onPress={saving ? undefined : save}
        disabled={saving}
        haptic={null}
      >
        <Text style={[styles.saveBtnText, { color: AppColors.primaryLightGreen }]}>
          {saving ? "Saving…" : "Save changes"}
        </Text>
      </PressableScale>

      {/* iOS date/time spinner in a modal (Android uses the native dialogs). */}
      {Platform.OS === "ios" && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: colors.navFill }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.inkSoft }]}>
                <PressableScale onPress={() => setShowPicker(false)} haptic={null}>
                  <Text style={[styles.modalBtn, { color: colors.primary }]}>Cancel</Text>
                </PressableScale>
                <Text style={[styles.modalTitle, { color: colors.primary }]}>Date & time</Text>
                <PressableScale
                  onPress={() => {
                    setWhen(tempDate);
                    setShowPicker(false);
                  }}
                  haptic={null}
                >
                  <Text style={[styles.modalBtn, { color: colors.primary }]}>Done</Text>
                </PressableScale>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onValueChange={(_e, d) => setTempDate(d)}
                themeVariant="dark"
                accentColor={colors.primary}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </SheetShell>
  );
};

export default EditRideSheet;

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "NunitoSans_800ExtraBold", letterSpacing: -0.4 },
  subtitle: { marginTop: 4, fontSize: 14, fontFamily: "NunitoSans_600SemiBold", lineHeight: 20 },
  label: { marginTop: 18, marginBottom: 8, fontSize: 13, fontFamily: "NunitoSans_700Bold", letterSpacing: 0.2 },
  field: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  fieldValue: { fontSize: 15.5, fontFamily: "NunitoSans_700Bold" },
  fareRow: { flexDirection: "row", alignItems: "center" },
  fareCurrency: { fontSize: 15.5, fontFamily: "NunitoSans_700Bold", marginRight: 4 },
  fareInput: { flex: 1, fontSize: 15.5, fontFamily: "NunitoSans_700Bold", paddingVertical: 0 },
  farePer: { fontSize: 14, fontFamily: "NunitoSans_600SemiBold", marginLeft: 6 },
  error: { marginTop: 12, fontSize: 13.5, fontFamily: "NunitoSans_600SemiBold" },
  saveBtn: {
    marginTop: 22,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 15.5, fontFamily: "NunitoSans_800ExtraBold", letterSpacing: 0.2 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalBtn: { fontSize: 15.5, fontFamily: "NunitoSans_700Bold" },
  modalTitle: { fontSize: 15.5, fontFamily: "NunitoSans_800ExtraBold" },
  picker: { height: 216 },
});
