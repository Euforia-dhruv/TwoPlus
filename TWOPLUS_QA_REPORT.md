# TwoPlus.fit: QA Report

Measured at commit `a80f032`, on the production build (`npm run build` → `vite preview`
on port 4173), not the dev server.

---

## Gate results

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck + build | `npm run build` | Pass |
| Lint | `npm run lint` | Pass, 4 pre-existing warnings |
| Automated tests | `npx playwright test` | **Not run**: `SHOT_EMAIL` / `SHOT_PASS` are not set |
| Database | read-only PostgREST probes | Every table the app queries answers `200` |

The four lint warnings are `react(only-export-components)` in `src/lib/auth.tsx` and
`src/lib/org.tsx`, and `react(set-state-in-effect)` in `src/lib/org.tsx` and
`src/pages/Member.tsx`. All predate the current work.

The Playwright suite skips every signed-in spec without credentials, so the "84/84"
figure from the earlier report cannot be reproduced today. To restore it, set
`SHOT_EMAIL` and `SHOT_PASS` in `.env.local`.

---

## Database state

Migrations `0001`–`0009` are applied to project `qhxgqyzrzqxwvriugnya`. Confirmed
read-only: `organizations.theme_style`, `members.user_id`, `claim_member_account`,
`branches` and `class_bookings` all return `200`. No screen queries a missing table, and
the workspace theme now persists server-side instead of falling back to `glass`.

---

## Verified honest behaviour

Screens with no backend data **admit** it:

- Module pages render an empty table with `No records yet. Use the add button to create
  your first entry.`
- Reports renders a `No data` badge and no add button.
- Community, Messaging, Marketplace, Offers and referrals, Feedback, Payroll, Equipment,
  Inventory and Online classes have no tables and no fabricated rows.
- "Send reminder" states plainly that no delivery provider is connected and saves
  nothing.
- The member app shows only the signed-in member's own rows.

`modules.*.rows` arrays are empty by construction, so a module can only show rows a
query returned.

---

## Known limitations in the code

- **Class attendance is not recorded.** Staff can book a member into a class and see
  the attendee list, but nothing sets `class_bookings.status = 'attended'` yet. Booking
  counts stop at 1000 rows per org (see the `shortcut:` comment in
  `listClassBookings`), and the capacity check runs in the browser, so two simultaneous
  bookings can both pass.
- **Branches are listed, not switched.** Rows, an add form and a primary flag are live;
  branch-scoped filtering and revenue rollups are not.
- **Invoices render as rows.** No print view or PDF.
- **The member profile is a drawer**, not a routed detail page.
- **Eleven sections have no backend at all.** They are listed in the roadmap with an
  order.

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
