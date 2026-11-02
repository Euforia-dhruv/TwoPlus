// Workspace appearance: light or dark, over one shared glass token set and the
// bundled backdrop photo. There is no theme catalogue any more; colour comes
// from the CSS tokens, so a workspace only ever remembers its mode.

export type ThemeMode = "light" | "dark";

export type WorkspaceTheme = {
  mode: ThemeMode;
};

export const DEFAULT_THEME: WorkspaceTheme = { mode: "dark" };

const STORAGE_KEY = "twoplus.theme";

/** Applies the mode to the document. */
export function applyTheme(theme: WorkspaceTheme) {
  document.documentElement.dataset.mode =
    theme.mode === "light" ? "light" : "dark";
  persistTheme(theme);
}

// Remembered so the pages that render before a workspace loads (sign in, sign
// up, reset) are painted in the mode the gym last chose. Storage failures
// (private mode) are not fatal.
function persistTheme(theme: WorkspaceTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: theme.mode }));
  } catch {
    // No storage: the session still themes itself from the organization row.
  }
}

function readStoredTheme(): WorkspaceTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { mode?: string };
    return { mode: value.mode === "light" ? "light" : "dark" };
  } catch {
    return null;
  }
}

/** Paints the remembered mode before React mounts. */
export function bootstrapTheme() {
  applyTheme(readStoredTheme() ?? DEFAULT_THEME);
}

/** Reads the mode off the organization row, tolerating pre-0003 rows. */
export function themeFromOrg(org: { theme_mode?: string | null }): WorkspaceTheme {
  return { mode: org.theme_mode === "light" ? "light" : "dark" };
}
