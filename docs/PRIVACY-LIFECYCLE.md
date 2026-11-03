# Data lifecycle

What is stored, what is erased, what is kept, and for how long. This describes
what the code and the database actually do, not what a policy might like to
claim. Where the two differ, the code wins and this file is wrong.

## Where data lives

| Store | Holds | Access |
| --- | --- | --- |
| Supabase Postgres | Gym records: members, memberships, payments, invoices, attendance, classes, bookings, workouts, diets, measurements, notes, staff, expenses | Row Level Security, scoped by `organization_id` |
| Supabase Auth | Email, password hash, session | The account itself |
| Storage bucket `member-progress` | Progress photos | Private; the member and their gym's staff |
| Browser `localStorage` | Member app cache (`twoplus-cache:v1:*`) and the offline outbox (`twoplus-outbox:v1`) | That device only |

Nothing else is collected. There is no analytics SDK, no advertising identifier,
no crash reporter and no third-party script in the bundle. `docs/STORE-READINESS.md`
records that answer for the app stores.

## Photos

Progress photos are the most sensitive thing the product holds, so they are
handled differently from the rest:

- The bucket is private. There is no public URL.
- Reads go through short-lived signed URLs, valid for **10 minutes**, generated
  per request.
- The member app deletes a photo and its storage object together, and RLS lets a
  member delete only their own.
- Photos are **never cached offline**. A cached signed URL would be a dead link
  within minutes and a leaked one after that; the cache stores everything else
  about a member and deliberately skips these.

## A member deleting their account

Implemented in `supabase/migrations/0016_account_deletion.sql` as
`delete_my_account()`, called from the member app's "Your data" section. It is a
`security definer` function, granted to `authenticated` only, and it refuses to
run without a session.

**Refused for gym owners.** The organization references its owner with
`on delete restrict`. An owner who deletes their sign-in would orphan a live gym,
so the function raises instead, and the UI shows that message. Closing a gym is a
deliberate, separate act (suspend or cancel the organization from the platform
console); it is never a side effect of one person leaving.

For everyone else, in one transaction:

| Erased | Kept |
| --- | --- |
| Storage objects under the member's folder | Payments and invoices (financial records) |
| Progress photos | Membership history |
| Body measurements | Renewal history |
| Workout sessions and their sets | The membership's plan name and price |
| Workout and diet assignments | |
| Class bookings | |
| Attendance rows | |
| Internal notes about the member | |
| Name, email, phone, date of birth, gender, address, emergency contacts, free-text notes, photo URL | |
| The `auth.users` row and every session | |

The member row itself is kept in anonymised form (`first_name = 'Deleted'`,
`status = 'archived'`, every identifying field null, `user_id` cleared) because
payments point at it. That row is a ledger anchor, not a person: it no longer
carries anything that identifies anyone.

The asymmetry is the point. A gym has a lawful reason to keep its books. It has
no reason to keep a former member's body photos.

## Retention

| Data | Kept until |
| --- | --- |
| Active gym records | The gym removes them, or the workspace is deleted |
| Anonymised member rows | As long as the payment they anchor is retained |
| Payments, invoices | As long as the gym's own accounting obligation requires; the gym decides, the product does not expire them |
| Archived members | Indefinitely, until the gym deletes them, because archiving is not deleting |
| Progress photos | Until the member deletes them or deletes their account |
| Offline cache | Until the next successful read, sign-out, or account deletion |
| Server logs | The Supabase project's log retention (provider setting) |

There is no automatic purge job. Nothing expires silently, which also means
nothing is deleted that the gym has not asked to delete. If a jurisdiction
requires a fixed retention window, that is a policy decision and needs a
scheduled job this repo does not have.

## Export

The member app's "Download my data" produces one JSON file containing the
member's profile, memberships, payments, attendance, workouts, assigned workout
and diet plans, measurements and progress-photo metadata. Signed photo URLs are
stripped before the file is written, because a URL that expires in ten minutes
is not data the member can keep. The photos themselves are downloadable
individually while signed in.

Export is capped at 100,000 rows per table. That is above any plausible single
member's history, and the cap exists so a runaway query cannot exhaust the
browser.

Gym staff export a module as CSV from the workspace (`twoplus-<module>.csv`),
which covers the gym's own copy of the same records.

## What this does not do

- **No scheduled deletion.** Archived members and old attendance stay until
  someone removes them.
- **No automated subject-access handling.** The two self-service paths above
  cover a member; a request that arrives by email is handled by a person.
- **No backup redaction.** Deleting an account does not reach into an existing
  database backup. That is inherent: a backup is a picture of the past.
- **Not legal advice.** Whether the retention above satisfies the DPDP Act, GDPR
  or any other regime is for counsel. `MISSION.md` records that item as blocked
  for exactly this reason.
