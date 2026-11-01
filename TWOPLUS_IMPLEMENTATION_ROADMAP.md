# TwoPlus.fit: Implementation Roadmap

What is built, what is blocked, and in what order the rest should land.
Last updated at commit `a80f032`.

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
| 8 | Super Admin dashboard | Done; needs no restyle (see P1 below) |
| 9 | Owner dashboard and modules | Overview, and every module with a table, is live |
| 10 | Member dashboard | Done (`/member`: plan, payments, attendance, claim flow) |
| 11 | Motion | Done for marketing and shell |
| 12 | Backend integration verification | Done; every table the app queries exists in the live DB |
| 13 | Responsive QA and optimisation | Done at 1440/1024/768/390 |

---

## Database state

**Migrations `0001` through `0009` are applied to the live project
`qhxgqyzrzqxwvriugnya`.** Verified read-only against PostgREST: every table the app
queries returns `200`, `organizations.theme_style` exists, `members.user_id` exists,
and `claim_member_account` is live.

This closes both former blockers: member sign-in (0007) and the member CRM tables
(0006). The old "apply 0006 by hand" step and the theme-dropping retry branch in
`saveOrganizationTheme` are both gone.

---

## Built and connected to the database

- **Directory**: members, memberships and plans, attendance with check-out, enquiries
  and follow-ups, payments, invoices (raise, void, settle against payments), expenses,
  trainers and staff, branches.
- **Training**: workout plans with exercises, diet plans with meals and items,
  measurements with per-member history, plan assignment to members, plan contents in
  the details modal.
- **Member app** (`/member`): self-service dashboard over the member's own membership,
  payments and attendance, with an account claim flow.
- **Classes**: real booking counts per class, read from `class_bookings`.

---

## Ordered backlog

### P0

Nothing. Both database blockers are cleared.

### P1: finish the surfaces that already have data

1. **Class bookings UI.** Counts are shown, but nobody can book a member into a class
   from the app yet. `class_bookings` already has the policies
   (`owner/manager/receptionist/trainer` may write). Needs a "Book member" modal and a
   per-class attendee list.
2. **Invoices to receipts.** The invoice renders as a table row. A print view or PDF is
   still a product decision, not a code gap.
3. **Branches**: rows, add form, and the primary/branch flag are live. There is no
   branch switcher, no per-branch member or revenue rollup, and no archive action.

### P2: features with no backend yet

These render as empty states and **must not be made to look complete**:

Community, Messaging, Marketplace, Offers and referrals, Feedback, Payroll, Equipment,
Inventory, Online classes, Reminders delivery (no provider connected).

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
2. `npm run lint` no new warnings (four pre-existing ones are known and accepted).
3. `npx playwright test` 84/84 with `SHOT_EMAIL` and `SHOT_PASS` set. These are absent
   from `.env.local`, so the suite currently skips every spec.
4. The design gate on the production build, not the dev server:
   `node …/inspect.mjs http://localhost:4173/`.
5. For any new colour: `tests/contrast.spec.ts` passes in all 26 themes, both modes.
6. Screenshots checked at 1440, 1024, 768 and 390 with no horizontal overflow.
7. No invented data on any screen.
