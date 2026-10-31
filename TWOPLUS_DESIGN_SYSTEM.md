# TwoPlus.fit: Design System

What exists in the code today, where it lives, and the rules that keep it consistent.
Nothing here is aspirational; every token and component listed is in `src/`.

---

## 1. Brand position

TwoPlus is a **record system for gyms**, not a motivation product. The interface states
findings and shows arithmetic. It does not shout, celebrate, or decorate.

| Trait | How it shows up |
| --- | --- |
| Trustworthy | Numbers come from the database and say so. Empty states admit emptiness. |
| Fast | No spinner where a skeleton will do. No animation that delays a click. |
| Human | Sentence case, plain words, second person. No jargon, no "leverage". |
| Performance-oriented | Dense tables, tabular figures, right-aligned money. |

**Avoided deliberately:** neon, purple/indigo gradients, glassmorphism, floating
decorative elements, fake charts, icon-in-tinted-square KPI cards, identical card rows.

---

## 2. Typography

Two families in the product shell, one accent serif on the marketing page.

| Role | Family | Where |
| --- | --- | --- |
| UI and body | `Inter` (`--font-sans`) | Whole app: tables, forms, nav, buttons |
| Numerals in data | `Inter` with `font-variant-numeric: tabular-nums` | Stats, table amounts, chart axes |
| Editorial display | `Fraunces` | Marketing headlines only |
| Code, if ever needed | `--font-mono` | Not used in UI copy |

`index.html` also loads Space Grotesk, Archivo, Bricolage Grotesque, Instrument Serif,
Caveat and Courier Prime. These exist because individual theme shells restyle
themselves; they are **not** part of the shared system and must not be used in new
shared components.

### Marketing scale (`src/pages/marketing.css`)

Six fixed sizes, no `clamp()`. Each breakpoint restates the whole scale, so a
change is one edit per breakpoint and never a secret interpolation.

| Token | 1440 | 1024 | 768 |
| --- | --- | --- | --- |
| `--t-xs` | 13 | 13 | 13 |
| `--t-body` | 16 | 16 | 16 |
| `--t-lead` | 20 | 20 | 17 |
| `--t-head` | 28 | 26 | 24 |
| `--t-disp` | 44 | 36 | 32 |
| `--t-big` | 76 | 56 | 40 |

Headlines carry `letter-spacing: -0.03em` at display sizes and tighten to `-0.035em`
on the h1. Body copy never goes below 13px, and no text in the product is set under
11px (enforced: 21 declarations below 11px were raised during the type-floor pass).

### App scale

The app uses rem-based `font-size` inherited from a `16px` root, with component
sizes set explicitly: `12.5px` table cells, `11px` table headers, `11.5px` footers.
The `11px` floor is the minimum.

---

## 3. Colour

One accent, one ground, one ink. Every theme redefines the same token names, which is
why 26 visual languages can restyle the same components without touching them.

### Core tokens (`src/index.css` §2)

| Token | Dark (default) | Light (`html[data-mode=light]`) | Use |
| --- | --- | --- | --- |
| `--text` | `#f2f5f5` | `#101a1d` | Body and headings |
| `--text-2` | `#b9c3c7` | `#49565a` | Secondary copy |
| `--text-3` | `#8e9ca1` | `#5f6d71` | Labels, metadata |
| `--card` | `rgba(255,255,255,.075)` | — | Panel fill |
| `--card-solid` | `#151c20` | — | Opaque panel |
| `--field` | `rgba(255,255,255,.08)` | — | Input and table-head fill |
| `--hairline` | `rgba(255,255,255,.1)` | `rgba(16,32,36,.1)` | One-pixel rule |
| `--lime` | `#36d6c0` | — | The single accent |
| `--on-accent` | `#05231f` | — | Text on the accent |
| `--ok` | `#48d79b` | — | Positive state |
| `--warn` | `#eab757` | — | Attention |
| `--err` | `#ff8b7a` | — | Failure |

`--lime` and `--on-accent` move together: pink with `#2b0b18` ink, lilac with
`#180a33`. Any new accent **must** ship a matching `--on-accent` that reaches 4.5:1,
or the palette fails contrast in that theme.

### Marketing palette

Cool stone, not cream. `--page #edf0ef`, `--ink #101615`, `--soft #4a5559`,
`--block #e1e5e4`, `--plate #d3d8d7`. The accent is the same `#36d6c0`.

Photography runs through a single greyscale treatment
(`filter: grayscale(1) contrast(1.06)`) so twelve different stock frames read as one
commission rather than a mood board.

