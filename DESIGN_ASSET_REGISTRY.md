# DESIGN ASSET REGISTRY

Every font, icon, image and texture the design engine depends on: where it comes
from, its licence, how it is loaded, and what happens when it fails.

Rule enforced throughout: **nothing here is decorative filler.** Each entry is
used by at least one style, and every entry has a fallback so a blocked or offline
asset degrades into a readable interface rather than an invisible one.

---

## 1. Typography

All eight families load in **one** request from Google Fonts, in `index.html`,
with `preconnect` to both `fonts.googleapis.com` and `fonts.gstatic.com`, and
`display=swap` so text paints immediately in the fallback.

| Family | Weights / axes | Styles that use it | Fallback chain |
| --- | --- | --- | --- |
| **Inter** | variable `ital 0..1`, `opsz 14..32`, `wght 300..800` | glass, classic, clay, ethereal (fallback), y2k (fallback), bento (fallback), swiss, minimal, maximal (fallback), neumorphic shells | `system-ui, sans-serif` |
| **Space Grotesk** | `wght 400..700` | y2k, bento, cybercore (display), maximal (fallback) | `Inter, system-ui, sans-serif` |
| **Archivo** | `wght 400..700` | brutal | `Inter, system-ui, sans-serif` |
| **Bricolage Grotesque** | `opsz 12..96`, `wght 400..700` | maximal | `Space Grotesk, Inter, sans-serif` |
| **Fraunces** | `opsz 9..144`, `wght 400..700` | luxury, bohemian, victorian, wabi, surreal, maximal (serif) | `"Iowan Old Style", Palatino, Georgia, serif` |
| **Instrument Serif** | `ital 0..1` | ethereal | `Fraunces, Georgia, serif` |
| **Caveat** | `wght 400..700` | sketch | `"Segoe Print", "Comic Sans MS", cursive` |
| **Courier Prime** | `400`, `700` | scrapbook | `"Courier New", monospace` |

### Why these families

Each was chosen because it carries the language's voice on its own, not because
it looked good on a list:

- **Inter** is the neutral grotesque the application already named. It is the
  baseline every other family is a deliberate departure from.
- **Space Grotesk** has the squared-off terminals and tight apertures that read
  as "technical futurism", which is exactly Y2K and cybercore.
- **Archivo** is a grotesque with weight to spare; neo-brutalism needs a face
  that survives at `800` weight with 2 px rules around it.
- **Bricolage Grotesque** is deliberately uneven (variable optical size on a
  slightly wonky skeleton), which is what maximalism needs to feel authored
  rather than simply bold.
- **Fraunces** is a soft-serif display with an `opsz` axis. It can be quiet at
  small sizes (wabi-sabi, bohemian) and ceremonial at large ones (luxury,
  victorian) from one family, which is why four styles share it.
- **Instrument Serif** is high-contrast and airy; it is the reason ethereal reads
  as weightless rather than merely light-coloured.
- **Caveat** is a genuine handwriting face, not a script; sketch needs annotation
  that looks written at speed.
- **Courier Prime** is a typewriter mono with real serifs, which is what makes
  scrapbook feel pasted rather than typeset.

### Licence

All eight are **SIL Open Font License 1.1**, served by Google Fonts. OFL permits
web embedding, modification and redistribution; it requires the licence notice to
travel with redistributed font files. **Because these are loaded from Google's
CDN and never self-hosted or modified in this repo, no notice file is required
here.** If any family is later vendored into `public/fonts/`, its `OFL.txt` must
be copied alongside it.

`--font-mono` additionally names `ui-monospace`, `"IBM Plex Mono"` and
`"SF Mono"` ahead of the generic. Those are **not loaded**: `ui-monospace` and
`SF Mono` are OS-provided, and IBM Plex Mono is a deliberate no-op that only
applies if a user already has it installed. No request is made for it.

---

## 2. Iconography

**Source:** hand-authored SVG in `src/icons.tsx`, exported as
`Icon({ name, size })` with a closed `IconName` union of **32 glyphs**:
`activity, apple, arrow, bell, building, calendar, chart, check, checkin,
clipboard, close, dashboard, dumbbell, gift, grid, headset, megaphone, members,
menu, message, mobile, package, plus, receipt, search, settings, shield, shop,
sparkles, ticket, userPlus, wallet`.

| Property | Value |
| --- | --- |
| Type | Inline React SVG, 24×24 viewBox |
| Stroke | `currentColor`, so every style's accent and text tokens drive them |
| Licence | Original work in this repository, no attribution required |
| Loading | Zero network requests; bundled with the JS |
| Fallback | None needed (compiled in) |

`public/icons.svg` (5.1 KB) is a leftover sprite sheet. It is **not referenced**
by any component; icons render from the inline set. Kept only because deleting it
is unrelated to styling work.

### Consistency decision

One stroke-based set for all 26 styles, rather than a different icon family per
language, because the icon set carries meaning (nav labels, actions) and swapping
it per theme would mean every style needed its glyphs re-checked for
recognisability. Instead, styles change what surrounds the icon (weight of the
rail, boxed vs bare, square vs round container) via the shell tokens. The
`pixel`, `brutal` and `cyberpunk` styles get their bitmap/raw character from
type, rules and `clip-path`, not from redrawing 32 glyphs.

