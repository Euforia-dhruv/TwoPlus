# TwoPlus.fit: Implementation Roadmap

What is built, what is blocked, and in what order the rest should land.
Last updated at commit `5704080`.

---

## Status at a glance

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Repository audit | Done (`TWOPLUS_DESIGN_AUDIT.md`) |
| 2 | Product and design research | Done (`TWOPLUS_ASSET_RESEARCH.md`) |
| 3 | Asset discovery and licensing | Done (7 licensed photographs, registry in the research doc) |
| 4 | Brand identity and design system | Done (`TWOPLUS_DESIGN_SYSTEM.md`) |
| 5 | Reusable component library | Partly: shared kit exists; no new components extracted |
| 6 | Marketing website | Done |
| 7 | Authentication and onboarding | Done (existing screens restyled; routes corrected) |
| 8 | Super Admin dashboard | Existing surface works; not restyled |
| 9 | Owner dashboard and modules | Overview rebuilt; module pages repaired |
| 10 | Member dashboard | **Blocked on schema**, see below |
| 11 | Motion | Done for marketing and shell |
| 12 | Backend integration verification | Done for what the app queries |
| 13 | Responsive QA and optimisation | Done at 1440/1024/768/390 |

---

## The one thing that blocks the largest amount of work

**A gym member cannot sign in.** This is not a UI gap; the data model has no place to
record it.

- `public.members` (`0001_init.sql`) has `email` and `phone` but **no `user_id`**, so
  no row links a member to an `auth.users` account.
- `public.organization_members.role` is constrained to
  `('owner','manager','trainer','receptionist','finance')`. There is no `member` role,
  and `src/lib/types.ts` `OrgRole` matches that list.
- Every member-facing read path would need an RLS policy scoped to the signed-in
  member's own row; today the only member-visibility rule is
  `"members read" … using (is_org_member(organization_id))`, which grants **all
  members of a gym to staff**, not a member to themselves.

Consequence: the "Member app" screen in the shell is an honest empty state
(`App.tsx:1637`), and no member dashboard, member profile, workout view, diet view,
progress view, or member-facing payment history can be built without inventing data.

### The migration that unblocks stages 10 and half of 8–9

A single migration (`0007_member_accounts.sql`) should:

1. `alter table public.members add column user_id uuid references auth.users(id) on delete set null;`
   plus a unique index on non-null `user_id`.
2. Extend the role check to include `'member'` (`0001_init.sql:35`).
3. Add policies that let a member read **only** their own rows: their `members` row,
   their memberships, payments, attendance, assignments, measurements, progress
   photos, and their gym's announcements.
4. Add an invite flow: staff invite by email, member sets a password, the invite
   stamps `members.user_id`.

Until that lands, the correct thing to ship is the empty state, not a mock dashboard.

---

## Blocked on the operator, not on code

**Migration `0006_member_crm.sql` is still not applied to the live database.**
Verified read-only against PostgREST: `organizations.theme_style` returns `42703`, and
all 14 tables 0006 creates return `PGRST205`. The file is fixed and committed
(`f74619f` corrected a `workout_plans` key ordering bug that would have aborted it).

Impact today: saving a workspace style succeeds but silently drops the style, so the
whole-gym theme reverts to `glass` on reload for everyone except the device that saved
it. Nothing 404s yet, because no shipped screen queries the 14 missing tables.

Operator action: paste `supabase/migrations/0006_member_crm.sql` into the Supabase SQL
editor for project `qhxgqyzrzqxwvriugnya`, or set `SUPABASE_ACCESS_TOKEN` and run
`supabase db push`.

---

## Ordered backlog

### P0: unblock and correct

1. **Apply 0006** to the live database (operator). Then delete the retry-without-style
   branch in `src/lib/api.ts:161-171`; it exists only to survive this gap.
2. **Fix the false comment** in `.env.local` (`(live, migration applied)`), which is
   what caused the gap to be missed.
3. **Member accounts migration** (`0007`, above). This is the gate for every
   member-facing feature in the brief.

### P1: finish the surfaces that already have data

4. ~~**Member detail page.**~~ **Done.** The profile drawer now loads real
   `member_memberships`, `payments` and `attendance` history per member through
   `listMembershipsForMember`, `listPayments({ memberId })` and
   `listMemberAttendance`. Empty states state plainly that nothing has been recorded.
5. ~~**Super Admin restyle.**~~ **Not needed: the premise was wrong.** Measured with
   `inspect.mjs --app` while signed in: it renders `Platform overview` with four real
   sections, zero console errors, no phone overflow, and it already styles itself
   entirely through `var(--)` tokens with no inline colours or pixel values. It reuses
   the shared `directory` / `table-toolbar` / `profile-drawer` classes. Leave it alone.
6. **Exercise library and workout plans UI.** Tables arrive with 0006
   (`workout_plans`, `workout_exercises`, `member_workout_assignments`). Build the UI
   only after 0006 is applied and the policies are exercised.
7. **Diet and measurement UI.** Same dependency. Refuse to demo these against fake
   rows.
8. **Invoices and receipts.** `invoices` exists in 0006 only. Needs 0006 plus a
   rendering decision (PDF vs. print view).

### P2: features with no backend yet

These currently render as empty states and **must not be made to look complete**:

Community, Messaging, Marketplace, Follow-ups, Offers and referrals, Feedback,
Payroll, Equipment, Inventory, Online classes.

Each needs its own tables, policies, and a real write path before UI work starts.
Suggested order: Community and announcements first (member engagement, cheap schema),
then Payroll (owner pain, clear arithmetic), then Marketplace last (external
dependency, no member data needed).

### P3: deliberate non-goals

- **No new icon library.** 33 inline icons already ship; see the design system.
- **No Framer Motion.** GSAP is already a dependency and covers the timelines.
- **No router change.** `react-router-dom` 7 handles the current shell.
- **No 27th theme.** The registry is complete and each theme costs ~150 CSS lines to
  maintain.

---

## Definition of done for this repo

A change is done when all of the following pass, not when it looks right:

1. `npm run build` clean (includes `tsc -b`).
2. `npm run lint` no new warnings (three pre-existing ones are known and accepted).
3. `npx playwright test` 84/84 with `SHOT_EMAIL` and `SHOT_PASS` set.
4. The design gate on the production build, not the dev server:
   `node …/inspect.mjs http://localhost:4173/`.
5. For any new colour: `tests/contrast.spec.ts` passes in all 26 themes, both modes.
6. Screenshots checked at 1440, 1024, 768 and 390 with no horizontal overflow.
7. No invented data on any screen.
