# TwoPlus.fit: Design Audit

Audited against the repository at `D:\TwoPlus\TwoPlus-repo`, commit `3f66dc7`.
Everything below was verified by reading the code or querying the live database.
Nothing here is inferred from the brief.

---

## 1. What actually exists

### Stack

| Layer | Reality |
| --- | --- |
| Build | Vite 8.3, TypeScript 6.0, oxlint |
| UI | React 19.3, hand-written CSS, no component library |
| Routing | react-router-dom 7.18, 8 routes |
| Data | @supabase/supabase-js 2.118, direct table access from the client |
| Motion | GSAP 3.15 (one entrance timeline) |
| Icons | Hand-rolled SVG set, `src/icons.tsx`, 33 names |
| Fonts | 8 families from Google Fonts, declared in `index.html` |
| Tests | Playwright, 84 tests, 4 specs |

Runtime dependencies are five. That is a strength and the redesign must
preserve it. Every visual idea has to be achievable with React, CSS and the
existing five packages.

### Routes present

```
/login  /signup  /forgot-password  /reset-password
/super-admin  (/admin redirects here)
/onboarding
/            the dashboard itself
*            redirects to /
```

### Surfaces present

- **Platform admin**: `src/pages/SuperAdmin.tsx`, 70KB, its own chrome.
- **Owner/manager workspace**: `src/App.tsx`, 3237 lines, one component file
  containing the shell, the rail, the topbar and every page.
- **Auth**: five pages sharing `AuthLayout.tsx` (split screen, brand panel left).
- **Design Studio**: `src/pages/Studio.tsx`, an in-app gallery that previews
  every theme with real components.

### Data that is genuinely wired

Twelve tables are read and written through `src/lib/api.ts`:
`members`, `organizations`, `organization_members`, `membership_plans`,
`member_memberships`, `payments`, `attendance`, `enquiries`, `staff`,
`classes`, `expenses`, `notifications`.

Plus `src/lib/admin-api.ts` for the platform tables:
`platform_admins`, `platform_plans`, `org_subscriptions`,
`subscription_invoices`, `subscription_payments`, `admin_audit_log`,
`support_tickets`.

---

## 2. The finding that changes the plan

**There is no marketing website, and there is no member experience.**

Three consequences, each verified:

**2.1 No marketing site at all.** `/` renders the authenticated dashboard.
A signed-out visitor who opens the root URL is redirected to `/login`. There is
no hero, no pricing page, no product story, no public route of any kind. The
brand currently has no front door.

**2.2 No member dashboard, and the schema cannot support one yet.**
`public.members` has no `user_id` column, and no column anywhere links a member
row to an `auth.users` row. The role system is organization-scoped only:

```
OrgRole = owner | manager | trainer | receptionist | finance
```

Every RLS policy resolves through `org_role(org)`, which reads
`organization_members`. A gym member is a billing record, not a user. So a
member-portal login is not a UI task; it needs a schema change (a member to
auth link, plus RLS that scopes rows to that member), and then a UI.

**2.3 Thirteen of the eighteen module pages have no backend.**
`modules` in `App.tsx:144` holds 18 entries. Each has a `columns` array and an
`rows: []` that is empty for all 18. Real queries exist for six of them.
The following render a generic empty directory and nothing else:

`Workouts`, `Diet & nutrition`, `Equipment`, `Inventory`, `Follow-ups`,
`Offers & referrals`, `Feedback`, `Branches`, `Payroll`, `Community`,
`Marketplace`, `Member app`, `Customer support`.

To be fair to the current build, they do not fabricate data. The empty state is
honest. But they are also not features; they are placeholders wearing a
feature's name, which the brief explicitly forbids leaving in place.

---

## 3. What is incomplete or broken

### 3.1 Migration 0006 has never been applied to the live database

Verified by zero-row PostgREST probes against project `qhxgqyzrzqxwvriugnya`:

- `organizations.theme_style` returns `42703`, column does not exist.
- All 14 tables 0006 creates return `PGRST205`, relation not found:
  `org_member_counters`, `invoices`, `membership_renewals`,
  `member_internal_notes`, `workout_plans`, `workout_exercises`,
  `member_workout_assignments`, `diet_plans`, `diet_meals`,
  `diet_meal_items`, `member_diet_assignments`, `fitness_measurements`,
  `member_progress_photos`, `activity_log`.

