# AUDIT

Audit of the existing TwoPlus codebase. Findings only: no redesign, no stack
replacement, no schema changes. Every number here was measured on
2026-11-04/05 against `D:\TwoPlus\TwoPlus-repo` at commit `8a23d62` plus the
uncommitted work listed in `IMPLEMENTATION_PLAN.md`.

## How this audit was measured

| Gate | Command | Result |
| --- | --- | --- |
| Types | `npx tsc -b` | exit 0 |
| Build | `npm run build` | exit 0, 4.8 s |
| Lint | `npx oxlint` | 27 warnings, 0 errors (11 `src`, 16 `mobile`) |
| Tests | `npx playwright test` | 42 tests, 41 pass, 1 flake (`screens`) |

The `screens` failure reported `/app/people/members: empty heading`. It does not
reproduce: the heading renders, `npx playwright test screens` passes 2/2, and the
cause is load timing under `networkidle` on a cold dev server. Recorded as a
flake in `ISSUES.md`, not fixed by weakening the assertion.

## 1. Architecture

React 19 + Vite 8 + TypeScript 6 + Tailwind v4 + Supabase, with Electron and
Capacitor wrappers. Multi-tenant by `organization_id`, with RLS in the database
as the real boundary and role checks in the UI only as an explanation.

```
src/
  App.tsx                184.1 KB   the whole workspace, one component
  pages/                 SuperAdmin 70.3, Member 20.6, Marketing 21, Manual, DocPages
  components/            25 files, kit.tsx + ui/ primitives
  lib/                   api.ts 53.6, member-api.ts 24.4, auth, org, theme, navigation
  router.tsx             route table, guards
  index.css              64 KB, design tokens + all component CSS
```

**Finding A1 (structural, highest cost).** `App.tsx` is 184 KB with 47 `useState`
calls in one component. Every workspace module renders from it. It is the single
biggest maintenance and review risk in the project. This is a split-the-file
problem, not a rewrite: extract module panels, but only where a seam already
exists.

**Finding A2.** `index.css` at 64 KB holds tokens and all component CSS together.
Tokens are already cleanly grouped at the top. This is acceptable for now; it is
a monolith, but a coherent one.

**Assessment.** The layering itself is sound: `lib/` has no React, `pages/` do
not touch Supabase directly except through `lib/`, and types live in
`types.ts`. The problem is size, not shape.

## 2. UI, layout and design system

Tokens are real and consistent: `--font-sans` Inter, radii 10/14/18/999,
`--blur-card` 18px, dark `--app-bg` `#0b1012`, light `#eef0f0`, with `--ok`,
`--warn`, `--err`, `--focus`. Both modes are defined as full token sets on
`html[data-mode]`, not as filters over one palette. That is the right build.

**Finding B1 (misleading names, correct values) — checked, not a defect.** My
first pass called `--lime` and `--lavender` "dead tokens". That was wrong. Both
resolve to `#ffffff` in dark and `#14181a` in light (`index.css:146-147`,
`:197-198`) and are referenced **79 times across 8 files**: `index.css` 47,
`auth.css` 11, `init.css` 10, `identity-card.css` 6, `marketing.css` 4,
`member.css` 2, `rubber-segment.css` 2, `floating-dock.tsx` 1. They are the
light-on-dark ink/accent colour used throughout, so the value is doing real work.
Only the *name* misleads: a future contributor would read `--lime` as a green
accent and use it as one. Renaming would touch 79 call sites for zero visible
gain, so this is recorded and left alone. Add a one-line comment at the
definition instead if it ever causes a bug.

**Finding B2 (ad-hoc colour).** 44 hardcoded hex colours in `.tsx` files bypass
the token system.

**Finding B3 (ad-hoc layout).** 64 inline `style={{ }}` attributes. Some are
legitimate (computed positions from measured geometry); some are values that
belong in CSS. Not all of these are wrong.

**Finding B4 (one dead attribute).** `document.documentElement.dataset.style`
is set by the old screenshot harness and read by nothing: zero references in
`src/`. Mode is `data-mode`; there is no style axis. Removed from the harness,
left in the app alone because nothing reads it.

**Not a finding.** Glassmorphism is deliberate brand direction for this product
and is used throughout by design, not by accident.

## 3. Navigation and information architecture

Two levels: a 64 px icon-only side dock for categories, and a spotlight nav for
the items inside the active category. Routes are `/app/<category>/<item>`, built
by `pathFor()` in `lib/navigation.ts`, which is the single source of truth and is
imported by both the app and the test suite. That is a good seam.

**Finding C1 (checked, not a defect).** The side dock items are icon-only `<a
href>` links, which looked like an accessibility gap on inspection. A browser
probe (`scripts/_a11y-probe.mjs`) disproved it: all 8 links carry `aria-label`
and `title` taken from the category label in `NAV_CATEGORIES`, and the focused
link renders `outline: solid 2px rgb(14, 122, 108)`. Accessible names and focus
visibility are already correct, so nothing was changed. Recorded because the
first reading of the code was wrong.

## 4. Animation and motion

