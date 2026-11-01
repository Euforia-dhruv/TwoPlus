# Building board

The single place a session writes down what it is building, so two sessions never
build the same thing twice. Read this before starting work; update it before you finish.

Rules:

- **Claim before you build.** Add your row to "In flight" with the files you expect to
  touch. If someone else already claimed it, pick something else.
- **One module, one owner.** `src/App.tsx` is a single 4200-line component. Two sessions
  editing its modal chains at once produce conflicts that cost more than the feature.
- **Move your row to "Landed" when it is committed**, with the commit hash.
- **Gates before you claim a row landed:** `npx tsc -b`, `npm run build`, `npm run lint`
  with no new warnings.

---

## In flight

| Owner | Work | Files | Started |
| --- | --- | --- | --- |
| _(nobody)_ | | | |

---

## Ready to pick up

Ordered. Each is self-contained and has a real table or a real product decision behind
it. Details in `TWOPLUS_IMPLEMENTATION_ROADMAP.md`.

1. **Class attendance status.** Mark a booked member `attended` from the class details
   modal. `class_bookings.status` already allows it. Decide whether it also writes an
   `attendance` row.
2. **Membership renewals view.** `membership_renewals` exists and is unused. An owner
   wants to see what was renewed, when, and at what price.
3. **Member internal notes.** `member_internal_notes` exists and is unused. Staff-only
   notes on the member drawer.
4. **Progress photos.** `member_progress_photos` exists, and `workspace-media` is the
   only storage bucket (0008). Needs a bucket for member photos plus RLS on
   `storage.objects` before upload can be wired.
5. **Notifications inbox.** `notifications` has an INSERT policy from 0004 and rows
   exist, but the bell only shows a count.
6. **Branch switching.** Branches list, but nothing filters by branch.
7. **Invoice print view.** Product decision needed first: print CSS or a PDF library.
8. **Payroll.** No table. Needs a migration before any UI.

---

## Landed

| Commit | Work |
| --- | --- |
| `0c88374` | Real class booking counts; Branches connected to its table |
| `48e89b3` | Book a member into a class; attendee list in class details |
| `3bdde4b` | Capacity guard on booking |
| `e7f0d4d` | Bookings not attached to the wrong session when names repeat |

---

## Do not touch

- **`.env.local`** is live-project config. Editing the comments there is fine; never
  edit the keys.
- **Migrations `0001`–`0009`** are applied to the live database. Adding a new migration
  is fine; editing an applied one silently desynchronises the repo from production.
- **The 26-theme registry** in `src/lib/theme.tsx`. Each theme costs ~150 CSS lines.
- **Empty states.** Community, Messaging, Marketplace, Offers and referrals, Feedback,
  Payroll, Equipment, Inventory and Online classes have no tables. They must keep
  saying so. Do not populate `modules.*.rows` with sample data.
