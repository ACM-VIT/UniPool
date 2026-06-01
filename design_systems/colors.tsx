/**
 * UniPool brand palette.
 *
 * The two core brand colours are `primaryLightGreen` (the lime canvas)
 * and `secondaryDarkGreen` (the forest ink + dark accent). Every other
 * tone in the app should be a tinted derivative of these two so the
 * brand stays coherent. If you need a new shade, add it here first.
 */
const AppColors = {
  // Brand
  primaryLightGreen: "#B5D750",
  secondaryDarkGreen: "#263B33",

  // Mid-tone derived from the brand lime for tertiary brand surfaces.
  midOliveGreen: "#7FA336",

  // Basics
  basicBlack: "#000000",
  basicWhite: "#FFFFFF",
  basicRed: "#FF0000",

  // Canonical destructive red for delete, reject, and removal flows.
  destructive: "#FF3B30",

  // Forest-tinted hairlines, dividers, muted text, and disabled states.
  inkSubtle: "rgba(38,59,51,0.08)", // hairlines + soft borders
  inkSoft: "rgba(38,59,51,0.16)",   // separators
  inkLine: "rgba(38,59,51,0.28)",   // sliders, drag handles, dividers
  inkMuted: "rgba(38,59,51,0.55)",  // muted labels, placeholder text
  inkStrong: "rgba(38,59,51,0.75)", // secondary body text

  // Off-white card surface for content on the lime canvas.
  cardSurface: "#FFFDF4",
  cardSurfaceTinted: "rgba(255,253,244,0.65)", // for translucent overlays

  // Accent supports
  accentOrange: "#F09E5C", // badges, hosting indicators, and "Just listed".
} as const;

export default AppColors;
