# DESIGN AUDIT

Audit of the TwoPlus dashboard as it stood before the multi-style design engine,
plus the state of the engine after implementation. Read this with
`DESIGN_IMPLEMENTATION_PLAN.md` (what was built, in what order) and
`DESIGN_ASSET_REGISTRY.md` (every font, icon and image the styles depend on).

Last updated against commit `50f56d6` plus the uncommitted design-engine work.

---

## 1. Stack, as found

| Concern | Reality |
| --- | --- |
| Framework | React 19.3 + Vite 8, TypeScript 6 |
| Routing | `react-router-dom` 7, `src/router.tsx` |
| Backend | Supabase (Postgres + RLS + RPC), `src/lib/api.ts`, `admin-api.ts` |
| State | React context (`AuthProvider`, `OrgProvider`, `PlatformAdminProvider`), no Redux/Zustand |
| Styling | One hand-written stylesheet, `src/index.css` (~104 KB before this work), plain CSS custom properties |
| Tailwind | Installed and configured (`tailwind.config.ts`) but **not used** by app markup; `index.css` is the only styling system |
| Icons | Hand-authored inline SVG set, `src/icons.tsx` (`IconName` union, ~30 glyphs). No icon package |
| Motion | `gsap` for shell/panel transitions |
| Charts | Hand-written SVG paths (`SummaryBoard.tsx`), no chart library |
| Tests | **None.** No test runner, no `*.test.ts`. Verification has been manual + Playwright scripts under `scripts/` |
| Fonts | Inter requested by CSS but **not loaded** until this work added a `<link>` |

### Component inventory

`src/components/kit.tsx` is the shared primitive layer and is already the right
shape for a themeable system, because every visual decision reads a custom
property:

- `Button` (`.btn`, `.btn.secondary`), `Input`/`Select` (`.input`),
  `Title` (`h2`), `Badge` (colour chosen from a label lookup), `Avatar`
  (initials, `tone-N` by `charCodeAt(0) % 5`), `Stats` (`.stats` strip of
  `.stat` cells).
- `MemberCard` (`.member-card`, photo/badge/selection states), `SummaryBoard`
  (`.board` console: hero, side cards, attention table).

`src/App.tsx` is a 134 KB single-file dashboard shell holding the rail, topbar,
account menu, every module page, modals, the profile drawer and Settings. It is
large but internally consistent; splitting it was **not** part of this work and
remains a known debt (see §5).

### Existing design tokens

`index.css` already opened with a `:root` token block: colour (`--app-bg`,
`--text`, `--text-2`, `--text-3`, `--card`, `--card-solid`, `--field`,
`--lime`, `--on-accent`, `--ok`, `--warn`, `--err`), shape (`--radius-sm`,
`--radius`, `--radius-lg`, `--radius-pill`), material (`--card-shadow`,
`--inset-hi`, `--blur-card`, `--blur-shell`), plus rail/topbar geometry
(`--rail-w`, `--shell-pad-left`, `--topbar-h`, `--rail-*`) and accent presets
keyed off `html[data-theme="sage|lagoon|blush|lilac"]`.

This is the single most important finding: **the token vocabulary was already
good enough to carry a whole design language.** The gap was not tokens, it was
that only four styles existed and each new one required hand-writing a new
stylesheet block plus editing every selector list that named styles.

### Theme system, as found

`src/lib/theme.tsx` held a `THEME_STYLES` array of records and an `applyTheme()`
that wrote `data-theme` (accent preset), `data-mode` (light/dark) and
`data-style` (visual style) onto `<html>`. Settings rendered a `.theme-grid` of
`.theme-option` buttons. Nine styles existed: `glass`, `classic`, `signal`,
`neon`, `ledger`, `console`, `dispatch`, `pocket`, `clay`.

Style selection in CSS looked like this:

```css
html:is([data-style="classic"],[data-style="signal"]) .floating-rail { … }
```

Every new style that shared a shell had to append its id to that list. The list
appeared **103 times**. That is the structural defect: the stylesheet knew style
names, so adding a style meant editing rules unrelated to that style.

---

## 2. Findings, ranked

### Critical

1. **Style names in shell geometry.** 103 occurrences of `[data-layout]`-shaped
   logic keyed on `[data-style=…]` lists. Adding a tenth style meant auditing and
   editing every list; missing one produced a half-broken shell. Fixed by
   introducing `data-layout` (`float`, `docked`, `strip`, `operator`, `index`,
   `tabs`, `clay`) as the thing CSS keys on, and making it a field on the style
   record (`ThemeSpec.layout`).
