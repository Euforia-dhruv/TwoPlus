---
name: TwoPlus.fit
description: Multi-tenant gym management for independent Indian gyms — a translucent ledger you can see through.
colors:
  lime: "#c3ff38"
  lime-deep: "#a8e21b"
  lavender: "#b6a0fa"
  olive-shell-light: "rgba(255,255,255,0.64)"
  olive-shell-mid: "rgba(246,248,241,0.48)"
  olive-shell-deep: "rgba(230,236,225,0.56)"
  olive-surface: "rgba(255,255,255,0.56)"
  olive-surface-faint: "rgba(255,255,255,0.25)"
  workspace-canvas: "#d5d1bc"
  ink: "#2d332d"
  ink-strong: "#30362f"
  ink-muted: "#6d756d"
  ink-faint: "#8a9185"
  glass-border: "rgba(255,255,255,0.55)"
  glass-border-strong: "rgba(255,255,255,0.78)"
  verified-green: "#7a9863"
  verified-green-bg: "#f2f7eb"
  trial-amber: "#b19b64"
  trial-amber-bg: "#fcf8ea"
  suspended-red: "#be9180"
  suspended-red-bg: "#fcf2ed"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-1.05px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  table:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "29px"
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: "-1px"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "1.25px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "20px"
  rail: "25px"
  shell: "38px"
spacing:
  xs: "5px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "23px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "#141414"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
    height: "34px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.5)"
    textColor: "#4f5949"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
    height: "34px"
  input:
    backgroundColor: "rgba(255,255,255,0.5)"
    textColor: "#414b3a"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
    height: "34px"
  input-modal:
    backgroundColor: "#f8faef"
    textColor: "#3a442f"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
    height: "39px"
  card-panel:
    backgroundColor: "{colors.olive-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "23px"
  card-stat:
    backgroundColor: "{colors.olive-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "18px 19px"
  badge:
    backgroundColor: "rgba(255,255,255,0.5)"
    textColor: "#5f695a"
    rounded: "5px"
    padding: "3px 6px"
    height: "18px"
  modal:
    backgroundColor: "#ecefe4"
    textColor: "#333b30"
    rounded: "{rounded.lg}"
    padding: "24px"
  nav-rail:
    backgroundColor: "rgba(249,250,242,0.78)"
    textColor: "#6c7467"
    rounded: "{rounded.rail}"
    padding: "10px 6px"
    width: "50px"
---

# Design System: TwoPlus.fit

## Overview

**Creative North Star: "The Glass Ledger"**

TwoPlus.fit is a ledger you can see through. The product exists because gym records were scattered across paper registers, spreadsheet cells and disconnected chat threads, and the interface answers that by putting every figure on a translucent surface that still shows the world behind it. Nothing is opaque enough to hide a number. Layers stack the way a working desk stacks paper: the shell holds panels, panels hold rows, and each layer keeps a visible edge so a person can tell what sits on top of what.

The canvas is a photographic workspace — a lit interior, softly tinted — and everything above it is milk glass. That choice carries the philosophy: the product is an instrument laid over a real room, not a screen that replaces it. Olive and cream do the quiet majority of the work; one live accent, keyed to a per-gym theme, is spent sparingly on the point of action. Lavender appears only where the system needs a second voice, and it never competes with the accent.

The system is built for a front desk where one person is doing three jobs at once. That is where the ambition goes: scanability, unambiguous states, and numbers set large enough to read at a glance. Expression lives in material and light — the glass gradients, the single inset highlight along every top edge — never in ornament. A gym owner should finish a renewal without noticing the design and still trust every rupee on the screen.

**Key Characteristics:**
- Milk-glass layering over a tinted photographic workspace canvas; nothing fully opaque except modals and the top-level shell.
- One licensed accent per workspace, chosen from four presets, carrying every primary action and every live indicator.
- Olive-and-cream neutrals with very low chroma; colour appears only where it means something (state, action, growth).
- Inter throughout, at a small base size (13px) with figures pushed much larger than body text.
- Depth from both shadow and translucency: a soft ambient shadow plus an inset white highlight on every raised edge.
- Motion is a single confident entrance per view, then stillness.

