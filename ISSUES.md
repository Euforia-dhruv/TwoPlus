# Issues

Open defects and technical debt, newest first. Each has a severity, a precise
location, and the reason it is not yet fixed.

Severity: **S1** breaks a user flow · **S2** wrong behaviour in an edge case ·
**S3** maintainability / DX.

---

## S1 — Saving a member with a photo fails on the live database

- **Where:** `supabase` live project, table `public.members`; callers
  `src/lib/api.ts:160` and `:196`, `src/App.tsx:2643` and `:2878`.
- **Symptom:** adding or editing a member with a photo URL returns
  "Could not create the member" / "Could not update the member".
- **Cause:** `members.photo_url` does not exist. Only migrations `0001`, `0002`,
  `0003` are recorded in `supabase_migrations.schema_migrations`; later ones were
  applied by hand, and `0005_member_photos.sql` was not among them.
- **Fix:** `alter table public.members add column if not exists photo_url text;`
  (idempotent, additive, touches no existing data).
- **Not fixed because:** it is a write to the live production database and
  requires explicit owner approval.

## S1 — Migration history is inaccurate on the live database

- **Where:** `supabase_migrations.schema_migrations`.
- **Symptom:** 3 of 16 migrations recorded, while all 38 tables and later columns
  exist. The next `supabase db push` cannot be trusted to know what is applied.
- **Fix:** needs a decision per migration on whether it is already fully applied,
  then backfilling the history. Migration `0005` is the proven gap.
- **Not fixed because:** reconciling history is a destructive-risk operation on a
  live database and needs owner sign-off.

## Closed — Icon-only side dock accessible name (reported, then disproved)

- **Where:** `src/App.tsx:1045-1057`, `.app-side-nav` items.
- **Reported symptom:** dock anchors are icon-only, so a screen-reader user
  hears no destination.
- **Reality:** measured with `scripts/_a11y-probe.mjs`. All 8 links carry
  `aria-label` and `title` taken from `NAV_CATEGORIES[].label`, and the focused
  link shows `outline: solid 2px rgb(14, 122, 108)`.
- **Conclusion:** not a defect. No code changed. The original finding came from
  reading `App.tsx` (which passes only `title`) without following it into
  `floating-dock.tsx:206`, where the attribute is actually set.

## S2 — React: `setState` called synchronously inside an effect (4 sites)

- **Where:** `src/lib/member-sync.ts:118`, `src/pages/AuthLayout.tsx:113`,
  `src/lib/org.tsx:40`, `src/pages/Member.tsx:129`.
- **Symptom:** triggers a second render on mount. In `org.tsx` this affects every
  workspace load.
- **Fix:** derive during render or initialise state directly where possible;
  keep the effect only where it synchronises with an external system.
- **Status:** in progress this session.

## S2 — React: refs read during render (4 sites)

- **Where:** `src/components/ui/PeekRating.tsx:141`,
  `src/components/ui/animated-number.tsx:71` and `:170`,
  `src/components/ui/SlideCommit.tsx:303`.
- **Symptom:** the value can be stale, so the component may not update as
  expected.
- **Fix:** read inside an effect or event handler, or mirror into state.
- **Status:** in progress this session.

## S3 — `App.tsx` is 184 KB with 47 `useState` in one component

- **Where:** `src/App.tsx`.
- **Symptom:** every workspace module renders from one component; review and
  change risk is the highest in the project.
- **Fix:** extract module panels one at a time, Members first, verifying with the
  existing suite between each.
- **Not fixed because:** multi-hour structural change with real regression
  surface; needs an agreed approach before starting.

## S3 — Misleading token names (checked, no change warranted)

- **Where:** `src/index.css`, `--lime` and `--lavender`.
- **Symptom:** the names suggest green and purple accents, but both resolve to
  `#ffffff` in dark and `#14181a` in light. They are used 79 times across 8
  files as the light-on-dark ink colour, so the value is correct and load-bearing;
  only the name misleads.
- **Fix:** none. Renaming would touch 79 call sites for no visible gain. If a
  future bug traces back to this, add a clarifying comment at the definition.
- **Status:** closed.

## S3 — 16 unused imports in `mobile/`

- **Where:** `mobile/app/(tabs)/coach.tsx`, `profile.tsx`, `index.tsx`,
  `mobile/app/workout.tsx`, `mobile/src/lib/useAsync.ts`.
- **Symptom:** dead code, and enough lint noise to hide a new real warning.
- **Fix:** remove the unused imports; prefix intentionally-unused variables.
- **Status:** in progress this session.

## S3 — Two real `any` types

- **Where:** `src/components/ui/animated-number.tsx:190` (`variants`),
  `src/components/ui/animated-tooltip.tsx:36` (`event`).
- **Fix:** type both.
- **Status:** in progress this session.

## S3 — Three files export component and non-component together

- **Where:** `src/lib/auth.tsx:55`, `src/lib/org.tsx:118`,
  `src/components/ErrorBoundary.tsx:75`.
- **Symptom:** fast refresh falls back to a full reload for those files.
  Developer experience only; no user-facing impact.
- **Fix:** move the non-component exports into their own modules.
- **Not fixed because:** churn on the auth and org providers for a DX-only gain;
  not worth the regression risk in this pass.

## Known flake — not a defect

`tests/screens.spec.ts` once failed with `/app/people/members: empty heading`.
The heading renders correctly (proven by direct DOM probe: one `main h1`, text
"Members", visible) and the spec then passed 2/2. Cause is load timing on a cold
dev server under `networkidle`. Left as-is deliberately: weakening the assertion
would remove the check entirely.

---

## Closed during this audit

| Issue | Resolution |
| --- | --- |
| Two animation systems installed (`motion` + `framer-motion`) | 7 import sites unified to `motion/react`; package removed; gates green. |
| `scripts/shots.mjs` screened the wrong page and reported success | Rewritten: signs in at `/login`, reuses the session, navigates by route, exits non-zero on problems. Verified against the real Members screen. |
| Restore runbook would have failed a real recovery | Rehearsed into a scratch project; three defects fixed in `docs/OPERATIONS.md`, evidence in `docs/RESTORE-REHEARSAL.md`. |
