import { readFileSync } from "node:fs";
import { join } from "node:path";

// The registry is the single source of truth, so the tests read it rather than
// keeping their own style list (a hand-kept list silently drifted before).
export type Spec = { id: string; layout: string };

export function loadRegistry(): Spec[] {
  const source = readFileSync(join(import.meta.dirname, "../../src/lib/theme.tsx"), "utf8");
  const specs = [...source.matchAll(/\{ id: "([a-z0-9]+)"[^}]*?layout: "([a-z]+)"/g)].map(
    ([, id, layout]) => ({ id, layout })
  );
  if (specs.length < 20) throw new Error(`Registry parse found ${specs.length} styles`);
  return specs;
}

/** Layouts whose navigation sits on a left/right edge and must clear content. */
export const SIDE = new Set(["float", "docked", "operator", "index"]);
/** Layouts that show text labels at wide sizes. */
export const LABELLED = new Set(["docked", "index", "strip", "clay"]);

// --- WCAG maths -------------------------------------------------------------

export function channels(color: string): number[] | null {
  const rgb = color.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return parts.slice(0, 3);
  }
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const short = color.trim().match(/^#([0-9a-f]{3})$/i);
  if (short) return [0, 1, 2].map((i) => parseInt(short[1][i] + short[1][i], 16));
  return null;
}

export function alpha(color: string): number {
  const rgb = color.match(/rgba\(([^)]+)\)/i);
  if (!rgb) return 1;
  const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return parts.length > 3 ? parts[3] : 1;
}

/** Any colour that parses wins; an unset token falls back. */
export function resolve(color: string, fallback: string): string {
  return channels(color) ? color : fallback;
}

/** Flattens a translucent colour onto its backdrop, which is what the eye sees. */
export function over(fg: string, bg: string): string {
  const a = alpha(fg);
  const f = channels(fg);
  const b = channels(bg);
  if (!f || !b || a >= 1) return f ? `rgb(${f.join(",")})` : fg;
  return `rgb(${f.map((c, i) => Math.round(c * a + b[i] * (1 - a))).join(",")})`;
}

export function luminance(color: string): number | null {
  const c = channels(color);
  if (!c) return null;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(fg: string, bg: string): number | null {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Contrast of a foreground on a backdrop, flattening both onto the page. */
export function contrastOn(fg: string, bg: string, page: string): number | null {
  const back = over(resolve(bg, page), page);
  return ratio(over(resolve(fg, back), back), back);
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}
