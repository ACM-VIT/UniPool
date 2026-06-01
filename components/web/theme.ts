// Web design tokens.
//
// Direction ("quiet product, brand on the edges"): production web apps
// (Uber, Airbnb, Zillow, Spotify) sit on near-white surfaces and build
// hierarchy from type weight and ink opacity, using their brand colour
// as a sparing accent. UniPool keeps its identity (forest chrome, lime
// accent, Trap display, cream warmth) but content lives on cream/white,
// cards are separated by hairlines rather than drop shadows, and lime is
// the highlight, never the wall.
import AppColors from "../../design_systems/colors";

export const WEB = {
  // --- Brand ---
  lime: AppColors.primaryLightGreen, // #B5D750 — accent only (CTA pill, active underline, selected pin)
  forest: AppColors.secondaryDarkGreen, // #263B33 — nav chrome, ink, primary CTA fill, selected border
  cream: AppColors.cardSurface, // #FFFDF4
  midOlive: AppColors.midOliveGreen,
  orange: AppColors.accentOrange, // semantic only (errors, declined)
  selected: "#1e4620",
  forestDeep: "#1E2F28",

  // --- Surfaces ---
  page: AppColors.cardSurface, // cream page background
  surface: "#FFFFFF", // white cards / list rows
  fieldFill: "#F4F1E6", // recessed input fill on a light card

  // --- Forest ink ramp (never raw black) ---
  inkStrong: AppColors.inkStrong, // rgba(38,59,51,0.75) body
  inkMuted: AppColors.inkMuted, // rgba(38,59,51,0.55) meta / placeholder
  inkLine: AppColors.inkLine, // rgba(38,59,51,0.28) connectors
  inkSubtle: AppColors.inkSubtle, // rgba(38,59,51,0.08)
  hairline: "rgba(38,59,51,0.10)", // card / row borders

  // --- On forest chrome ---
  onForest: AppColors.cardSurface,
  onForestMuted: "rgba(255,253,244,0.72)",
  onForestFaint: "rgba(255,253,244,0.55)",
  onForestLine: "rgba(255,253,244,0.12)",
  limeMuted: "rgba(181,215,80,0.85)",
} as const;

// One small radius for cards/inputs/map, plus pills. (Names kept for
// existing call sites; all the rectangular ones resolve to 12.)
export const RADIUS = {
  field: 12,
  button: 12,
  card: 12,
  cardLg: 12,
  sheet: 12,
  pill: 999,
} as const;

// Hairline border for resting cards and list rows — spread into a style.
export const cardBorder = {
  borderWidth: 1,
  borderColor: WEB.hairline,
} as const;

// The ONE soft shadow, reserved for genuinely floating layers: the
// sticky fare card, map-pin popovers, dropdowns, modals. Resting cards
// use cardBorder instead.
export const floatShadow = {
  shadowColor: WEB.forest,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
} as const;

// Font families (registered in components/AppShell via expo-font +
// @expo-google-fonts/nunito-sans). Trap is the display family, used only
// for the single largest element on a screen; NunitoSans carries the
// rest, with hierarchy from weight + ink opacity.
export const FONT = {
  displayBlack: "Trap-Black",
  display: "Trap-Bold",
  displayMed: "Trap-Medium",
  black: "NunitoSans_800ExtraBold",
  bold: "NunitoSans_700Bold",
  semibold: "NunitoSans_600SemiBold",
  regular: "NunitoSans_400Regular",
} as const;

// Forest gradient stops for the one allowed expressive surface (the auth
// brand panel). No lime atmosphere elsewhere.
export const ATMOS = {
  forestTop: WEB.forest,
  forestDeep: WEB.forestDeep,
  forestGlow: "#33513F",
} as const;

export const WEB_CONTENT_MAX = 1100;
