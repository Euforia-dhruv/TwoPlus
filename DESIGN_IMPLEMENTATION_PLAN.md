# DESIGN IMPLEMENTATION PLAN

How the design engine was built, in the order it was built, and why each step was
taken that way. Companion to `DESIGN_AUDIT.md` (the starting state and findings)
and `DESIGN_ASSET_REGISTRY.md` (fonts, icons, imagery).

Status: **implemented and verified.** Every claim below was checked against the
running app, not planned and left. Verification method per stage is listed.

---

## The architecture in one paragraph

A style is a **data record**, not a stylesheet branch. `theme.tsx` holds one
`ThemeSpec` per style (name, hint, group, shell layout, accent/canvas swatches).
A style's *look* is either a token record in `styles.ts` (colour, type, shape,
material as custom properties) or, for the nine styles that predate that file, a
block in `index.css`. `applyTheme()` writes the theme to `<html>` as
`data-theme`, `data-mode`, `data-style`, `data-layout` and `data-image`, plus all
of the style's tokens as inline custom properties. Components only ever read
custom properties, so no component knows a style by name. Shell geometry keys off
`data-layout`, so a new style picks an existing shell and inherits it whole.

```
ThemeRegistry      THEME_STYLES (26 ThemeSpec rows)      src/lib/theme.tsx
DesignTokens       STYLE_TOKENS (17 token records)       src/lib/styles.ts
                                  + :root defaults        src/index.css §2
TypographyEngine   --font-sans / --font-serif / --font-mono per style
AssetRegistry      fonts in index.html, inline icons      DESIGN_ASSET_REGISTRY.md
ComponentLibrary   kit.tsx + MemberCard + SummaryBoard   all token-driven
LayoutEngine       data-layout: 7 shells, 7 rule blocks   src/index.css §4, §19
MotionEngine       gsap + --ease tokens + reduced-motion  src/index.css §20
ResponsiveEngine   1100 / 820 / 480 breakpoints           src/index.css §19, §21
Accessibility      focus-visible, aria-pressed, contrast  throughout
```

These are conceptual modules. Only three new files were created
(`src/lib/styles.ts`, `src/pages/Studio.tsx`, the docs); everything else is an
edit to files that already existed.

---

## Stage 1: Audit, then fix the two structural defects

**Problem.** Adding a style meant editing every selector that named styles
(103 occurrences of `html:is([data-style="classic"],[data-style="signal"])`).
Missing one produced a half-broken shell that only showed up at some viewport.

**Decision.** Introduce `data-layout`. A shell (`float`, `docked`, `strip`,
`operator`, `index`, `tabs`, `clay`) is a property of the style record, written
by `applyTheme()`. CSS keys rail geometry, page padding and tab strips off
`data-layout`; `[data-style=…]` is reserved for things that are genuinely about
one language (a signature mark).

**Consequence.** Adding a style that reuses a shell is now zero CSS for the
shell. This is what made 26 styles tractable instead of a maintenance sink.

*Verified:* `scripts/_themes.mjs` measures rail and shell bounding boxes for
every style × 1440/1024/390 × light/dark and flags overlap plus horizontal
overflow. Result: `ALL THEMES OK`.

---

## Stage 2: Token records, so a language is data

**Problem.** A style's palette and type lived in ~80 CSS rules, so a new
language was a fork, not a configuration.

**Decision.** `src/lib/styles.ts` exports `STYLE_TOKENS: Partial<Record<ThemeStyle, {base?, dark, light}>>`.
`applyTheme` → `applyStyleTokens` writes `base` merged with the active mode's
record onto `<html>` as inline custom properties. A `WeakMap` remembers which
properties the previous style set and removes the ones the new style does not
declare, so switching from a token style back to a CSS-block style cannot leave
stale overrides behind.

Token vocabulary (every record uses the same names):