**Finding D1 (fixed during this audit).** Two animation systems were installed
and both imported: `motion`/`motion/react` and `framer-motion`, identical
versions, same API surface. Seven files used `framer-motion`: `animated-number`,
`gooey-search`, `social-flip-button`, `spotlight-navbar`, `glass-dock`,
`interactive-book`, `share-sheet`. Every import was swapped to `motion/react`
with no body changes and `framer-motion` was removed from `package.json`. One
system now, one dependency less.

**Finding D2 (good).** Reduced motion is honoured properly, by both CSS media
query and `useReducedMotion()`, in `BellToggle`, `FlipCard`, `PeekRating`,
`identity-card.css`, `init.css`, `rubber-segment.css` and `BellToggle.css`. The
pattern is established; new motion should follow it.

**Finding D3 (good).** The 556 kB `wave-grid-background` chunk (three.js) is
`lazy()` + `Suspense` inside `AuthLayout` only, so the workspace never pays for
it. Correctly deferred; the build warning is expected, not a defect.

## 5. Engineering quality

**Finding E1 (hygiene, good).** Zero `TODO`/`FIXME`/`HACK` markers and zero
`console.log` in `src/`. No debug residue.

**Finding E2 (type safety).** Three `: any`. Two are real
(`animated-number.tsx:190` `variants`, `animated-tooltip.tsx:36` `event`); the
third is the word "any" in a comment. Low severity, trivial to tighten.

**Finding E3 (React correctness, real).** Four `setState` calls synchronously
inside effects (`member-sync.ts:118`, `AuthLayout.tsx:113`, `org.tsx:40`,
`Member.tsx:129`) and four refs read during render (`PeekRating.tsx:141`,
`animated-number.tsx:71` and `:170`, `SlideCommit.tsx:303`). These are the only
lint findings that can produce visible misbehaviour rather than noise.

**Finding E4 (fast refresh).** Three files export both components and non-
components (`auth.tsx:55`, `org.tsx:118`, `ErrorBoundary.tsx:75`). Developer
experience only: it forces a full reload instead of hot-swapping during work on
those files. No user-facing impact.

**Finding E5 (mobile).** 16 lint warnings are unused imports in `mobile/`. They
are dead code, not bugs, but they are the reason `npm run lint` is noisy enough
to hide a new real warning.

## 6. Data and schema

**Finding F1 (live drift, material).** Only migrations `0001`, `0002`, `0003`
are recorded in `supabase_migrations.schema_migrations`, yet all 38 public tables
and `organizations.theme_style` exist. Later migrations were applied by hand
without being recorded.

**Measured precisely.** Probing the live database object by object, rather than
trusting `schema_migrations`, shows every migration is already applied except two:

| Missing | Effect today |
| --- | --- |
| `0005` — `members.photo_url` | Saving a member with a photo URL fails |
| `0016` — `delete_my_account()` | The member app's "delete my account" cannot work |

**Consequence, proven (0005):** `members.photo_url` is ABSENT from the live
database although `0005_member_photos.sql` adds it. `src/lib/api.ts` writes
`photo_url` when it is non-empty (`createMember:160`, `updateMember:196`) and
`App.tsx:2643` and `:2878` pass it through, so **saving a member with a photo URL
fails today** with "Could not create the member" / "Could not update the
member". The empty-photo case is guarded, which is why this has gone unnoticed.

**Consequence (0016):** `delete_my_account()` does not exist, so the member app's
self-erasure action cannot complete. This is the one that matters legally under
the DPDP Act, not cosmetically: the app offers a delete control that cannot work.

**Dry-run done:** both were applied inside a single transaction against the live
database and rolled back, so nothing was written. `0005` adds the column. `0016`
creates the function, revokes it from `public`, grants it to `authenticated` only,
and `has_function_privilege('authenticated', ...)` reads `t`. Both apply cleanly.

Both need owner approval because they write to the live database. Not applied
during this audit.

**Finding F2 (data safety, good).** The restore procedure in `docs/OPERATIONS.md`
was rehearsed into a scratch project and found three real defects in its own
runbook, all fixed (see `docs/RESTORE-REHEARSAL.md`). Restoring `public` in one
pass, keeping privileges in the dump, and not relying on `--disable-triggers`
are now documented correctly.

## 7. Verification tooling

**Finding G1 (fixed during this audit).** `scripts/shots.mjs` was broken against
the current app. It looked for `.floating-rail` and `.rail-more-menu`, which no
longer exist, and only logged in if an email field was on the landing page. It
therefore screenshotted the public marketing page and printed
`no page errors, no overflow`, which is worse than failing: it reported success.
Rewritten to sign in at `/login`, reuse the session across viewports, navigate by
route, and exit non-zero on any problem. Verified by capturing the real Members
screen at three widths.

## Summary

| Area | State |
| --- | --- |
| Type safety | Sound; 2 trivial `any` |
| Build | Green |
| Tests | 41/42 green, 1 known flake |
| Animation | Unified to one system (fixed) |
| Design tokens | Real and dual-mode; 2 dead aliases |
| Accessibility | Good overall; icon-only dock is the gap |
| React correctness | 8 real lint findings |
| Maintainability | `App.tsx` at 184 KB is the main risk |
| Schema | Live drift blocks member photos |
| Verification | Screenshot harness repaired |

Nothing in this audit recommends replacing any part of the stack. Every
actionable item is a bounded fix.
