// Workspace appearance. A theme is a data record: the shell it uses (layout),
// its design language (name), and the tokens applied to <html>. Adding a style is
// a row here plus a token record in styles.ts (or a block in index.css for the
// shells that predate it); no component knows any style by name.

import { STYLE_TOKENS } from "./styles";

export type ThemePreset = "sage" | "lagoon" | "blush" | "lilac";
export type ThemeMode = "light" | "dark";

export type ThemeStyle =
  | "glass"
  | "classic"
  | "signal"
  | "neon"
  | "ledger"
  | "console"
  | "dispatch"
  | "pocket"
  | "clay"
  | "cybercore"
  | "brutal"
  | "scrapbook"
  | "surreal"
  | "y2k"
  | "pixel"
  | "bento"
  | "swiss"
  | "minimal"
  | "maximal"
  | "luxury"
  | "sketch"
  | "ethereal"
  | "bohemian"
  | "victorian"
  | "cyberpunk"
  | "wabi";

// The shell, not the look. Geometry in index.css keys off data-layout, so a
// new style picks one of these and only supplies colour, type and material.
//   float    frosted full-height icon rail
//   docked   labelled sidebar, flush left
//   strip    tab strip across the top
//   operator narrow icon rail plus an instrument bar
//   index    contents column on the right
//   tabs     phone-width column with a bottom bar
//   clay     floating capsule across the top
export type ThemeLayout =
  | "float"
  | "docked"
  | "strip"
  | "operator"
  | "index"
  | "tabs"
  | "clay";

export type ThemeGroup = "Soft" | "Digital" | "Print" | "Expressive" | "Period";

export type ThemeSpec = {
  id: ThemeStyle;
  /** Design language, shown in the studio. */
  name: string;
  /** One line on the material. */
  hint: string;
  layout: ThemeLayout;
  group: ThemeGroup;
  /** Dark-mode accent, light-mode accent, dark canvas, paper canvas. Used by the
   *  studio swatches so a preview never drifts from the stylesheet. */
  accent: [string, string];
  canvas: [string, string];
};

