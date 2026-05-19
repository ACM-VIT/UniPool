/**
 * UniPool brand palette.
 *
 * The two core brand colours are `primaryLightGreen` (the lime canvas)
 * and `secondaryDarkGreen` (the forest ink + dark accent). Every other
 * tone in the app should be a tinted derivative of these two so the
 * brand reads coherently — no random `rgba(0,0,0,…)` hairlines, no
 * stray hex codes. If you need a new shade, add it here first.
 */
const AppColors = {
  // Brand
  primaryLightGreen: "#B5D750",
  secondaryDarkGreen: "#263B33",

  // Mid-tone derived from the brand lime — a deeper olive used when we
  // need a third surface that's still in the green family (e.g. self
  // chat bubbles on the lime canvas). Reads as "still on brand, but
  // distinctly its own thing" instead of forcing white into the mix.
  midOliveGreen: "#7FA336",

  // Basics
  basicBlack: "#000000",
  basicWhite: "#FFFFFF",
  basicRed: "#FF0000",

  // Tinted forest — for hairlines, dividers, muted body text, soft
  // disabled states. All derived from secondaryDarkGreen so the whole
  // app feels grounded in the same dark accent.
  inkSubtle: "rgba(38,59,51,0.08)", // hairlines + soft borders
  inkSoft: "rgba(38,59,51,0.16)",   // separators
  inkLine: "rgba(38,59,51,0.28)",   // sliders, drag handles, dividers
  inkMuted: "rgba(38,59,51,0.55)",  // muted labels, placeholder text
  inkStrong: "rgba(38,59,51,0.75)", // secondary body text

  // Card surface — slightly off-white cream that complements the lime
  // canvas. Stark `basicWhite` next to `primaryLightGreen` reads cheap;
  // this cream lets cards float on lime without fighting the brand.
  cardSurface: "#FFFDF4",
  cardSurfaceTinted: "rgba(255,253,244,0.65)", // for translucent overlays

  // Accent supports
  accentOrange: "#F09E5C", // warm orange pulled from the Beep Beep Vespa
  // illustration — used for badges, hosting indicators, "Just listed".
} as const;

export default AppColors;