| Group | Tokens |
| --- | --- |
| Colour | `--app-bg`, `--text`, `--text-2`, `--text-3`, `--hairline`, `--hairline-2`, `--card`, `--card-solid`, `--card-hover`, `--field`, `--field-hover`, `--lime`, `--lavender`, `--on-accent`, `--focus`, `--ok`, `--warn`, `--err` |
| Material | `--card-shadow`, `--inset-hi`, `--blur-card`, `--blur-shell` |
| Shape | `--radius-sm`, `--radius`, `--radius-lg`, `--radius-pill`, `--topbar-radius`, `--rail-radius` |
| Type | `--font-sans`, `--font-serif`, `--font-mono` |
| Surface | `--rail-bg`, `--topbar-bg`, `--shell-bg`, `--ws-bg` |
| Shell | `--label-display` |

Note `--ws-bg` is a full backdrop (gradients, grids, paper grain) rather than a
colour, which is what lets one token carry "graph paper", "scanlines" and
"radial fog" without a rule per style.

*Verified:* `scripts/_themes.mjs` reads computed `font-family`, accent and card
colour per style and asserts they match the record.

---

## Stage 3: Signature details, so styles are not recolours

**Problem.** Colour + radius + accent alone reads as a skin. The brief requires
each language to differ in hierarchy, material and interaction, not just hue.

**Decision.** `index.css` §18m gives each style a structural mark that a recolour
cannot fake: pixel's 2 px square insets, sketch's dashed 1.5 px borders and
hand-drawn radii, scrapbook's per-card rotation, swiss's zero-gap stat strip with
column hairlines and 34 px figures, brutal's 2 px rules and 3 px offset shadow
that collapses on `:active`, maximal's two-tone rule under `h1`, victorian's
inset keyline via `outline-offset: -5px`, bohemian's arch radii, wabi's irregular
radii and offset even tiles, y2k's gloss sweep, cyberpunk's `clip-path` cut
corners, bento's filled first tile, ethereal's borderless cards, surreal's 40 px
lead figure and asymmetric hero radius.

**Consequence.** Two styles sharing a shell (e.g. `swiss` and `minimal`, both
`strip`) still read as different languages.

---

## Stage 4: The photograph question

**Problem.** `SummaryBoard` renders a photo hero with hard-coded white text at
`#f4f7f6`. Every non-glass style needed its own override; a style added later
would inherit the photo and ship unreadable text.

**Decision.** Invert the rule: one exclusion, not a list.

```css
html:not([data-style="glass"]):not([data-style="neon"]) .board-hero { … }
```

Only glass (which is *about* photography) and synthwave (which has its own
glowing panel block) keep a non-flat hero. Any future style gets the card
treatment for free.

---

## Stage 5: Fonts that are actually loaded

**Problem.** The stylesheet named Inter from the first commit; `index.html` never
loaded it, so every user saw a fallback.

**Decision.** One Google Fonts request covering all eight families the token
records name, with `preconnect` and `display=swap`. Families and weights are
listed in `DESIGN_ASSET_REGISTRY.md`.

**Consequence.** Styles now differ in *voice*, not just colour: swiss/minimal are
grotesque, luxury/victorian/wabi are serif, pixel/cyberpunk/cybercore are mono,
sketch is handwritten.

*Verified:* `scripts/_themes.mjs` asserts the computed `font-family` per style.

---

## Stage 6: Design Studio

**Requirement.** A gallery of every style, using the actual production
components, with switching, responsive preview, comparison, search and filter.
Not static mockups.

**Problem.** Applying every style to the page at once is impossible; the styles
key off `<html>` and a page can only be one style at a time.

**Decision.** Render each preview in an **iframe**, and copy the app's real
stylesheet into it at runtime (`document.styleSheets` → `cssRules` → `<style>`,
plus clones of the `<link>` elements for cross-origin sheets such as Google
Fonts). Then set `data-style`/`data-mode`/`data-layout` and the token record on
that frame's `<html>`, and mount the sample by **React portal** into the frame's
body.

**Why this and not the alternatives.** CSS scoping would require rewriting 254
`html[data-style]` selectors or building a `:scope` prefix layer, and would still
share one cascade between previews. Shadow DOM blocks the global stylesheet
entirely. An iframe gives true isolation for free, gets its own viewport (so a
"Phone" preview is a real 400 px layout, not a squeeze), and means the preview is
literally the same CSS file the app ships.

**Consequence.** The studio's sample is built from the shipped primitives
(`Button`, `Input`, `Badge`, `Avatar`, `Stats`, `Title`, `.panel`,
`.page-heading`, `.search-field`, tables), so a defect in a style shows up in the
studio before it shows up in a page.

