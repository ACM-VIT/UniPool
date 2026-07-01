// Web design tokens.
//
// Direction ("lime-forward, web-native"): the web is the SAME product as the
// app, so it wears the same skin. The mobile light palette
// (design_systems/palettes.ts) is the source of truth — `background` is the
// lime canvas "everywhere", cream (#FFFDF4) cards float on top of it, forest
// (#263B33) carries the nav chrome + hero cards + primary buttons, and lime is
// the wall, not a timid accent. We mirror that here so a brand change on the
// app shows up on the web. The only web-specific job is composing those
// surfaces with web rhythm (wide max-widths, grids, oversized Trap heroes) so
// it reads as a product on a big screen, not a phone stretched to 1440.
import AppColors from "../../design_systems/colors";
import { palettes } from "../../design_systems/palettes";

const light = palettes.light;

export const WEB = {
  // --- Brand ---
  lime: AppColors.primaryLightGreen, // #B5D750 — the canvas + price pills + active states
  forest: AppColors.secondaryDarkGreen, // #263B33 — nav chrome, ink, hero cards, primary CTA fill
  cream: AppColors.cardSurface, // #FFFDF4 — the card surface that floats on lime
  midOlive: AppColors.midOliveGreen,
  orange: AppColors.accentOrange, // semantic (errors, declined, hosting)
  selected: light.cardSelected, // #1e4620 — selected ride card
  forestDeep: "#1E2F28",

  // --- Surfaces (mobile relationship: cream cards on a lime canvas) ---
  page: light.background, // #B5D750 — lime canvas, the body of every page
  surface: light.surface, // #FFFDF4 — cream cards / list rows on the lime
  surfaceElevated: light.surfaceElevated, // #FFFFFF — modals / dropdowns / popovers
  fieldFill: "#F4F1E6", // recessed input fill inside a cream card
  onForestField: "rgba(255,253,244,0.12)", // recessed input fill inside a forest hero card

  // --- Forest ink ramp (never raw black) ---
  inkStrong: AppColors.inkStrong, // rgba(38,59,51,0.75) body
  inkMuted: AppColors.inkMuted, // rgba(38,59,51,0.55) meta / placeholder
  inkLine: AppColors.inkLine, // rgba(38,59,51,0.28) connectors / rails
  inkSubtle: AppColors.inkSubtle, // rgba(38,59,51,0.08)
  hairline: "rgba(38,59,51,0.10)", // faint card / row definition (paired with cardFloat)

  // --- On forest chrome / hero cards ---
  onForest: AppColors.cardSurface, // cream text on forest
  onForestMuted: "rgba(255,253,244,0.72)",
  onForestFaint: "rgba(255,253,244,0.55)",
  onForestLine: "rgba(255,253,244,0.12)",
  limeMuted: "rgba(181,215,80,0.85)",
} as const;

// Friendly, app-like rounding (mirrors the premium webapp's radius scale:
// md 16 / lg ~24 / xl 32). Cards generous, fields a touch tighter, pills round.
export const RADIUS = {
  field: 12,
  button: 14,
  card: 16,
  cardLg: 24,
  sheet: 24,
  pill: 999,
} as const;

// A faint hairline that gives a resting cream card just enough edge on the lime
// canvas — spread into a style alongside `cardFloat`.
export const cardBorder = {
  borderWidth: 1,
  borderColor: WEB.hairline,
} as const;

// Soft elevation for cream cards floating on the lime canvas. This is the
// everyday card shadow (the "quiet web" direction banned shadows because it
// sat cards on a near-white page; on lime they need to lift). Kept gentle and
// forest-tinted so it reads warm, not heavy.
export const cardFloat = {
  shadowColor: WEB.forest,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
} as const;

// The stronger shadow, reserved for genuinely floating layers: dropdowns,
// map-pin popovers, modals, the sticky fare card.
export const floatShadow = {
  shadowColor: WEB.forest,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.16,
  shadowRadius: 40,
} as const;

// Font families. The brand's premium web (unipool-webapp) is set entirely in
// Nunito Sans — headlines at 800/900 with tight tracking, never a heavy
// geometric display face. The old Trap display read as too heavy / off-brand,
// so the web is now all Nunito Sans, with hierarchy from weight + tracking +
// ink opacity. (Trap stays loaded for native; it just isn't used on web.)
export const FONT = {
  displayBlack: "NunitoSans_800ExtraBold",
  display: "NunitoSans_800ExtraBold",
  displayMed: "NunitoSans_700Bold",
  black: "NunitoSans_800ExtraBold",
  bold: "NunitoSans_700Bold",
  semibold: "NunitoSans_600SemiBold",
  regular: "NunitoSans_400Regular",
} as const;

// Forest gradient stops for expressive forest surfaces (the auth brand panel,
// the footer band, the home hero copy block).
export const ATMOS = {
  forestTop: WEB.forest,
  forestDeep: WEB.forestDeep,
  forestGlow: "#33513F",
} as const;

export const WEB_CONTENT_MAX = 1100;