export const THEME_STYLES: ThemeSpec[] = [
  { id: "glass", name: "Glassmorphism", hint: "Frosted panels over a photograph", layout: "float", group: "Soft", accent: ["#36d6c0", "#12907f"], canvas: ["#0b1012", "#edf0ef"] },
  { id: "classic", name: "Neumorphism", hint: "Extruded from one surface colour", layout: "docked", group: "Soft", accent: ["#86c8ea", "#2b6d94"], canvas: ["#272c32", "#e4e9ef"] },
  { id: "clay", name: "Claymorphism", hint: "Puffy pastel pillows", layout: "clay", group: "Soft", accent: ["#b39bff", "#7a5af8"], canvas: ["#211c2e", "#ebe5f6"] },
  { id: "ethereal", name: "Ethereal", hint: "Light haze, weightless type", layout: "float", group: "Soft", accent: ["#bcd4ff", "#5a7bd8"], canvas: ["#0b1020", "#eef3ff"] },
  { id: "cybercore", name: "Cybercore", hint: "Grids, glitch marks, technical mono", layout: "operator", group: "Digital", accent: ["#22d3ee", "#0e7490"], canvas: ["#05070c", "#eef3f8"] },
  { id: "neon", name: "Synthwave", hint: "Violet halo on black", layout: "docked", group: "Digital", accent: ["#b39bff", "#7c3aed"], canvas: ["#120b1f", "#f3eeff"] },
  { id: "cyberpunk", name: "Cyberpunk", hint: "Hazard yellow, cut corners, scanlines", layout: "docked", group: "Digital", accent: ["#f7ff00", "#a3a800"], canvas: ["#06060a", "#f2f2ee"] },
  { id: "pixel", name: "Pixel Art", hint: "Bitmap type, hard 2px edges", layout: "operator", group: "Digital", accent: ["#7bd88f", "#2f7d43"], canvas: ["#101820", "#eef3ee"] },
  { id: "y2k", name: "Y2K", hint: "Chrome, gloss, futurist nostalgia", layout: "float", group: "Digital", accent: ["#7b5cff", "#5b3ee8"], canvas: ["#101018", "#dfe6f2"] },
  { id: "brutal", name: "Neo-Brutalism", hint: "Heavy borders, offset shadow, no blur", layout: "docked", group: "Expressive", accent: ["#ffe600", "#ffd400"], canvas: ["#14140f", "#f5f1e6"] },
  { id: "maximal", name: "Maximalism", hint: "Layered colour, loud type, ornament", layout: "docked", group: "Expressive", accent: ["#ff2d55", "#e11d48"], canvas: ["#1a0d1e", "#fff3d6"] },
  { id: "surreal", name: "Surrealism", hint: "Tilted planes, dream scale", layout: "index", group: "Expressive", accent: ["#ff6b35", "#c2410c"], canvas: ["#0e0b1a", "#f0ecff"] },
  { id: "scrapbook", name: "Scrapbook", hint: "Pasted paper, tape, rotated cards", layout: "strip", group: "Expressive", accent: ["#c0392b", "#a52a1e"], canvas: ["#1b1712", "#f3ead7"] },
  { id: "dispatch", name: "Editorial", hint: "Serif masthead, rules, columns", layout: "index", group: "Print", accent: ["#e0654a", "#b23a1c"], canvas: ["#12100c", "#fbf7ef"] },
  { id: "luxury", name: "Luxury", hint: "Gold hairlines, wide serif caps", layout: "float", group: "Print", accent: ["#d8b871", "#a8842d"], canvas: ["#0f0e0c", "#faf7f1"] },
  { id: "swiss", name: "Swiss", hint: "Grid, red accent, no decoration", layout: "strip", group: "Print", accent: ["#ff4a3d", "#e30613"], canvas: ["#111111", "#f7f7f5"] },
  { id: "minimal", name: "Minimalism", hint: "Hairlines, air, one accent", layout: "strip", group: "Print", accent: ["#f2f2f2", "#111111"], canvas: ["#0c0c0c", "#fbfbfa"] },
  { id: "bento", name: "Bento Grid", hint: "Mosaic tiles, varied spans", layout: "docked", group: "Print", accent: ["#ff5d3b", "#e2452a"], canvas: ["#0d0d0f", "#f4f4f5"] },
  { id: "ledger", name: "Ledger", hint: "Ruled paper, tabular figures", layout: "strip", group: "Print", accent: ["#d8a94a", "#1f6b4a"], canvas: ["#16150f", "#f4efe4"] },
  { id: "sketch", name: "Conceptual Sketch", hint: "Pencil rules, hand annotations", layout: "strip", group: "Expressive", accent: ["#8fa6ff", "#3d6be0"], canvas: ["#12141a", "#fdfcf8"] },
  { id: "bohemian", name: "Bohemian", hint: "Earth pigment, organic arches", layout: "docked", group: "Period", accent: ["#d98a5f", "#a8552f"], canvas: ["#1e1a14", "#f3e9d8"] },
  { id: "victorian", name: "Victorian", hint: "Engraved rules, small caps", layout: "docked", group: "Period", accent: ["#d9a3a3", "#7a2e2e"], canvas: ["#160f0d", "#f6efe0"] },
  { id: "wabi", name: "Wabi-Sabi", hint: "Muted clay, asymmetry, quiet", layout: "clay", group: "Period", accent: ["#a8a06a", "#6f6a3f"], canvas: ["#191713", "#efebe2"] },
  { id: "signal", name: "Signal Console", hint: "Matte instrument panel, mono", layout: "docked", group: "Digital", accent: ["#ff6a3d", "#b8401a"], canvas: ["#0a0a0b", "#f2f2ef"] },
  { id: "console", name: "Operator", hint: "Dense figures, terminal precision", layout: "operator", group: "Digital", accent: ["#59a6ff", "#12499b"], canvas: ["#0c1114", "#eaeeef"] },
  { id: "pocket", name: "Pocket", hint: "One phone-width column, bottom tabs", layout: "tabs", group: "Soft", accent: ["#8b8bf5", "#5b5bd6"], canvas: ["#0f1117", "#eef0f6"] },
];

export const THEME_GROUPS: ThemeGroup[] = ["Soft", "Digital", "Print", "Expressive", "Period"];

export const THEME_PRESETS: Array<{
  id: ThemePreset;
  label: string;
  hint: string;
}> = [
  { id: "sage", label: "Sage", hint: "Warm olive" },
  { id: "lagoon", label: "Lagoon", hint: "Cool teal" },
  { id: "blush", label: "Blush", hint: "Soft rose" },
  { id: "lilac", label: "Lilac", hint: "Pale violet" },
];

