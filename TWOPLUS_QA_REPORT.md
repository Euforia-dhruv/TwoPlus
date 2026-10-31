# TwoPlus.fit: QA Report

Measured at commit `5704080`, on the production build (`npm run build` → `vite preview`
on port 4173), not the dev server.

---

## Gate results

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck + build | `npm run build` | Pass, built in ~300ms |
| Lint | `npm run lint` | Pass, 3 pre-existing warnings |
| Automated tests | `npx playwright test` | **84 / 84 pass** in 5.3m |
| Design gate, marketing | `inspect.mjs http://localhost:4173/` | **0 FAIL**, 3 accepted WARN |
| Design gate, auth | `inspect.mjs http://localhost:4173/login` | **0 FAIL**, 1 accepted WARN |

### The 84 tests

| Spec | Count | What it proves |
| --- | --- | --- |
| `contrast.spec.ts` | 26 | Every theme, both modes, computed backgrounds meet contrast floors |
| `themes.spec.ts` | 27 | Every theme's shell holds at 1440/1024/390 with no horizontal overflow |
| `auth.spec.ts` | 27 | Every theme can render the auth screen readable in both modes |
| `studio.spec.ts` | 4 | Design Studio lists, searches, applies live, and fits a phone |

Run with `SHOT_EMAIL` and `SHOT_PASS` set; without them 57 pass and 27 skip, which is
the signed-in suite skipping, not failing.

---

## What was built in this pass

### Marketing front door (new)

`src/pages/Marketing.tsx` (19 KB) and `src/pages/marketing.css`. Seven sections:
masthead, product proof, gallery band, the four-step setup, pricing table, five
questions, closing statement, footer. Editorial direction is a printed annual report:
a fixed left axis, section rules, one greyscale photographic treatment across seven
licensed frames.

The product preview on the page is a real rendering of the app's own panel
components, captioned **"Product preview · sample figures"** so no visitor mistakes it
for live data.

### Routing corrected

`/` previously served the dashboard. It now serves the marketing page, `/app` serves
the dashboard behind `RequireAuth`, and a signed-in visitor at `/` is forwarded to
`/app`. `Login.tsx` and the `RequireNoOrg` redirect were updated to match; the four
specs that navigated to `/` now navigate to `/app`.

### Auth screens restyled

`src/pages/auth.css` rewritten onto flat surfaces: the 480px panel uses
`--card-solid`, with no gradients, no resting shadows, and no hairlines. Type scale
raised across 14 rules.

### Type floor

21 declarations below 11px in `src/index.css` were raised to 11px. None remain.

### App shell repairs (earlier commits in this series)

Overview rebuilt around the owner's question, module pages stopped printing their
subtitle twice, the redundant "Records" card removed, Reports excluded from the
add-button guard, and a `workout_plans` key-ordering bug fixed in migration 0006 that
would have aborted the migration.

---

## Accepted warnings, and why

Each of these is a deliberate trade, not an oversight.

| Warning | Where | Defence |
| --- | --- | --- |
| `no-footage` | marketing | Searched Wikimedia Commons, Internet Archive and NASA for gym training footage. The hits were an exhibition in a gym, HVAC construction, and a sign being removed. None showed training. Shipping unrelated footage to satisfy a meter would be a lie about the subject. |
| `off-centre` | marketing | The measured 40px left / 68px right is a probe artifact. Every content row measures 40/40 (verified directly). It comes from one full-bleed element skewing the percentile. |
| `still-page` | marketing | Nine elements move on load and scroll. Every section that should reveal already does; the count is low because reveals fire once and disconnect. |
| `unused-canvas` | auth | The auth card is capped at 480px on purpose. A login form stretched to 1440px is worse, not better. |
| `tiny-text`, `heavy-borders` | `/app` | Both come from the `dispatch` theme's deliberate specification (`index.css:3818`, `:3842`). That theme is intentionally dense and ruled. It is one of 26, and the other 25 do not do this. |

---

## Verified honest behaviour

Screens that have no backend data were checked to make sure they **admit** it:

- "Member app" renders `No member app connected` with an explanation, not a mock
  member dashboard.
- Module pages render an empty table with `No records yet. Use the add button to create
  your first entry.`
- Reports renders a `No data` badge and no add button.
- Workouts, Diet, Equipment, Inventory, Community, Payroll, Marketplace have no tables
  and no fabricated rows. `modules.*.rows` arrays are empty by construction.
- The live database holds 1 member and 0 memberships, payments and attendance, so the
  empty states are what has actually been exercised.

Read-only throughout: the QA pass performed zero-row `select`s and no writes.

---

## Outstanding, and who owns it

### Operator action (cannot be done from code)

1. **Apply `0006_member_crm.sql`** to project `qhxgqyzrzqxwvriugnya`. Verified live:
   `organizations.theme_style` → `42703`, and all 14 tables it creates → `PGRST205`.
   Until then, saving a workspace style succeeds and silently drops the style, and the
   whole-gym theme falls back to `glass` on reload.
2. **Correct `.env.local`**, which claims `(live, migration applied)`. That false
   comment is what hid the gap.
3. **Push when ready.** Three commits sit on `master` ahead of `origin`; pushing
   triggers a Vercel production deploy.

### Known limitations in the code

- `saveOrganizationTheme` (`src/lib/api.ts:161-171`) still carries a retry-without-theme_style
  branch. It is correct defensive code today and should be deleted once 0006 lands.
- Super Admin works but predates the design system.
- No member detail page: the tables exist, the screen does not.
- 11 sections have no backend at all. They are listed in the roadmap with an order.

### The structural gap worth stating plainly

**A gym member cannot sign in.** `public.members` has no `user_id`, and
`organization_members.role` has no `member` value. The member dashboard the brief asks
for cannot be built without inventing data, so it was not built. The migration that
unblocks it is specified in `TWOPLUS_IMPLEMENTATION_ROADMAP.md` under P0.

---

## How to reproduce this report

```bash
npm run build
npm run lint
npx vite preview --port 4173

# design gates, on the production build
node C:/Users/Vidhan/.agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:4173/

# screenshots
node scripts/mkshots.mjs http://localhost:4173 .taste-skill/mk
node scripts/authshots.mjs http://localhost:4173 .taste-skill/auth

# full suite (needs credentials)
$env:SHOT_EMAIL="…"; $env:SHOT_PASS="…"; npx playwright test
```