User-visible effect: an owner picks a workspace style, clicks Save, sees
"Workspace appearance saved", and the style is silently discarded.
`saveOrganizationTheme` retries without `theme_style` on error, so preset, mode
and image do persist. On reload `themeFromOrg` falls back to `glass`. Only the
device that saved it keeps the style, from `localStorage`.

The comment in `.env.local` claims `(live, migration applied)`. That claim is
false and it is what misled earlier work.

The 0006 file is now correct on disk (commit `f74619f` fixes a `42830`
constraint-ordering error). It still has to be run in the Supabase SQL editor.
The CLI cannot authenticate here; there is no access token.

### 3.2 The live dataset is nearly empty

1 member, 0 memberships, 0 payments, 0 attendance rows.
`platform_plans` and `org_subscriptions` both return `[]`.

Every screen has therefore only ever been verified in its empty state. Layout
under load, table pagination at volume, and chart shape with real series are all
unproven. This is a fact to design around, not to paper over: a dashboard that
looks alive only because of sample rows is the failure mode the brief names.

### 3.3 Structural debt

- **`App.tsx` is 3237 lines.** Shell, navigation, 20-odd page bodies, modals and
  the theme controller live in one file, with no route boundary between pages.
  Any change to one page recompiles and re-tests all of them.
- **`components/ui` exists and is empty.** Primitives live in `kit.tsx`
  (Button, Input, Select, Title, Badge, Avatar, Stats). That is 7 of the ~30
  components the brief calls for. There is no Table, Modal, Toast, Tooltip,
  Tabs, Pagination, Skeleton, EmptyState, Calendar, DatePicker, Dropdown or
  SearchField as a reusable unit.
- **Navigation is state, not routes.** Pages are selected by `useState`, so
  every screen shares one URL. Nothing is linkable, the back button does not
  work, and no page can be opened directly.
- **Two competing style systems.** `index.css` (115KB) holds ~150 per-theme
  blocks; `lib/styles.ts` (35KB) holds token records for the languages that are
  more than CSS. Both are live. A new component must be checked against 26
  visual languages.
- **`descriptions` covers 11 of ~24 pages**, so the rest fall back to the same
  generic subtitle.

---

## 4. What should be preserved

These are good and were expensive to get right. Do not rewrite them.

1. **The token system in `index.css` §2.** Dark defaults, `html[data-mode]`
   overrides, `html[data-theme]` accent presets. It is coherent and already
   centralised. The brief asks for centralised tokens; they exist.
2. **The 26-theme engine.** `data-style` on `<html>`, driven by
   `lib/styles.ts` records. A component that uses tokens is themed for free.
   This is the project's one genuinely original asset.
3. **The RLS model.** 46 policies, org-scoped through security-definer
   functions. Tenant isolation is real and enforced in the database, not the
   client.
4. **The honest empty states.** The app tells a user when a table needs a
   migration instead of pretending it saved.
5. **The Playwright suite.** 84 tests, including a contrast spec that reads
   computed colours and a themes spec that checks rail geometry and overflow at
   three widths in both modes. This is the safety net for any redesign and it
   is better than most production codebases have.
6. **The Design Studio.** An in-app gallery rendering every language with real
   components. It is the tool that keeps 26 themes honest.

---

## 5. Visual assessment

Judged on the screens I captured at 1440, 1024, 390 and the auth pages.

**Strong:** the workspace shell reads as one system. Type scale is disciplined,
figures are tabular, the rail is calm, and the colour story (teal accent on
near-black) is distinctive without being loud. It does not look like a
template.

**Weak:** the product has no public face, so there is nothing to judge as
marketing design. Inside the app, 13 pages are identical empty directories,
which makes the product feel thinner than the six real ones suggest. Tables and
modals are styled but not extracted, so consistency is maintained by hand.

---

## 6. Architectural direction

Ordered by value per unit of risk. Nothing here contradicts the brief.

| # | Move | Why |
| --- | --- | --- |
| 1 | Add a public marketing route; move the app to `/app` | The largest gap and the only one that needs no schema change |
| 2 | Extract the ~30 primitives into `components/ui` | The brief's Phase 5; also stops hand-maintained table markup |
| 3 | Give pages real URLs | Makes screens linkable, enables direct-load testing |
| 4 | Build the member portal on a new member-auth link | Phase 6's member dashboard; needs a migration |
| 5 | Give module pages real schemas or remove them | Phase 8's honesty rule |

Item 1 is unblocked and delivers the most visible result, so it goes first.
Item 4 is blocked on a schema decision that is the owner's to make, not mine.
