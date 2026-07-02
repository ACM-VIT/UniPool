/**
 * UniPool theme palettes.
 *
 * Light mode preserves the original lime/forest brand system. Dark mode keeps
 * lime for actions and selected states while moving the canvas and surfaces to
 * neutral charcoal tokens.
 */

export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

export interface Palette {
  /** Stable identifier for the palette (drives StatusBar barStyle, etc.). */
  mode: ThemeMode;

  // --- Brand --------------------------------------------------------------
  /** Primary brand accent, unchanged across modes. */
  primary: string;
  /** Slightly brighter variant for accent-on-dark fills where the standard
   *  lime needs more contrast on a deep canvas. */
  primaryStrong: string;
  /** Secondary brand or neutral accent, depending on mode. */
  secondary: string;
  /** Mid olive used for tertiary brand surfaces. */
  midAccent: string;

  // --- Canvas / surface hierarchy ----------------------------------------
  /** App backdrop. Light: lime canvas. Dark: neutral warm-charcoal. */
  background: string;
  /** Cards floating on the canvas. Light: cream. Dark: raised charcoal. */
  surface: string;
  /** Sheets / modals / elevated surfaces. Light: white. Dark: most-raised charcoal. */
  surfaceElevated: string;
  /** Pressed-in fields (inputs, search bars). Light: same as surface. Dark: recessed below canvas. */
  surfaceInset: string;
  /** Translucent overlay variant of `surface`. */
  surfaceTinted: string;

  // --- Card state --------------------------------------------------------
  /** Background for selected ride cards. */
  cardSelected: string;
  /** Text/icons painted on top of `cardSelected`. */
  cardSelectedText: string;

  // --- Text / ink --------------------------------------------------------
  /** Primary foreground text. */
  textPrimary: string;
  /** Secondary body text (~65-70% opacity). */
  textSecondary: string;
  /** Tertiary labels / captions (~45% opacity). */
  textTertiary: string;
  /** Disabled / placeholder text (~28% opacity). */
  textDisabled: string;
  /** Foreground for content sitting on the lime accent fill. */
  textOnAccent: string;
  /** Foreground for content sitting on dark surfaces. */
  textOnDark: string;

  // --- Tinted ink hairlines (mirrors legacy AppColors.inkSubtle etc.) ----
  inkSubtle: string;
  inkSoft: string;
  inkLine: string;
  inkMuted: string;
  inkStrong: string;

  // --- Semantic ----------------------------------------------------------
  destructive: string;
  warning: string;
  success: string;
  accentOrange: string;

  // --- Status bar / nav chrome ------------------------------------------
  statusBarStyle: "light-content" | "dark-content";
  statusBarBackground: string;
  /** Nav-bar pill fill. */
  navFill: string;
  /** Active tab icon / label color sitting on `navFill`. */
  navIconActive: string;
  /** Inactive tab icon / label color sitting on `navFill`. */
  navIconInactive: string;
  /** Brand-mark + primary header text color (the "UniPool" wordmark). */
  brandText: string;
}

// ----------------------------------------------------------------------------
// Light palette: original AppColors-compatible brand values.
// ----------------------------------------------------------------------------
const lightPalette: Palette = {
  mode: "light",

  primary: "#B5D750",          // = AppColors.primaryLightGreen
  primaryStrong: "#B5D750",
  secondary: "#263B33",        // = AppColors.secondaryDarkGreen
  midAccent: "#7FA336",        // = AppColors.midOliveGreen

  background: "#B5D750",       // canvas was the lime everywhere
  surface: "#FFFDF4",          // = AppColors.cardSurface
  surfaceElevated: "#FFFFFF",  // = AppColors.basicWhite (modals / sheets)
  surfaceInset: "#FFFDF4",
  surfaceTinted: "rgba(255,253,244,0.65)", // = AppColors.cardSurfaceTinted

  // The selected ride card uses the brand forest (secondaryDarkGreen), so it
  // matches every other forest surface. Was a legacy #1e4620 that read as an
  // off, over-saturated green next to the real palette.
  cardSelected: "#263B33",
  cardSelectedText: "#FFFFFF",

  textPrimary: "#263B33",
  textSecondary: "rgba(38,59,51,0.75)", // = legacy inkStrong
  textTertiary: "rgba(38,59,51,0.55)",  // = legacy inkMuted
  textDisabled: "rgba(38,59,51,0.30)",
  textOnAccent: "#263B33",     // forest text on lime fill
  textOnDark: "#FFFFFF",       // = AppColors.basicWhite (text on forest navbar)

  inkSubtle: "rgba(38,59,51,0.08)",
  inkSoft: "rgba(38,59,51,0.16)",
  inkLine: "rgba(38,59,51,0.28)",
  inkMuted: "rgba(38,59,51,0.55)",
  inkStrong: "rgba(38,59,51,0.75)",

  destructive: "#FF3B30",      // = AppColors.destructive
  warning: "#F4A55C",
  success: "#7FA336",
  accentOrange: "#F09E5C",     // = AppColors.accentOrange

  statusBarStyle: "dark-content",
  statusBarBackground: "#B5D750",
  navFill: "#263B33",
  navIconActive: "#FFFFFF",
  navIconInactive: "#B5D750",
  brandText: "#263B33",
};

// ----------------------------------------------------------------------------
// Dark palette: neutral charcoal surfaces with lime reserved for brand actions.
// ----------------------------------------------------------------------------
const darkPalette: Palette = {
  mode: "dark",

  // Lime appears on CTAs, selected states, and chip fills.
  primary: "#B5D750",
  primaryStrong: "#C8E664",
  secondary: "#9CA3A0",
  midAccent: "#7FA336",

  // Canvas and surface hierarchy.
  background: "#0F0F12",         // app canvas — near-black, warm bias
  surface: "#18181C",            // raised card (+~6 brightness from canvas)
  surfaceElevated: "#22222A",    // modals / sheets (+~13)
  surfaceInset: "#08080B",       // recessed inputs (-~3)
  surfaceTinted: "rgba(24,24,28,0.80)",

  // Selected ride cards use a raised dark surface; lime remains reserved
  // for price pills, slider thumbs, and CTAs.
  cardSelected: "#26262E",
  cardSelectedText: "#F2EBD0",

  // Warm off-white foreground on charcoal.
  textPrimary: "#EDECE7",
  textSecondary: "rgba(237,236,231,0.68)",
  textTertiary: "rgba(237,236,231,0.46)",
  textDisabled: "rgba(237,236,231,0.28)",
  textOnAccent: "#0F0F12",
  textOnDark: "#EDECE7",

  // Neutral white hairlines keep dividers separate from brand actions.
  inkSubtle: "rgba(237,236,231,0.05)",
  inkSoft: "rgba(237,236,231,0.10)",
  inkLine: "rgba(237,236,231,0.18)",
  inkMuted: "rgba(237,236,231,0.50)",
  inkStrong: "rgba(237,236,231,0.75)",

  destructive: "#FF6B5B",
  warning: "#F4A55C",
  success: "#C8E664",
  accentOrange: "#E8995A",

  statusBarStyle: "light-content",
  statusBarBackground: "#0F0F12",
  navFill: "#1F1F25",
  navIconActive: "#EDECE7",
  navIconInactive: "rgba(237,236,231,0.45)",
  brandText: "#EDECE7",
};

export const palettes: Record<ThemeMode, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
