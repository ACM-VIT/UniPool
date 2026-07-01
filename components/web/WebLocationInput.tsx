// Web location autocomplete for the From / To fields.
//
// The raw <TextInput> the search card shipped with had no suggestions —
// you had to type an exact location string for /ride/search to match,
// which is unusable. This reuses the SAME location layer the mobile app
// uses (getInstantLocationResults for instant popular hits +
// searchLocationsWithFallback for backend / OSM results) and drops a
// suggestion menu under the field, so picking "VIT Vellore" or
// "Katpadi Junction" is one keystroke + one click, exactly like the app.
import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  LocationResult,
  getInstantLocationResults,
  searchLocationsWithFallback,
  formatLocationName,
} from "../../utils/LocationService";
import { titleCaseLocation } from "./format";
import { WEB, RADIUS, FONT, floatShadow } from "./theme";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSelect: (label: string, result: LocationResult) => void;
  placeholder: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  onSubmit?: () => void;
  /** "forest" (default) for the dark search card; "light" for cream forms. */
  tone?: "forest" | "light";
};

const PinIcon: React.FC<{ current?: boolean }> = ({ current }) =>
  current ? (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="7" stroke={WEB.midOlive} strokeWidth={2} />
      <Circle cx="12" cy="12" r="2.5" fill={WEB.midOlive} />
    </Svg>
  ) : (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"
        fill="none"
        stroke={WEB.inkMuted}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="2.4" fill={WEB.inkMuted} />
    </Svg>
  );

const WebLocationInput: React.FC<Props> = ({ value, onChangeText, onSelect, placeholder, icon, trailing, onSubmit, tone = "forest" }) => {
  const isLight = tone === "light";
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const reqId = useRef(0);
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (q: string) => {
    const id = ++reqId.current;
    const instant = getInstantLocationResults(q, undefined, 6);
    setResults(instant);
    searchLocationsWithFallback(q, undefined, 7, undefined)
      .then((res) => {
        if (id === reqId.current && res.length) setResults(res);
      })
      .catch(() => {});
  };

  const handleChange = (t: string) => {
    onChangeText(t);
    setOpen(true);
    if (debTimer.current) clearTimeout(debTimer.current);
    if (t.trim().length === 0) {
      setResults(getInstantLocationResults("", undefined, 6));
      return;
    }
    debTimer.current = setTimeout(() => runSearch(t), 220);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
    if (value.trim().length === 0) setResults(getInstantLocationResults("", undefined, 6));
    else runSearch(value);
  };

  const handleBlur = () => {
    // Delay so a row press registers before the menu closes.
    blurTimer.current = setTimeout(() => setOpen(false), 160);
  };

  const choose = (r: LocationResult) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    const label = (r.name && r.name.trim()) || formatLocationName(r);
    onSelect(label, r);
    setOpen(false);
  };

  const showMenu = open && results.length > 0;

  return (
    <View style={[styles.wrap, open && styles.wrapOpen]}>
      <View style={styles.field}>
        {icon}
        <TextInput
          style={[styles.input, isLight && styles.inputLight]}
          placeholder={placeholder}
          placeholderTextColor={isLight ? WEB.inkMuted : WEB.onForestMuted}
          value={value}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmit}
        />
        {trailing}
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.menuScroll}>
            {results.map((r, i) => {
              const isCurrent = (r.source === "current") || /current location/i.test(r.name || r.display_name || "");
              const primary = titleCaseLocation((r.name && r.name.trim()) || formatLocationName(r));
              // Drop a leading repeat of the primary name from the address
              // line (e.g. "Ahmedabad Junction, ahmedabad, India" → "Ahmedabad,
              // India") and title-case it so the casing is consistent.
              let secondary = (r.display_name || "").trim();
              if (secondary.toLowerCase().startsWith(primary.toLowerCase())) {
                secondary = secondary.slice(primary.length).replace(/^[\s,]+/, "");
              }
              secondary = titleCaseLocation(secondary);
              if (!secondary || secondary.toLowerCase() === primary.toLowerCase()) secondary = "";
              return (
                <Pressable
                  key={`${r.place_id || primary}-${i}`}
                  onPress={() => choose(r)}
                  style={({ hovered }: any) => [styles.row, hovered && styles.rowHover]}
                >
                  <PinIcon current={isCurrent} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowPrimary} numberOfLines={1}>{primary}</Text>
                    {secondary ? <Text style={styles.rowSecondary} numberOfLines={1}>{secondary}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, position: "relative", zIndex: 1 },
  wrapOpen: { zIndex: 100 },
  field: { flexDirection: "row", alignItems: "center", gap: 11, height: 54, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: FONT.bold, fontSize: 15.5, color: WEB.onForest, outlineStyle: "none" as any },
  inputLight: { color: WEB.forest },

  menu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: WEB.surfaceElevated,
    borderRadius: RADIUS.card,
    // Clip the row hover/selected rectangles to the rounded corners so
    // they don't poke out past the menu's rounded edge.
    overflow: "hidden",
    ...floatShadow,
    zIndex: 100,
  },
  menuScroll: { maxHeight: 296, paddingVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  rowHover: { backgroundColor: WEB.fieldFill },
  rowText: { flex: 1, minWidth: 0 },
  rowPrimary: { fontFamily: FONT.bold, fontSize: 14.5, color: WEB.forest },
  rowSecondary: { fontFamily: FONT.semibold, fontSize: 12, color: WEB.inkMuted, marginTop: 1 },
});

export default WebLocationInput;