---

## 3. Imagery

Two photographs, both Unsplash, both external, both from the **Unsplash
Licence** (free for commercial and non-commercial use, no permission needed,
attribution appreciated but not required; cannot be sold unmodified or used to
build a competing image service).

| Asset | URL | Used by | Purpose |
| --- | --- | --- | --- |
| **Gym interior** | `images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80` | glass | Board hero (`--hero-image`), behind a `105deg` near-opaque grading |
| **Dark gym wide** | `images.unsplash.com/photo-1671970922029-0430d2ae122c?auto=format&fit=crop&w=2400&q=85` | glass | Workspace backdrop (`--ws-photo`), under `--ws-tint` |

Both live as custom properties in the `:root`/glass token block of
`src/index.css`. `auto=format` lets Unsplash serve AVIF/WebP to capable browsers;
`q=80` and a fixed width keep weight reasonable.

### Why only two

The brief asks every style to have relevant imagery. The honest finding is that
**only glassmorphism needs photography**, because it is the only language whose
premise is "layered translucent surfaces over a real scene". Every other style
declares `--ws-bg` as a material instead: graph paper (cybercore, pixel),
scanlines (cyberpunk), radial fog (ethereal, bohemian, wabi, surreal, maximal),
paper grain (scrapbook, sketch), flat stock (brutal, swiss, minimal, bento,
luxury, victorian, editorial). Adding a photo to those would fight the language,
not serve it. **No stock image is present purely to fill space.**

### Failure behaviour

- Glass with the photo blocked: `--ws-tint` is a solid gradient, so the backdrop
  becomes a dark panel and all text keeps its contrast. Verified by the
  `data-image="false"` path.
- Every non-glass style: switches the hero to `var(--card)` via the single
  exclusion rule in §18j, so no photo means no unreadable white-on-white.
- User-supplied background: `safeImageUrl()` accepts only `http(s)`, strips
  quotes/parens/backslashes so a stored value cannot escape the `url()` it is
  written into, and sets `data-image` so CSS knows whether a photo is present.

---

## 4. Textures and surfaces

Not downloaded assets. Every texture is CSS, generated from tokens, so it is
resolution-independent, zero-request and themeable:

| Texture | Technique | Styles |
| --- | --- | --- |
| Graph paper | two `repeating-linear-gradient` layers at 28 px / 16 px | cybercore, pixel |
| Scanlines | `repeating-linear-gradient` at 4 px | cyberpunk |
| Ruled paper | `repeating-linear-gradient` at 24 px | sketch |
| Paper fibre | `radial-gradient` bloom over flat stock | scrapbook, bohemian, wabi |
| Light fog | two large `radial-gradient` blooms | ethereal, surreal, maximal |
| Gloss | linear highlight sweep on buttons/cards | y2k |
| Cut corner | `clip-path: polygon()` | cyberpunk |
| Frost | `backdrop-filter: blur()` + `saturate()` | glass, ethereal, y2k, surreal, maximal |

This is why the stylesheet has no image sprites and the app makes **two** image
requests in total.

---

## 5. Motion

| Source | Use | Licence |
| --- | --- | --- |
| **GSAP** (`gsap ^3.15`) | shell/nav entrance, panel transitions | GSAP standard "no charge" licence: free for most uses including commercial sites; not for a competing animation platform |
| CSS transitions | hover, focus, `:active` offsets | n/a |
| `prefers-reduced-motion` | disables transforms and long durations (`index.css` §20) | n/a |

No animation library was added for this work. GSAP was already a dependency.

---

## 6. Summary of network cost

| Asset class | Requests | Size |
| --- | --- | --- |
| Fonts | 1 CSS + one file per used family (Google serves per-unicode-range) | ~120 to 260 kB depending on families used by the active style |
| Icons | 0 (inline) | bundled |
| Images | 0 to 2, only for glass | ~120 to 260 kB each |
| Textures | 0 (CSS) | 0 |
| **Total added for the design engine** | **1 font request** | **~0 new bytes of JS beyond `styles.ts` (~24 kB of data, gzip ~4 kB)** |

Note the fonts request loads *all* eight families even when the active style uses
two. That is a deliberate simplicity trade: one request, no runtime juggling, and
Google's per-family files are only fetched for the unicode ranges actually
painted. If measurement later shows this matters, the fix is to emit a
style-scoped `<link>` on theme change rather than to self-host.

---

## 7. Adding a style: asset checklist

1. Pick type from the loaded eight, or accept the fallback chain. **Do not add a
   ninth family for one style** unless the language genuinely cannot be voiced by
   these; if you must, add it to the single `index.html` request and to this
   registry with its licence.
2. Reuse the existing 32 icons. If a glyph is missing, add it to
   `src/icons.tsx` so all styles get it.
3. Reach for CSS texture before photography. Only add an image if the language is
   *about* photography, and record it here with licence and fallback.
4. Add no dependency for animation, icons or fonts.
