/**
 * UniPool theme palettes.
 *
 * Two palettes ship:
 *
 *   • `lightPalette` — the original brand palette. Every token here
 *     resolves to the EXACT historical AppColors value at the site
 *     that uses it. Light mode is a feature freeze; this file's job
 *     for light mode is to look like nothing ever changed.
 *
 *   • `darkPalette` — a true dark mode, not a forest-tinted twin of
 *     the lime theme. The point of shipping dark mode is to give
 *     people who don't want the green look an actual escape from
 *     it. So the canvas is neutral warm-charcoal with no green
 *     undertone, the surfaces are clean greys, and the lime accent
 *     stays only as a brand splash on CTAs / selected state /
 *     filled buttons (the Spotify-green-on-dark-grey pattern).
 *     Someone who picks dark mode shouldn't feel like they're
 *     still inside the lime brand at lower brightness — they
 *     should feel like they're inside a calm dark app that
 *     happens to use lime as its action color.
 */

export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

export interface Palette {
  /** Stable identifier for the palette (drives StatusBar barStyle, etc.). */
  mode: ThemeMode;

  // --- Brand --------------------------------------------------------------
  /** Primary brand accent. The lime that defines UniPool's identity.
   *  Unchanged across modes — brand consistency wins. */
  primary: string;
  /** Slightly brighter variant for accent-on-dark fills where the standard
   *  lime needs more punch to clear contrast on a deep canvas. */
  primaryStrong: string;
  /** Forest-on-cream ink in light mode; neutral dim grey in dark mode
   *  (intentionally NOT a forest tint — that'd reintroduce the green). */
  secondary: string;
  /** Mid olive — used for "still on brand" thirds like self chat bubbles. */
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
  /** Background for the "selected" RideCard. Light: deep forest
   *  (#1e4620, the historical highlight). Dark: lime fill — the
   *  brand splash IS the highlight in a neutral dark palette. */
  cardSelected: string;
  /** Text/icons painted on top of `cardSelected`. Light: white on
   *  forest. Dark: deep canvas on lime. */
  cardSelectedText: string;

  // --- Text / ink --------------------------------------------------------
  /** Primary foreground text. Light: forest ink. Dark: warm off-white
   *  with NO green undertone — explicitly avoiding the "forest at
   *  night" feel. */
  textPrimary: string;
  /** Secondary body text (~65-70% opacity). */
  textSecondary: string;
  /** Tertiary labels / captions (~45% opacity). */
  textTertiary: string;
  /** Disabled / placeholder text (~28% opacity). */
  textDisabled: string;
  /** Foreground for content sitting on the lime accent fill (CTAs,
   *  pills, selected dark-mode card). Forest ink in both modes —
   *  this is the canonical "text on lime" pairing. */
  textOnAccent: string;
  /** Foreground for content sitting on ANY dark surface (the legacy
   *  forest navbar in light, the dark-mode canvas in dark). Always
   *  a light cream / off-white. */
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
  /** Nav-bar pill fill. Light: forest (the historical navbar
   *  background — NOT cream). Dark: raised charcoal. */
  navFill: string;
  /** Active tab icon / label color sitting on `navFill`. */
  navIconActive: string;
  /** Inactive tab icon / label color sitting on `navFill`. */
  navIconInactive: string;
  /** Brand-mark + primary header text color (the "UniPool" wordmark). */
  brandText: string;
}

// ----------------------------------------------------------------------------
// Light palette — EXACT historical AppColors values at every site.
// Goal: light mode renders bit-for-bit identically to pre-theme.
// Any token whose value here doesn't match what the original code
// painted at the same site is a regression — keep this in lockstep
// with the design_systems/colors.tsx defaults.
// ----------------------------------------------------------------------------
export const lightPalette: Palette = {
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

  // Historical RideCard styles.selectedCard hardcoded these exact
  // values — keep them so light-mode selection looks unchanged.
  cardSelected: "#1e4620",
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
  // The historical MainNavBar pill was FOREST (#263B33), not cream.
  // navIconActive (white) and navIconInactive (lime) match the old
  // hardcoded basicWhite / primaryLightGreen.
  navFill: "#263B33",
  navIconActive: "#FFFFFF",
  navIconInactive: "#B5D750",
  brandText: "#263B33",
};