---

## 4. Space, grid, shape

| Token | Value |
| --- | --- |
| `--mk-margin` | `40px` → `28px` @1024 → `20px` @768 |
| `--mk-gutter` | grid gap, `16px` on phone |
| `--radius-sm` | `10px` |
| `--radius` | `14px` |
| `--radius-lg` | `18px` |
| `--radius-pill` | `999px` |

Marketing uses a 12-column grid with a fixed `--mk-axis` label column on the left,
which is the page's signature move: the printed-report margin. Section padding is
`88px` desktop, dropping to `56px` and `32px`.

Themes override the radius set as a family (`2/3/4`, `3/4/5`, `14/18/22`, …). A
component must therefore read `--radius` rather than hardcode a value, or it will be
the one square corner in a round theme.

**Radius discipline:** one radius for panels, one for controls, pill only for pills and
avatars. A new component that invents a fifth radius is a bug.

---

## 5. Icons

`src/icons.tsx` ships a hand-drawn inline SVG set, 33 names in an `IconName` union,
consumed as `<Icon name="members" size={20} />`. Stroke-based, 1.5px, currentColor.

**Decision: no icon library added.** Lucide and Phosphor were evaluated during the
audit. The existing set is already consistent, tree-shakes to nothing, and adds zero
kilobytes; swapping it would be a 33-call-site refactor with no user-visible gain.
Rule 9 of the directive (no unnecessary dependencies) wins over rule 10 of the brief.

New icons are added to the union and the `iconPaths` record, never imported ad hoc.

---

## 6. Components

The kits are `src/components/kit.tsx` (Button, Badge, Panel, Field, Modal, Title,
Empty), `MemberCard.tsx`, `SummaryBoard.tsx`, and the shell in `App.tsx`.

### Shared hooks that must not be renamed

26 theme blocks in `index.css` reach for these selectors. Renaming one silently
unstyles that element in every theme, with no error.

```
.board-hero  .board-hero-stats  .board-card  .board-amount  .board-filter
.board-table  .stat  .stat-label  .stats  .member-card
.page-heading h1  .page-heading p  .tabs button
```

### States every interactive component carries

Rest, hover, focus-visible (3px accent offset ring), active, disabled, and busy.
Disabled controls that would otherwise fail silently carry a `title` explaining why
(for example "Settle payment" with nothing selected).

### Data components

- **Tables** live in `.table-scroll` with `overflow-x: auto` and a `620px` minimum
  table width, so a phone scrolls the table rather than the page.
- **Numbers** are right-aligned with tabular figures. Money is stored in minor units
  and formatted at the edge.
- **Skeletons** show the shape of the panel being fetched; spinners are not used for
  content areas.
- **Empty states** say what is missing and what to do next, and never invent rows.

---

## 7. Motion

| Layer | Mechanism | Reversible |
| --- | --- | --- |
| Page entrance | GSAP timeline in `App.tsx` (autoAlpha + stagger), `clearProps` after | n/a |
| Marketing reveals | `useReveal` + IntersectionObserver, `data-revealed`, disconnects after firing | Yes, content visible if JS fails |
| Marketing images | `@keyframes mk-shutter` (clip-path) and `mk-settle` (scale 1.12 → 1) | Disabled under reduced motion |
| Hover and state | CSS transitions, transform and opacity only | Yes |

**No Framer Motion was installed.** GSAP 3.15 is already a dependency and covers the
timeline work; the remaining motion is CSS and one IntersectionObserver. Adding a
second animation runtime for the same job would be exactly the dependency the brief
forbids.

Rules: animate transform and opacity, never layout. Nothing delays an input. Every
entrance has a `prefers-reduced-motion` fallback that leaves the content visible, not
hidden.

---

## 8. Accessibility floor

- Text contrast verified in **all 26 themes, both modes**, by
  `tests/contrast.spec.ts`, which reads computed backgrounds and requires the same
  floors everywhere. This is a test, not an intention.
- Focus is never removed; focus-visible rings are drawn with the accent.
- Touch targets on phone are 44px minimum.
- Tables keep their `<th>` semantics when the layout stacks on a phone.
- Reduced motion is honoured in every animated layer.

---

## 9. The rule for new work

1. Read the token, never the literal.
2. If a value is needed twice, it becomes a token.
3. If a component is needed once, it stays local; twice, it moves to `kit.tsx`.
4. A new theme overrides tokens and shell geometry, never component internals.
5. Any new colour ships with a contrast check in all themes, or it does not ship.