**This document describes the default language (Glassmorphism).** The product
ships 26 design languages behind one switcher, so the sections below are the
house style, not the only one. See [Design languages](#design-languages) for how
a second language overrides type, colour, material and shell, and which rules
every language must still obey.

## Colors

An olive-and-cream ground, one electric accent, and three muted state colours that never read as decoration.

### Primary
- **Live Lime** (#c3ff38, sage default): the licensed accent. Primary buttons, the active rail icon, selected tab underlines, positive deltas, key dots in charts, and the logo mark. Under the lagoon, blush and lilac presets this token is remapped to teal (#3fd6bf), rose (#ff9ec2) and violet (#bda6ff) respectively — the role is fixed, the hue is tenant-owned.
- **Lime Shadow** (#a8e21b): hover state for the accent, produced with `color-mix(in srgb, var(--lime) 82%, white)`.

### Secondary
- **Shade Lavender** (#b6a0fa): the second voice, used only for chart series that must be distinguished from the accent, the growth card, and the alternate ring legend. Never for actions.

### Neutral
- **Workspace Canvas** (#d5d1bc): the fallback ground behind the photographic backdrop; warm stone, not grey.
- **Milk Glass Shell** (rgba(255,255,255,0.64) → rgba(246,248,241,0.48) → rgba(230,236,225,0.56)): the 135° gradient that defines the main application shell.
- **Panel Glass** (rgba(255,255,255,0.56) → rgba(255,255,255,0.25)): every card, table container and stat tile.
- **Ink** (#2d332d): primary text. **Ink Strong** (#30362f): headings and figures. **Ink Muted** (#6d756d): descriptions and secondary metadata. **Ink Faint** (#8a9185): eyebrows, table headers, footers.
- **Glass Border** (rgba(255,255,255,0.55)): the standard 1px edge on every glass surface; strong variant (rgba(255,255,255,0.78)) on interactive controls.
- **Verified Green** (#7a9863 on #f2f7eb): paid, active, completed, resolved. **Trial Amber** (#b19b64 on #fcf8ea): pending, trial, due, in progress. **Suspended Red** (#be9180 on #fcf2ed): expired, overdue, suspended, cancelled, failed.

**The One Accent Rule.** A workspace licenses exactly one accent hue. It appears on primary actions, the active navigation item, and live data markers — and nowhere else. If a screen needs a second emphasis, it gets weight or space, not a new colour.

**The State Colours Are Not Decoration Rule.** Green, amber and red exist only inside status badges and due-date figures. They never fill a panel, border a card, or colour a heading.

## Typography

**Display Font:** Inter (with system-ui, sans-serif)
**Body Font:** Inter (same stack, weights 400–750)

**Character:** A single neutral grotesque carrying every size from 9px labels to 43px summary headings. There is no display face and no pairing; hierarchy is built entirely from scale, weight and letter-spacing. This is deliberate — a second typeface would compete with the figures.

### Hierarchy
- **Display** (600, 28px, 1.25, -1.05px): page titles only, one per view.
- **Summary Display** (550, clamp 28–43px, 1.2, -1.2px): the gym name on the summary view.
- **Title** (600, 18px): modal headings. Section headings sit at 15px.
- **Figure** (550, 29px, 1.1, -1px): stat values. The largest type in the product, always a number or a currency amount.
- **Body** (400, 13px, 1.6): form text and prose. Table cells drop to 10–11px; descriptions to 11px.
- **Label** (550, 9px, 1.25px letter-spacing): eyebrows and section captions. Uppercase by CSS in the zoom/switcher only; otherwise sentence case with wide tracking.

**The Figures Outrank Words Rule.** On any screen, the numbers are the largest type. No heading, label or button may be set larger than the primary figure it describes.

**The One Point One Rule.** Display and figure sizes use negative tracking of roughly -1px. Every other size uses normal tracking. The contrast in spacing is what signals "this is a headline" without a second font.

## Layout

A fixed shell, not a full-bleed page. `.app` pads the top, bottom and rail side
from tokens (`--shell-pad-*`); the shell inside is capped at 1440px and centred,
with a large radius and hidden overflow. Content padding inside the shell is
32px horizontally at top level.

Navigation geometry is not one design, because seven shells share the same
markup. The shell is chosen by `data-layout` on `<html>`, set from the theme
record, and every rule that moves the rail or pads the page keys off it:

- `float` — full-height frosted icon rail down the left edge, free of the shell.
- `docked` — labelled sidebar, flush left, part of the frame.
- `strip` — a tab strip across the top of the shell.
- `operator` — narrow icon rail plus an instrument bar.
- `index` — a contents column on the right.
- `tabs` — one phone-width column with a bottom bar.
- `clay` — a floating capsule across the top.

Inside, the grid is 12-column in spirit: `.board` splits 1.85fr / 1fr with a
14px gap; `.stats` is a 4-up equal grid; tables are full-width, so density stays
low enough to tap.

Responsive behaviour is a progressive collapse, not a reflow: 1100px narrows
docked rails and stacks the overview; 820px turns rails into a bottom bar and
collapses the stat strip to two columns; 480px drops to one column.

**The Shell Declares Itself Rule.** A style picks a shell from the seven and
never invents rail geometry of its own. New geometry means a new shell layout,
declared once, not a style-name exception.

**The Section Padding Rule.** Panels pad 23px, stat tiles 18px/19px, table
toolbars 15px/18px. Never mix these inside one column — the rhythm between cards
is how the eye separates sections without dividers.

## Elevation & Depth

A hybrid: translucency establishes layer order, shadow only confirms it. Every raised surface carries two shadows at once — an ambient drop and an inset top highlight — because the inset line is what reads as the lit edge of a physical pane.

The shell floats highest: `0 30px 80px rgba(50,58,43,.22)` with `inset 0 1px 0 #fff`. Cards sit inside it at `0 12px 32px rgba(51,62,43,.09)` plus `inset 0 1px 0 rgba(255,255,255,.9)`. The rail floats at `0 18px 45px rgba(49,58,39,.18)`. Modals jump above everything at `0 30px 90px rgba(39,48,33,.3)` and are the only surfaces that abandon translucency for a near-solid fill, because a dialog must not be read through.

### Shadow Vocabulary
- **Shell Lift** (`0 30px 80px rgba(50,58,43,.22), inset 0 1px 0 #fff, inset 0 -1px 0 rgba(255,255,255,.3)`): the application frame only.
- **Pane Rest** (`0 12px 32px rgba(51,62,43,.09), inset 0 1px 0 rgba(255,255,255,.9)`): cards, panels, tables, stat tiles.
- **Rail Hover** (`0 18px 45px rgba(49,58,39,.18), inset 0 1px 0 #fff`): the floating navigation rail.
- **Dialog Above** (`0 30px 90px rgba(39,48,33,.3), inset 0 1px 0 #fff`): modals and the profile drawer.
- **Overlay Scrim** (`background: rgba(43,52,37,.22); backdrop-filter: blur(12px)`): behind any modal or drawer.

**The Two-Shadow Rule.** Every elevated glass surface pairs an ambient drop shadow with an inset white highlight. A surface with only a drop shadow reads as a sticker; only an inset reads as flat. Both together read as glass.

**The Dialog Is Solid Rule.** Modals and drawers are the one place translucency stops. A user reading a confirmation must never see the record behind it.

## Shapes

Softly rectangular with generous radii on containers and full pills on controls. The form language is rounded-functional: nothing is a sharp corner, nothing is a blob.

The shell takes 38px (24px on mobile), the navigation rail 25px, cards and tables 16px, stat tiles 15px, modals 12px, and buttons and inputs are pills (20px) or 6px respectively. The outer radius always exceeds the inner by enough that nested corners look concentric — shell 38px around panels at 16px, panels at 16px around a 6px input.

The recurring decorative gesture is a single 1px translucent border on every surface, paired with a top inset highlight. There are no dividers drawn as dark lines: separation comes from a faint white edge and a 20px gap. Circles are reserved for avatars (32px, 29px small), rail buttons (38px), badges' 4px status dots, and the membership ring.

**The Concentric Corner Rule.** An inner corner is never the same radius as its container. Outer radius minus padding must be greater than or equal to the inner radius, or the nesting looks wrong at a glance.

## Components

### Buttons
- **Shape:** pill, 20px radius, 34px min height.
- **Primary:** live lime fill, near-black text (#141414), 1px lime border, 8px/12px padding, 11px/500 label. The accent is the button — there is no second primary treatment.
- **Hover:** the fill lightens toward white via `color-mix`, text stays dark. No lift, no scale.
- **Secondary:** translucent white fill (rgba(255,255,255,.5)) with a glass border and olive text (#4e5949); on hover the fill goes to near-white.
- **Disabled:** 40% opacity, cursor default, no colour change. Disabled buttons are used to express *missing capability* and carry a `title` explaining why.

### Badges
- **Style:** 9px label, 3px/6px padding, 5px radius, a 4px `currentColor` dot, and a translucent fill with a 1px border.
- **States:** neutral (olive on glass), green (verified/paid/active), amber (pending/trial/due), red (failed/suspended/expired). Radius is 5px, deliberately tighter than any container, so a badge never looks like a small card.

### Cards / Containers
- **Corner Style:** 16px on panels and tables, 15px on stat tiles.
- **Background:** a 145° white gradient from 56% to 25% opacity over the canvas.
- **Shadow Strategy:** Pane Rest, always with the inset highlight.
- **Border:** 1px rgba(255,255,255,.72).
- **Internal Padding:** 23px panels, 18px/19px stat tiles.
- **Signature treatment:** a `:before` pseudo-element lays a second 125° highlight gradient across the top-left corner. It is the single most identifying detail of the system.

### Inputs / Fields
- **Style:** 34px tall (39px inside modals), 6px radius, translucent white fill, 1px glass border, 11px olive text, 10px horizontal padding.
- **Focus:** a global 2px outline in olive-green (#6a9078) at 3px offset. No glow, no shadow change.
- **Search:** a wrapper field that carries the border and shadow, with the inner input stripped bare (no border, transparent background) and a `kbd` hint on the right.
- **Error / Disabled:** errors appear as a discrete alert block above the submit action, never as red text under the field; disabled uses the global 40% opacity.

### Navigation
- **Style:** a floating glass rail of circular icon buttons, 38px, 10px apart, with an accessible label per icon and no text at rest.
- **Default / Hover / Active:** default icon in warm off-white; hover fills with rgba(255,255,255,.17); active fills the same and colours the icon with the live accent.
- **Mobile:** the rail becomes a horizontal bottom bar at 540px, and the full navigation moves into a slide-over drawer with a blurred scrim.

### Modal
- **Style:** 480px wide, 12px radius, 90vh max, near-solid warm fill (#ecefe4, or rgba(30,30,30,.96) in dark).
- **Structure:** a heading block with title and one-line subtitle, a 24px-gapped body of labelled fields, then a footer with a top border and right-aligned Cancel plus the confirming action.
- **Behaviour:** clicking the scrim closes it; clicking inside does not. Consequential actions state their consequence in the subtitle rather than relying on the button label.

## Design languages

The workspace owner picks one of 26 languages, and it applies to everyone in
that gym. The picker lives in Settings; the Design Studio renders every language
with real components so the choice is made by looking, not by reading a name.

A language is data, not a forked component tree. Each one is a record in
`src/lib/styles.ts` holding custom properties for colour, type, radius, blur and
material, selected per mode:

```
StyleTokens { base?, dark: Palette, light: Palette }
```

`applyTheme` writes the active record's values onto `<html>` as inline custom
properties, and removes any token the next language does not declare, so no
language leaks into another. The nine oldest languages keep their token blocks
in `index.css` instead; both routes arrive at the same custom properties, which
is why no component is aware of any language by name.

What a language may change:

| Axis | Examples |
|---|---|
| Type | Archivo (Neo-Brutalism), Courier Prime (Scrapbook), Space Grotesk (Y2K, Bento), Fraunces (Luxury, Bohemian, Victorian, Wabi-Sabi), Instrument Serif (Ethereal), Caveat (Conceptual Sketch), mono (Pixel, Cyberpunk, Cybercore) |
| Material | Glass blur, clay extrusion, neumorphic insets, 2px ink rules, engraved keylines, dashed pencil borders |
| Shape | 0px (Swiss, Pixel, Brutalism), 4px radius, 19px, 36px (Surrealism), arch tops (Bohemian) |
| Colour | Paper-and-ink, near-black neon, hazard yellow, oxblood, muted clay, chrome |
| Shell | One of the seven layouts listed under Layout |
| Signature | Rotated scrapbook cards, Swiss hairline stat columns, a two-tone rule under the heading, cut-off corners, a filled first bento tile |

What every language must keep, because usability is not a style option:

- **One accent per screen.** The accent token may be yellow, oxblood or violet, but it stays the only colour carrying a primary action.
- **Contrast.** Body text is set in `--text` on `--card`, and every language's pair is chosen to stay readable. Muted text (`--text-2`, `--text-3`) is for labels and captions, never for the only copy in a row.
- **State colours stay semantic.** `--ok`, `--warn`, `--err` may be retuned per language, but green still means good and red still means a problem.
- **The shell is chosen, not invented.** Rail geometry comes from the layout, so a language cannot push content under a fixed rail.
- **Reduced motion.** Signature details are structural; any animation still stops under `prefers-reduced-motion`.
- **The photo is optional.** Only Glassmorphism and Synthwave keep the photographic canvas; every other language paints its own surface over the card token.

**The Data Over Fork Rule.** A new language is one record (or one CSS block for
backwards compatibility) plus an entry in the registry. If adding a language
requires touching a component, the component is doing the theme's job.

### Toast
- **Style:** bottom-right, 24px inset, near-black translucent fill with a blur and a 1px white border, 8px radius, 12px text, auto-dismissing after four seconds.
- **Content:** past tense, specific — "Payment recorded", not "Success". Demo or unsaved outcomes say so explicitly.

## Do's and Don'ts

### Do:
- **Do** keep the accent to primary actions, the active nav item and live data markers — one hue per workspace.
- **Do** pair an ambient drop shadow with an inset white highlight on every raised surface.
- **Do** set figures (29px, 550, -1px) larger than any heading on the same screen.
- **Do** keep the navigation rail floating over the canvas margin rather than inside the shell's layout.
- **Do** state consequences in modal subtitles and outcomes in past tense toasts.
- **Do** preserve the 38 / 16 / 6 radius hierarchy so nested corners stay concentric.
- **Do** honour `prefers-reduced-motion` — the entrance timeline is skipped entirely, not shortened.

### Don't:
- **Don't** drift toward a pastel wellness aesthetic. Soft blobs, oversized rounded-friendly type, stock yoga photography and gentle gradients belong to a different product; this one is an instrument with a visible ledger.
- **Don't** introduce a second typeface, or a display face for headings. Inter at scale is the system.
- **Don't** use green, amber or red outside status badges and due-date figures.
- **Don't** make a modal, drawer or toast translucent — the one layer a user must read clearly stays solid.
- **Don't** add a second primary button to one viewport. One accent-coloured action per screen.
- **Don't** replace the glass panels with flat white cards, or remove the inset highlight; both are load-bearing for the material.
