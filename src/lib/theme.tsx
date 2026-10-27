// Workspace appearance: glass backdrop preset + light/dark mode + optional
// custom image. Stored on the organization row, so every member of a gym sees
// the same theme while only the owner can change it (RLS enforces the write).

export type ThemePreset = "sage" | "lagoon" | "blush" | "lilac";
export type ThemeMode = "light" | "dark";

export type WorkspaceTheme = {
  preset: ThemePreset;
  mode: ThemeMode;
  image: string | null;
};

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
  image: null,
};

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
  root.dataset.image = image ? "true" : "false";
  if (image) {
    root.style.setProperty("--workspace-image", `url("${image}")`);
  } else {
    root.style.removeProperty("--workspace-image");
  }
}

/** Reads theme fields off the organization row, tolerating pre-0003 rows. */
export function themeFromOrg(org: {
  theme_preset?: string | null;
  theme_mode?: string | null;
  theme_image?: string | null;
}): WorkspaceTheme {
  const preset = THEME_PRESETS.some((p) => p.id === org.theme_preset)
    ? (org.theme_preset as ThemePreset)
    : DEFAULT_THEME.preset;
  return {
    preset,
    mode: org.theme_mode === "dark" ? "dark" : "light",
    image: safeImageUrl(org.theme_image),
  };
}