export const DEFAULT_THEME: WorkspaceTheme = {
  preset: "sage",
  mode: "light",
  style: "glass",
  image: null,
};

export type WorkspaceTheme = {
  preset: ThemePreset;
  mode: ThemeMode;
  style: ThemeStyle;
  image: string | null;
};

export function themeSpec(style: ThemeStyle): ThemeSpec {
  return THEME_STYLES.find((s) => s.id === style) ?? THEME_STYLES[0];
}

// Only http(s) images are accepted. Quotes, parens and backslashes are stripped
// so a stored value can never break out of the CSS url() it is written into.
export function safeImageUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed.toString().replace(/["'()\\\s]/g, "");
}

/** Applies a theme to the document. */
export function applyTheme(theme: WorkspaceTheme) {
  const root = document.documentElement;
  const image = safeImageUrl(theme.image);
  // The preset always drives the accent + glass tint; the image only replaces
  // the page backdrop, so a custom photo keeps the chosen colour scheme.
  root.dataset.theme = theme.preset;
  root.dataset.mode = theme.mode;
  root.dataset.style = theme.style;
  // Each style declares its shell; CSS keys rail geometry, page padding and the
  // tab strips off data-layout instead of naming every style in every rule.
  root.dataset.layout = themeSpec(theme.style).layout;
  root.dataset.image = image ? "true" : "false";
  applyStyleTokens(theme.style, theme.mode);
  if (image) {
    root.style.setProperty("--workspace-image", `url("${image}")`);
  } else {
    root.style.removeProperty("--workspace-image");
  }
  persistTheme(theme);
}

// The appearance is remembered so the pages that render before a workspace
// loads (sign in, sign up, reset) are painted in the gym's language instead of
// a default. Read back on boot, overwritten by the organization row once it
// arrives. Storage failures (private mode) are not fatal.
const STORAGE_KEY = "twoplus.theme";

function persistTheme(theme: WorkspaceTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // No storage: the session still themes itself from the organization row.
  }
}

function readStoredTheme(): WorkspaceTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WorkspaceTheme>;
    if (!THEME_STYLES.some((s) => s.id === value.style)) return null;
    return {
      preset: THEME_PRESETS.some((p) => p.id === value.preset)
        ? (value.preset as ThemePreset)
        : DEFAULT_THEME.preset,
      mode: value.mode === "dark" ? "dark" : "light",
      style: value.style as ThemeStyle,
      image: safeImageUrl(value.image),
    };
  } catch {
    return null;
  }
}

/** Paints the remembered appearance before React mounts. */
export function bootstrapTheme() {
  applyTheme(readStoredTheme() ?? DEFAULT_THEME);
}

// Token records from styles.ts are written as custom properties on <html>, so a
// design language is data rather than a stylesheet branch. Tokens a style does
// not declare are removed, letting the base :root values apply again when the
// workspace switches to an older style.
const TOKEN_STATE = new WeakMap<HTMLElement, string[]>();

function applyStyleTokens(style: ThemeStyle, mode: ThemeMode) {
  const root = document.documentElement;
  const record = STYLE_TOKENS[style];
  const next = { ...(record?.base ?? {}), ...(record?.[mode] ?? {}) };
  for (const name of TOKEN_STATE.get(root) ?? []) {
    if (!(name in next)) root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(next)) {
    root.style.setProperty(name, value);
  }
  TOKEN_STATE.set(root, Object.keys(next));
}

/** Reads theme fields off the organization row, tolerating pre-0003 rows. */
export function themeFromOrg(org: {
  theme_preset?: string | null;
  theme_mode?: string | null;
  theme_style?: string | null;
  theme_image?: string | null;
}): WorkspaceTheme {
  const preset = THEME_PRESETS.some((p) => p.id === org.theme_preset)
    ? (org.theme_preset as ThemePreset)
    : DEFAULT_THEME.preset;
  return {
    preset,
    mode: org.theme_mode === "dark" ? "dark" : "light",
    style: THEME_STYLES.some((s) => s.id === org.theme_style)
      ? (org.theme_style as ThemeStyle)
      : "glass",
    image: safeImageUrl(org.theme_image),
  };
}