// ----------------------------------------------------------------------------
// Dark palette — deep forest green canvas. The brand's secondary
// (`#263B33`) is the daytime forest; the dark canvas sits a few
// stops below it, near-black but unmistakably green-undertoned.
// Lime stays as the brand splash on CTAs and selected states; the
// background, surfaces, and elevated panels all tier within the
// same forest family so the dark mode feels like a continuation of
// the brand identity rather than a generic charcoal theme.
// ----------------------------------------------------------------------------
export const darkPalette: Palette = {
  mode: "dark",

  // Brand splash only — lime appears on CTAs, selected cards, and
  // chip fills. Never as the canvas. Brighter `primaryStrong` for
  // filled buttons where the standard lime needs an extra nudge to
  // clear contrast against the deep canvas.
  primary: "#B5D750",
  primaryStrong: "#C8E664",
  // Neutral mid-grey for the "secondary" role — deliberately NOT a
  // forest tone. Pairs cleanly with primary text without
  // re-introducing the green.
  secondary: "#9CA3A0",
  midAccent: "#7FA336",

  // Canvas + surfaces — warm charcoal hierarchy. Tiny warmth bias
  // (#11 / #12 instead of #10 / #11 across channels) keeps the
  // greys from feeling clinical, without leaning green. The point
  // of shipping dark mode is to ESCAPE the lime brand for users
  // who don't enjoy the green look — anything forest-tinted would
  // reintroduce the green and defeat the purpose.
  background: "#0F0F12",         // app canvas — near-black, warm bias
  surface: "#18181C",            // raised card (+~6 brightness from canvas)
  surfaceElevated: "#22222A",    // modals / sheets (+~13)
  surfaceInset: "#08080B",       // recessed inputs (-~3)
  surfaceTinted: "rgba(24,24,28,0.80)",

  // Selected-card highlight — used by the "tap to select" card in
  // ride search results and the standalone card on Ride Management.
  // Originally the lime brand splash in dark mode, but in practice
  // a fully-lime card on a charcoal canvas reads as an iOS-style
  // CTA pill rather than a "this is the active ride" affordance.
  // Switched to a one-tier-brighter charcoal (#26262E) with the
  // standard cream text on top — gives the card the lift the
  // selected state needs without shouting at the user. The brand
  // splash still lives on the price pill / slider thumb / CTAs.
  cardSelected: "#26262E",
  cardSelectedText: "#F2EBD0",

  // Warm off-white. The `#EDECE7` is chosen to feel like cream
  // shifted into a true neutral — no green tint, slight cream/warm
  // bias for personality. Pure white reads as sterile against the
  // warm canvas.
  textPrimary: "#EDECE7",
  textSecondary: "rgba(237,236,231,0.68)",
  textTertiary: "rgba(237,236,231,0.46)",
  textDisabled: "rgba(237,236,231,0.28)",
  // Same forest stays the right text-on-lime — the brand splash
  // pairing carries across both modes.
  textOnAccent: "#0F0F12",
  textOnDark: "#EDECE7",

  // Neutral white hairlines — deliberately NOT lime-tinted. A
  // lime-tinted hairline would pull the eye toward the brand
  // accent on every divider, which is the opposite of restraint.
  inkSubtle: "rgba(237,236,231,0.05)",
  inkSoft: "rgba(237,236,231,0.10)",
  inkLine: "rgba(237,236,231,0.18)",
  inkMuted: "rgba(237,236,231,0.50)",
  inkStrong: "rgba(237,236,231,0.75)",

  // Slightly warmer destructive — pure iOS red looks neon against a
  // charcoal canvas; this warmer red sits more naturally.
  destructive: "#FF6B5B",
  warning: "#F4A55C",
  // Lime echo for the "success" semantic so the brand voice still
  // colors the "yes" moments — but the standard lime, no tinting.
  success: "#C8E664",
  accentOrange: "#E8995A",

  statusBarStyle: "light-content",
  statusBarBackground: "#0F0F12",
  // Nav pill paints to a slightly elevated charcoal so it reads as
  // a floating chip on the canvas rather than flat chrome. Active
  // tabs use off-white text for high contrast; inactive sit at
  // ~45% opacity to recede without disappearing.
  navFill: "#1F1F25",
  navIconActive: "#EDECE7",
  navIconInactive: "rgba(237,236,231,0.45)",
  brandText: "#EDECE7",
};

export const palettes: Record<ThemeMode, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
