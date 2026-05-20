import React, { useEffect, useMemo, useRef, useState } from "react";
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
import Svg, { Path } from "react-native-svg";
import AppColors from "../design_systems/colors";
import { COUNTRIES, Country, flagFor } from "../data/countries";
import { haptic } from "./PressableScale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  selectedCode?: string;
  onSelect: (country: Country) => void;
  onDismiss: () => void;
};

/**
 * Bottom-sheet country picker for the phone-number input. Search-as-
 * you-type against both country name and dial code; selecting closes
 * the sheet and fires `onSelect`. Mirrors the chrome (slide-up,
 * backdrop, grab handle, close X) of the verify-academic-status
 * sheet so the app's modal language stays consistent.
 */
const CountryPicker: React.FC<Props> = ({ visible, selectedCode, onSelect, onDismiss }) => {
  const [query, setQuery] = useState("");
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
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
          toValue: SCREEN_HEIGHT,
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
    // Allow searching by name OR by raw dial code ("44" matches UK).
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q.replace(/[^\d]/g, "")),
    );
  }, [query]);

  const handlePick = (c: Country) => {
    haptic("selection");
    onSelect(c);
    onDismiss();
  };

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ ...fill, justifyContent: "flex-end" }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            backgroundColor: AppColors.basicWhite,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            height: SCREEN_HEIGHT * 0.78,
            transform: [{ translateY }],
            shadowColor: AppColors.basicBlack,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.22,
            shadowRadius: 28,
            elevation: 18,
          }}
        >
          <View style={styles.grabHandle} />

          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.6}
            style={styles.closeBtn}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16">
              <Path
                d="M3 3 L 13 13 M13 3 L 3 13"
                stroke={AppColors.secondaryDarkGreen}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>

          <Text style={styles.title}>Pick your country</Text>

          <View style={styles.searchWrap}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
              <Path
                d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                stroke={AppColors.secondaryDarkGreen}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or code"
              placeholderTextColor="rgba(38,59,51,0.40)"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => {
              const selected = item.code === selectedCode;
              return (
                <TouchableOpacity
                  style={[styles.row, selected && styles.rowSelected]}
                  activeOpacity={0.7}
                  onPress={() => handlePick(item)}
                >
                  <Text style={styles.flag}>{flagFor(item.code)}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.dial, selected && styles.dialSelected]}>
                    +{item.dial}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyHint}>No countries match "{query}".</Text>
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
    color: AppColors.secondaryDarkGreen,
    opacity: 1,
    fontFamily: "NunitoSans_800ExtraBold",
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
