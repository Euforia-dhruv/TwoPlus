/**
 * Generates the app icon and splash image.
 *
 * Written as a tiny PNG encoder rather than pulling in an image library: the
 * app needs two flat, on-brand bitmaps and nothing more. Deletes itself from
 * the build path but stays in the repo so the assets are reproducible.
 *
 *   node scripts/make-assets.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "assets");

const CANVAS = [0x0b, 0x0b, 0x0d];
const ACCENT = [0x8e, 0x2b, 0x3f];
const ACCENT_BRIGHT = [0xc4, 0x48, 0x5f];
const BONE = [0xf4, 0xef, 0xe7];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const o = rowStart + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** The mark: a bone "T+P" ligature field over a burgundy disc. */
function iconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.hypot(x - cx, y - cy) / (size / 2);
  if (r > 1) return [...CANVAS, 255];

  let col = mix(ACCENT, [0x1a, 0x0c, 0x10], clamp01(r * 0.85));

  // Two vertical bars plus a crossbar reads as "T" at small sizes and "++" up
  // close, which is the whole name.
  const barW = size * 0.075;
  const bars = [0.38, 0.62].map((p) => Math.abs(x - size * p) < barW);
  const cross = Math.abs(y - size * 0.5) < size * 0.055 && x > size * 0.3 && x < size * 0.7;
  const verticals = Math.abs(y - size * 0.5) < size * 0.23 && bars.some(Boolean);

  if (cross || verticals) {
    col = mix(BONE, ACCENT_BRIGHT, clamp01((y / size - 0.28) * 0.9));
  }
  return [...col, 255];
}

/** Splash: the same mark, small, centred on the canvas colour. */
function splashPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.hypot(x - cx, y - cy) / (size * 0.14);
  if (r > 1) return [...CANVAS, 255];
  const barW = size * 0.012;
  const bars = [0.47, 0.53].map((p) => Math.abs(x - size * p) < barW);
  const cross = Math.abs(y - size * 0.5) < size * 0.008 && x > size * 0.44 && x < size * 0.56;
  const verticals = Math.abs(y - size * 0.5) < size * 0.035 && bars.some(Boolean);
  if (cross || verticals) return [...BONE, 255];
  return [...mix(ACCENT, CANVAS, clamp01(r * 0.7)), 255];
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon.png"), png(1024, iconPixel));
writeFileSync(join(outDir, "splash.png"), png(1242, splashPixel));
console.log("wrote assets/icon.png and assets/splash.png");
