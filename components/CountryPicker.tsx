import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Platform,
  Pressable,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import type { ListRenderItem } from "react-native";
import Svg, { Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import { COUNTRIES, Country, flagFor } from "../data/countries";
import { haptic } from "./haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_TABLET = SCREEN_WIDTH >= 768;
// Sheet height: 78% of the canvas on phone reads as "tall search
// sheet". On a 1376pt iPad that math gives 1073pt which dominates the
// screen — capping at 620pt keeps the sheet feeling like a focused
// modal instead of a fullscreen takeover.
const SHEET_HEIGHT = IS_TABLET
  ? Math.min(620, SCREEN_HEIGHT * 0.78)
  : SCREEN_HEIGHT * 0.78;
// translateY needs to start far enough below the docked position
// that the spring-in still reads as a slide-up. On phones SCREEN_HEIGHT
// is the historical value; on iPad the sheet is shorter so we use
// the sheet height + a comfortable margin instead.
const SHEET_OFFSCREEN = IS_TABLET ? SHEET_HEIGHT + 80 : SCREEN_HEIGHT;

type Props = {
  visible: boolean;
  selectedCode?: string;
  onSelect: (country: Country) => void;
  onDismiss: () => void;
};

type ThemeColors = ReturnType<typeof useThemeColors>;

type CountryRowProps = {
  item: Country;
  selected: boolean;
  colors: ThemeColors;
  onPick: (country: Country) => void;
};

const CountryRow = React.memo(function CountryRow({
  item,
  selected,
  colors,
  onPick,
}: CountryRowProps) {
  const handlePress = useCallback(() => {
    onPick(item);
  }, [item, onPick]);

  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Text style={styles.flag}>{flagFor(item.code)}</Text>
      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text
        style={[
          styles.dial,
          { color: colors.textSecondary },
          selected && [styles.dialSelected, { color: colors.textPrimary }],
        ]}
      >
        +{item.dial}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * Bottom-sheet country picker for the phone-number input. Search-as-
 * you-type against both country name and dial code; selecting closes
 * the sheet and fires `onSelect`. Mirrors the chrome (slide-up,
 * backdrop, grab handle, close X) of the verify-academic-status
 * sheet so the app's modal language stays consistent.
 */
const CountryPicker: React.FC<Props> = ({ visible, selectedCode, onSelect, onDismiss }) => {
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      haptic("selection");
      setQuery("");
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
          toValue: SHEET_OFFSCREEN,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const dialQuery = q.replace(/[^\d]/g, "");
    // Allow searching by name OR by raw dial code ("44" matches UK).
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (dialQuery.length > 0 && c.dial.startsWith(dialQuery)),
    );
  }, [query]);

  const handlePick = useCallback((c: Country) => {
    haptic("selection");
    onSelect(c);
    onDismiss();
  }, [onDismiss, onSelect]);

  const renderCountry = useCallback<ListRenderItem<Country>>(
    ({ item }) => (
      <CountryRow
        item={item}
        selected={item.code === selectedCode}
        colors={colors}
        onPick={handlePick}
      />
    ),
    [colors, handlePick, selectedCode],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={{ ...fill, backgroundColor: "rgba(0,0,0,0.42)", opacity: backdrop }}
      >
        <Pressable style={fill} onPress={onDismiss} />
      </Animated.View>

      <KeyboardAvoidingView
        // Same fix as SheetShell / the UPI sheet: explicit
        // `behavior="height"` on Android so the search input inside
        // this country-picker sheet doesn't stay hidden behind the
        // keyboard. `adjustResize` on the manifest doesn't reach
        // into transparent statusBarTranslucent Modals.
        //
        // `alignItems: 'center'` is a no-op on phones (where the
        // inner sheet's `maxWidth: 540` is wider than the window),
        // and on iPad it centres the phone-shape sheet horizontally
        // instead of letting it stretch across the 1032pt canvas.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ ...fill, justifyContent: "flex-end", alignItems: "center" }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 540,
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            height: SHEET_HEIGHT,
            transform: [{ translateY }],
            shadowColor: AppColors.basicBlack,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.22,
            shadowRadius: 28,
            elevation: 18,
          }}
        >
          <View style={[styles.grabHandle, colors.mode === "dark" && { backgroundColor: colors.inkLine }]} />

          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.6}
            style={[styles.closeBtn, { backgroundColor: colors.inkSubtle }]}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16">
              <Path
                d="M3 3 L 13 13 M13 3 L 3 13"
                stroke={colors.textPrimary}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Pick your country</Text>

          <View style={[styles.searchWrap, colors.mode === "dark" && { backgroundColor: colors.surfaceInset }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
              <Path
                d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                stroke={colors.textPrimary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or code"
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={renderCountry}
            ListEmptyComponent={
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>No countries match "{query}".</Text>
            }
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CountryPicker;

const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

const styles = {
  grabHandle: {
    alignSelf: "center" as const,
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(38,59,51,0.18)",
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 22,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(38,59,51,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 4,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    marginBottom: 14,
    paddingRight: 44,
  },
  searchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(38,59,51,0.05)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    paddingVertical: 0,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: "rgba(181,215,80,0.20)",
  },
  flag: {
    fontSize: 24,
    width: 32,
  },
  name: {
    flex: 1,
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.1,
  },
  dial: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
  },
  dialSelected: {
    fontFamily: "NunitoSans_800ExtraBold" as const,
  },
  emptyHint: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    textAlign: "center" as const,
    paddingVertical: 24,
  },
};