2. **A design language could not be expressed without CSS.** Colour, type and
   material all lived in stylesheet blocks, so a style was a fork of ~80 rules
   instead of a record. Fixed with `src/lib/styles.ts`: pure-data token records
   written to `<html>` as inline custom properties by `applyStyleTokens()`.

### High

3. **No preview of a style before committing.** Settings showed a swatch tile,
   not a component. Users chose a style blind, then had to save and look.
   Fixed by the Design Studio, which renders each style with the real shipped
   components inside an iframe.
4. **Hero photograph leaked into every style.** `SummaryBoard` renders a photo
   hero with white text. Every non-glass style needed its own override block, and
   new styles inheriting the photo would have unreadable text.
   Fixed by a single exclusion rule: `html:not([data-style="glass"]):not([data-style="neon"]) .board-hero`.
5. **Inter requested but never loaded.** The stylesheet named Inter from the
   first commit; the document never loaded it, so every user saw Segoe UI.
   Fixed in `index.html`.

### Medium

6. **Styles looked like recolours.** Changing background + radius + accent left
   the composition identical, which reads as a skin, not a design language.
   Addressed with a per-style "signature details" section (rotation, rules,
   clip paths, arch radii, gloss sweeps, keylines) so each language has a
   structural mark a recolour cannot fake.
7. **`DESIGN.md` layout section is stale.** It documents the original fixed
   50×460 px rail, 110 px shell padding and 38 px shell radius, which the
   multi-shell engine replaced. Flagged in `DESIGN.md` rather than silently
   rewritten, because the token/type/colour sections are still accurate.
8. **`Stats` no longer emits per-cell icons** while `.stat-chip` CSS still
   exists: dead rule, harmless, noted for deletion.

### Low

9. `html[data-style="signal"]` overrides survived the removal of the markup they
   targeted; deleted during this work.
10. The theme picker's `.theme-preview` box printed the raw style id
    (`"glass · dark"`), which is developer language in a user-facing surface.
    Replaced by the Studio's real preview.

---

## 3. What must be preserved

Constraints the engine is required to respect, all verified after implementation:

- **RLS and RPC contracts.** No table, policy or function changed. The theme is
  three columns on `organizations` (`theme_preset`, `theme_mode`, `theme_style`,
  `theme_image`); `theme_style` is a `check` constraint that must be widened for
  new styles (`supabase/migrations/0006_member_crm.sql`).
- **Roles.** Only `owner` may change appearance (`isOwner`), and the picker stays
  visibly disabled with an explanatory `title` for everyone else.
- **Persistence.** Theme changes are staged in React state and only written by
  `saveTheme`; the "Revert" button restores from the org row. The Studio keeps
  this contract: applying a style is live and reversible, saving is explicit.
- **Data honesty.** Empty states, "needs migration" banners and the
  "session only" badges must survive restyling. No style may fake data.
- **Existing navigation.** Pages, module maps and the rail's item set are
  unchanged; shells move the rail, never remove an entry.

---

## 4. What the audit changed in practice

| Area | Before | After |
| --- | --- | --- |
| Styles registered | 9 | **26** |
| Style records | CSS blocks only | 17 data records + 9 pre-dating CSS blocks (documented in `styles.ts`) |
| Layout shells | style-name lists | 7 named layouts on `data-layout` |
| Adding a style | write ~80 CSS rules + edit 103 selector lists | add one `ThemeSpec` row, and either one token record (for colour/type/material) or a signature block (for structural marks) |
| Preview | 34 px swatch | live iframe with real components, 3 viewports, light/dark, compare-against-current |
| Fonts loaded | 1 (and broken) | 8 families, one request |
| Stylesheets | 1 | 1 (no CSS-in-JS, no per-style files) |

---

## 5. Known debts, accepted

- **`App.tsx` is 134 KB** in one file. Splitting it is the single largest
  maintainability win left, and is out of scope for a styling task.
- **No automated test runner.** Verification is Playwright scripts in
  `scripts/` (`_themes.mjs`, `_contrast.mjs`, `_studio.mjs`) plus
  `npm run build`. Turning these into `@playwright/test` specs is the recommended
  next step.
- **9 of 26 styles are CSS-block styles** rather than token records (they
  predate `styles.ts`). They work and are verified; migrating them is mechanical
  but would need the pre-`styles.ts` CSS deleted in the same commit or the token
  record would be silently overridden.
- **Tailwind is installed but unused.** Either adopt it or remove it; leaving
  both systems configured invites drift.
- **Three.js is a dependency** with no apparent UI use in this shell. Verify
  before removing.
