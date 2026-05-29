import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName, StyleSheet } from "react-native";
import AsyncStorage from "../utils/safeAsyncStorage";
import { palettes, Palette, ThemeMode, ThemePreference } from "../design_systems/palettes";

/**
 * Theme provider.
 *
 * One source of truth for the active palette. Three pieces of state:
 *
 *   • `preference`  — the USER intent: 'system' | 'light' | 'dark'.
 *                     Persisted to AsyncStorage.
 *   • `systemMode`  — the OS-reported scheme (`useColorScheme`-ish).
 *                     Live-updates via `Appearance.addChangeListener`
 *                     so changing the device-level theme while the
 *                     app is open repaints instantly.
 *   • `mode`        — the resolved active mode. If preference is
 *                     'system' we mirror systemMode; otherwise the
 *                     preference wins.
 *
 * Most consumers only care about `colors`. The toggle UI is the only
 * place that needs `preference` / `setPreference`.
 *
 * NOTE on migration: module-scope `StyleSheet.create()` snapshots
 * color values at module load. Existing files that import the
 * legacy `AppColors` default export will keep painting in the light
 * palette. To make a component theme-aware, switch its styles to
 * `useThemedStyles` (re-built whenever `colors` changes) and tag
 * any inline color overrides with `colors.X` rather than the
 * legacy hex.
 */

const STORAGE_KEY = "@unipool:theme-preference";

interface ThemeContextValue {
  /** The active palette — what consumers paint with. */
  colors: Palette;
  /** Resolved active mode (after applying preference + system). */
  mode: ThemeMode;
  /** The user's stored intent — drives the Profile toggle. */
  preference: ThemePreference;
  /** Persist a new preference. Synchronous from the UI's perspective. */
  setPreference: (next: ThemePreference) => void;
  /** True once the persisted preference has been read from storage —
   *  consumers that gate render on theme-aware paint can wait for
   *  this to avoid a light-mode flash on cold start. */
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(preference: ThemePreference, system: ThemeMode): ThemeMode {
  // Dark mode is temporarily disabled for the 2.0.8 / 2.0.9 release.
  // All theme infrastructure stays intact — `useThemeColors`, the
  // gated `colors.mode === "dark"` overrides, the persisted user
  // preference, the system listener — but the resolver always returns
  // `"light"` so consumers paint the light palette regardless of what
  // the user picked or what iOS reports.
  //
  // To re-enable: replace the body of this function with the commented
  // block below.
  //
  //   if (preference === "light" || preference === "dark") return preference;
  //   return system;
  //
  void preference;
  void system;
  return "light";
}

function normalizeSystem(scheme: ColorSchemeName | null | undefined): ThemeMode {
  return scheme === "dark" ? "dark" : "light";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed system mode synchronously so the very first render paints in
  // the right scheme (no light-mode flash before the listener fires).
  const [systemMode, setSystemMode] = useState<ThemeMode>(() =>
    normalizeSystem(Appearance.getColorScheme()),
  );

  // Seed preference with 'system' until AsyncStorage tells us
  // otherwise. The hydration flag lets gated consumers wait if they
  // care about the cold-start frame.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  // Read persisted preference once at mount. Failure mode is silent —
  // we stay on 'system' which is the right default.
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

  // Live system-theme subscription. The OS surfacing a different
  // scheme (Settings toggle, automatic sunset, etc.) should repaint
  // immediately rather than only on next cold start.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(normalizeSystem(colorScheme));
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persistence failure is non-fatal — the in-memory choice
      // still applies for the current session.
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
 * Read the active theme. Stable reference for the lifetime of a
 * given (mode, preference) pair — safe to put in dependency arrays.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme() called outside ThemeProvider. Wrap the app root in <ThemeProvider>.",
    );
  }
  return ctx;
}

/**
 * Convenience hook — most consumers only need the palette. Equivalent
 * to `useTheme().colors` but reads as the intent.
 */
export function useThemeColors(): Palette {
  return useTheme().colors;
}

/**
 * Build a `StyleSheet.create` result from a factory that receives the
 * active palette. Re-runs (and rebuilds the styles) whenever the
 * palette changes, so swapping themes mid-session re-paints without
 * a remount.
 *
 * Usage:
 *
 *   const styles = useThemedStyles((c) => ({
 *     container: { backgroundColor: c.background },
 *     title:     { color: c.textPrimary, fontSize: 18 },
 *   }));
 *
 * The factory is called on every theme change but the StyleSheet is
 * memoised across renders within the same palette, so per-render
 * cost is one shallow comparison.
 */
type NamedStyles<T> = { [P in keyof T]: Record<string, unknown> };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: Palette) => T,
): T {
  const colors = useThemeColors();
  return useMemo(() => StyleSheet.create(factory(colors)) as T, [colors, factory]);
}