What the studio provides: 26 tiles with real accent/canvas swatches, family chips
(Soft / Digital / Print / Expressive / Period), search over name/hint/group/layout,
viewport chips (1180 / 820 / 400 px), light/dark, "Compare with current" split
view, per-style facts (type, accent, canvas, shell) and an explicit **Apply to
workspace** button, plus honouring owner-only write permission.

*Verified:* `scripts/_studio.mjs` opens More → Design Studio on the running app
and asserts 26 tiles, 6 sheets copied into the frame, 91 live component nodes
inside it, 4 fact rows, no console or page errors; then clicks a tile (selects
only), clicks Apply, and confirms `dataset.style` / `dataset.layout` changed live,
rail radius became `0px`, font became Inter, and no horizontal overflow at 390 px.

---

## Stage 7: Persistence, unchanged on purpose

The studio is a **staging surface**, not a new source of truth. Applying a style
calls the existing `updateTheme({style})`, which updates React state and live
`<html>`. Writing to the org row still happens only through **Save appearance** in
Settings, and **Revert** still restores from `themeFromOrg(org.organization)`.

Why: theme rows are shared by the whole gym. Making a gallery click persist for
everyone, with no confirmation, would be a regression in behaviour that the
existing Settings flow deliberately avoids.

**Database note:** `organizations.theme_style` has a `check` constraint
(`'glass','classic','signal'` when migration 0006 was written). A style outside
that list will apply visually but fail to save until the constraint is widened.
`supabase/migrations/0006_member_crm.sql` must be extended to the full 26-style
list before deploy.

---

## Stage 8: Responsive and motion

- Breakpoints: 1100 px (rail narrows, one-column board), 820 px (rail becomes a
  bottom bar, topbar 56 px, 2-up stats), 480 px (1-up stats).
- §21 adds small-screen rules for the styles added after the original responsive
  pass, so a 390 px phone does not get a 208 px labelled sidebar.
- §20 `prefers-reduced-motion: reduce` disables gsap-driven transforms and long
  transitions.
- Studio responsive: preview frames cap at the chosen viewport width, tiles use
  `auto-fill minmax(148px, 1fr)`, split compare collapses under 820 px.

*Verified:* `scripts/_themes.mjs` at 1440/1024/390 for every style, both modes;
`_studio.mjs` checks 390 px overflow.

---

## Verification summary

| Gate | Command | Result |
| --- | --- | --- |
| Types + build | `npm run build` | pass, 94 modules, CSS 98.4 kB, JS 740.9 kB |
| Lint | `npm run lint` (oxlint) | pass |
| Everything | `npm run test:gate` | build + lint + all 87 browser tests |
| Every style × viewport × mode | `npm test -- themes` | 27/27: applied style, shell, rail overlap, overflow |
| Contrast (WCAG from resolved tokens) | `npm test -- contrast` | 27/27: 8 pairs per style per mode |
| Auth screens (remembered style) | `npm test -- auth` | 28/28: themed, 5 pairs at 4.5:1 |
| Studio behaviour | `npm test -- studio` | 5/5: gallery, search, apply, phone overflow |

The suite needs `SHOT_EMAIL` and `SHOT_PASS` in the environment; without them the
setup project skips and the signed-in specs are skipped rather than failing. Run
it against a deployment with `AUDIT_URL=https://twoplus.fit npm test`.

---

## Remaining work, in priority order

1. **Widen the `theme_style` check constraint** to all 26 ids before deploying, or
   the newer styles will not save.
2. **Migrate the nine CSS-block styles to token records** and delete their
   pre-`styles.ts` CSS in the same commit, so nothing is silently overridden.
3. **Retire the superseded scripts.** `_themes.mjs`, `_contrast.mjs`, `_studio.mjs`,
   `_auth-theme.mjs` and `_auth-contrast.mjs` are now covered by the specs above
   and can go once the suite has run in CI a few times.
4. **Split `App.tsx`** (134 KB) into shell / pages / modals.
5. Decide Tailwind's fate: adopt or remove; do not leave both styling systems
   configured.
6. Update the stale Layout section of `DESIGN.md`.
7. Audit per-style contrast ratios with a checker rather than by eye.
