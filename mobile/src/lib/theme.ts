/**
 * TwoPlus member app design tokens.
 *
 * One source of truth for colour, spacing, radius, type and motion. Screens
 * import from here so the app stays visually coherent and a token change
 * moves every surface at once.
 *
 * The palette is deliberately narrow: near-black grounds, a warm bone text
 * ramp, and a single burgundy accent that carries action and progress. Glass
 * is used for the few layered surfaces (tab bar, sheet headers) and nowhere
 * else, because blur is expensive on mid-range phones.
 */

export const color = {
  // Grounds, darkest to lightest. Never pure black: #000 crushes on OLED
  // and kills the sense of depth the glass surfaces rely on.
  canvas: "#0B0B0D",
  surface: "#101014",
  surfaceRaised: "#16161C",
  surfaceOverlay: "#1C1C24",

  // Warm bone ramp. Tinted slightly warm so the app reads premium rather
  // than clinical.
  text: "#F4EFE7",
  textMuted: "#A8A29A",
  textFaint: "#6F6A63",

  // Burgundy, the single accent. `accent` for fills, `accentText` for text
  // on dark grounds (lighter so it clears 4.5:1), `accentSoft` for tints.
  accent: "#8E2B3F",
  accentBright: "#C4485F",
  accentText: "#E8899C",
  accentSoft: "rgba(196,72,95,0.14)",

  // Semantic. Green means "good/hit target", amber "attention", red "failed".
  success: "#4FA97C",
  successSoft: "rgba(79,169,124,0.14)",
  warning: "#D8A24A",
  warningSoft: "rgba(216,162,74,0.14)",
  danger: "#D2585F",
  dangerSoft: "rgba(210,88,95,0.14)",
  info: "#5B93C9",
  infoSoft: "rgba(91,147,201,0.14)",

  // Hairlines. `line` for resting edges, `lineStrong` for emphasis.
  line: "rgba(244,239,231,0.09)",
  lineStrong: "rgba(244,239,231,0.16)",

  // Glass. Kept opaque enough to hold contrast over photography.
  glass: "rgba(22,22,28,0.82)",
  glassBorder: "rgba(244,239,231,0.12)",
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Type ramp. Sizes are chosen for a 390pt phone and scale by role: display
 * for the one hero number per screen, then steadily down. Line heights are
 * ~1.35x for body copy and tighter for display, which is what makes headings
 * read as designed rather than default.
 */
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: "700" as const, letterSpacing: -1 },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "500" as const, letterSpacing: 0.3 },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const, letterSpacing: 0 },
} as const;

export const motion = {
  fast: 140,
  base: 220,
  slow: 340,
} as const;

/** Minimum tap target. 44pt is the iOS floor and comfortable on Android. */
export const HIT = 44;

/**
 * Standard screen padding. Screens use this rather than hardcoding 20 so the
 * gutters line up across every tab.
 */
export const gutter = space.xl;
