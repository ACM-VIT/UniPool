import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName, StyleSheet } from "react-native";
import AsyncStorage from "../utils/safeAsyncStorage";
import { palettes, Palette, ThemeMode, ThemePreference } from "../design_systems/palettes";

/**
 * Theme provider and palette resolver.
 * `preference` is the stored user setting, `systemMode` mirrors the OS, and
 * `mode` is the palette currently used by consumers.
 */

const STORAGE_KEY = "@unipool:theme-preference";

interface ThemeContextValue {
  /** Palette currently used by consumers. */
  colors: Palette;
  /** Resolved active mode after applying user and system preferences. */
  mode: ThemeMode;
  /** User's stored theme preference. */
  preference: ThemePreference;
  /** Persist a new theme preference. */
  setPreference: (next: ThemePreference) => void;
  /** True once the persisted preference has been read from storage. */
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(preference: ThemePreference, system: ThemeMode): ThemeMode {
  // Dark mode remains disabled for this release, but the preference and system
  // listeners stay wired so the resolver can be re-enabled without migration.
  void preference;
  void system;
  return "light";
}

function normalizeSystem(scheme: ColorSchemeName | null | undefined): ThemeMode {
  return scheme === "dark" ? "dark" : "light";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed from the current OS setting before the subscription fires.
  const [systemMode, setSystemMode] = useState<ThemeMode>(() =>
    normalizeSystem(Appearance.getColorScheme()),
  );

  // Use 'system' until persisted storage resolves.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  // Storage failures fall back to the default preference.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep system mode current while the app is open.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(normalizeSystem(colorScheme));
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // The in-memory preference still applies for the current session.
    });
  }, []);

  const mode = resolveMode(preference, systemMode);
  const colors = palettes[mode];

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, preference, setPreference, hydrated }),
    [colors, mode, preference, setPreference, hydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Read the active theme context.
 */
export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme() called outside ThemeProvider. Wrap the app root in <ThemeProvider>.",
    );
  }
  return ctx;
}

/**
 * Convenience hook for components that only need palette tokens.
 */
export function useThemeColors(): Palette {
  return useTheme().colors;
}

/**
 * Build theme-aware styles from the active palette.
 *
 * Usage:
 *
 *   const styles = useThemedStyles((c) => ({
 *     container: { backgroundColor: c.background },
 *     title:     { color: c.textPrimary, fontSize: 18 },
 *   }));
 *
 * The factory runs on palette changes and is memoized between them.
 */
type NamedStyles<T> = { [P in keyof T]: Record<string, unknown> };

function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: Palette) => T,
): T {
  const colors = useThemeColors();
  return useMemo(() => StyleSheet.create(factory(colors)) as T, [colors, factory]);
}
