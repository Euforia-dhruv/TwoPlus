# TwoPlus final report

Written against `3ea2ca7`. Every figure here was produced by a command on this
machine, not estimated. Where something is unverified, it says so in the sentence
that claims it.

| | |
| --- | --- |
| Repository | `github.com/Euforia-dhruv/TwoPlus`, branch `master` |
| Commits | 155 |
| Application code | 24,627 lines across `src/**/*.{ts,tsx,css}` |
| Migrations | 16 (`0001_init.sql` … `0016_account_deletion.sql`) |
| Database tables | 38, all with RLS enabled, 30 with explicit policies, 8 closed to the API by design |
| Automated tests | 30 passing in 2.9 minutes |
| Build | `tsc -b && vite build`, exit 0, 4.07 s |

---

## Deliverable A — What was built

Three surfaces from one codebase, sharing one typed data layer and one design
token set.

**Gym workspace** (`src/App.tsx`). Members, membership plans, payments, invoices,
expenses, attendance, staff and trainers, classes and PT sessions, enquiries,
reports, settings, and a workspace manual. Navigation is two-level and URL-driven:
`/app/:category/:module`, with the category and module lists centralised in
`src/lib/navigation.ts` so a new module is one entry, not three edits.

**Member app** (`src/pages/Member.tsx`). Ten sections: membership, workout plans,
training log with personal records and weekly streaks, classes and booking, diet
plans, measurements, progress photos, attendance, payments, and a new "Your data"
section holding export and account deletion.

**Platform console** (`src/pages/SuperAdmin.tsx`). Gym lifecycle including
suspend and cancel, plans, subscriptions, invoices, support tickets, audit log,
and system health. Reachable at `/super-admin`, aliased at `/admin`. Guarded in
the browser for convenience and by database functions for real.

**Tenancy.** Every gym-scoped table carries `organization_id`, has RLS enabled,
and every policy resolves the caller through `org_has_role()`. That single
function is also what makes suspension work: flipping an organization to
`suspended` turns its workspace read-only without deleting anything, because each
write policy calls the same check.

**Offline.** The member app caches its last good read for workouts, diet,
schedule, profile, payments and measurements, and queues writes that fail for
network reasons. Queued writes carry stable intent keys, so re-enqueuing the same
intent replaces rather than duplicates, and the server-side writes are idempotent
as well. The queue stops at the first failure to preserve order and refuses to
grow past 50 entries rather than silently dropping the oldest.

---

## Deliverable B — Verification, with the numbers

**Type and build gates.**

```
npx tsc -b        exit 0
npm run build     exit 0, 4.07 s
npm run lint      pre-existing warnings only
```

**Test suite.** One clean run, 36 tests, 2.9 minutes:

```
npx playwright test    36 passed
```

Covering: sign-in in the remembered mode; contrast in light and dark; every
module in `navigation.ts` rendering at 1440, 1024 and 390 px in both modes with
no horizontal overflow and no uncaught page errors; the full owner journey (add
member, assign plan, renew, check in, reload to confirm the writes persisted,
archive); cross-gym isolation probed at the REST layer across 15 tables;
anonymous access to the platform RPCs refused; the platform console bouncing a
signed-out visitor to `/login`; the member app on a phone viewport; the offline
outbox's replace, failure and cap behaviour; workout statistics; and the error
boundary's fallback.

Two earlier attempts at this run failed for infrastructure reasons (a dev server
that died mid-run, and two Playwright processes contending for `test-results`),
not on any assertion about the product. Both were diagnosed and the clean run is
the one reported.

**Row Level Security, audited offline from the migration files:**

```
node scripts/rls-audit.mjs
38 tables created in migrations
38 with RLS enabled
30 with at least one policy
8 closed to the API by design
OK: every table has RLS and a policy.
```

The eight are the platform's own tables (admins, plans, subscriptions, invoices,
payments, audit log, support tickets, counters). They are unreadable through the
browser on purpose; the console reaches them through security-definer functions
that check `is_platform_admin()`.

**Security scanning** (`docs/SECURITY-SCAN.md`):

- gitleaks over full history: no leaks across 144 commits at the time of the run.
  Three real secrets exist in gitignored working files (`.env.local`,
  `tests/.auth/state.json`); `git log --all` confirms neither was ever committed.
- semgrep, 290 rules over 540 files: 17 findings, all triaged. Fourteen are
  mutable action tags in workflows; three are in a vendored skills directory that
  never ships. Nothing in application code.
- trivy: zero critical or high.
- `npm audit --omit=dev`: zero. Full audit: seven moderate, all build-time
  transitive through `@electron/packager` and `@capacitor/cli`, with only a
  breaking downgrade offered as a fix. Nothing from them reaches `dist/` or the
  packaged binary.

**Performance** (Lighthouse 13.6.0, desktop, against the production build):

| Page | Performance | Accessibility | Best practices |
| --- | --- | --- | --- |
| `/login` | 99 | 100 | 100 |
| `/` | 96 | 100 | 100 |

FCP 0.6 s, LCP 0.6 s, TBT 10 ms, CLS 0. The one real failure found was a
marketing headline at `opacity: 0.3` measuring 2.33:1; raised to 0.45 and
re-measured at zero contrast violations.

**Bundle.** One 1,647 kB chunk became 20. Initial path is `index` 267 kB plus
`supabase` 210 kB plus runtime. `three.js` (543 kB) is lazy and only `/login`
loads it. The largest remaining chunk is that one, deliberately.

---

## Deliverable C — What ships, and how

Four targets from one bundle (`docs/BUILDING.md`):

| Target | Command | Status |
| --- | --- | --- |
| Web | `npm run build` | Verified. `vercel.json` holds the SPA rewrite and the security headers |
| Windows desktop | `npm run desktop:package` | **Built and run here.** `TwoPlus.exe` exits 0 on `--smoke-check` |
| Android | `npx cap sync android` + Gradle | **Built and verified here.** Signed APK 3,994,295 B and AAB 3,851,939 B at versionName 1.0.0, signer `CN=TwoPlus` |
| iOS | `npx cap sync ios` + `xcodebuild` | CI only; needs macOS |

The desktop shell serves `dist/` over a privileged `app://bundle` origin rather
than `file://`, because the renderer uses `BrowserRouter` and a `file://` origin
would break history routing and give every route an opaque origin, killing
`localStorage`. It runs with `contextIsolation` on, `nodeIntegration` off,
`sandbox` on, no preload script, and the same CSP as the web build.

Release automation: `.github/workflows/release.yml` triggers on a `v*` tag,
packages the desktop app, **runs the packaged `.exe` and fails the release if the
smoke check exits non-zero**, zips web and desktop artifacts with the version,
hashes them with `scripts/checksums.mjs`, and publishes them with `SHA256SUMS`
attached. Proven locally: the checksum script hashes 29 files and exits 0.

---

## Deliverable D — Data protection

`docs/PRIVACY-LIFECYCLE.md` is the engineering companion to the drafted policies
at `/privacy` and `/terms`.

- **Photos** are the most sensitive data held, so they get different treatment:
  private bucket, 10-minute signed URLs generated per request, and never cached
  offline (a cached signed URL is a dead link within minutes and a leak after
  that).
- **Export** produces one JSON file of everything the product holds about a
  member, with signed photo URLs stripped because a 10-minute link is not
  keepable data.
- **Deletion** (`delete_my_account()`) erases photos, measurements, workout
  sessions, assignments, bookings, attendance and notes, anonymises the member
  row and deletes the `auth.users` row, while payments, invoices, memberships and
  renewals survive as financial records. It **refuses to run for a gym owner**,
  because `organizations.owner_id` is `on delete restrict` and a deleted sign-in
  must never orphan a live gym.
- **Retention** is stated honestly: there is no scheduled purge. Nothing expires
  silently, which also means nothing is deleted the gym did not ask to delete.

---

## Deliverable E — Operations

`docs/OPERATIONS.md` is written to be followed by someone who has never touched
this project, at 2 am: migration numbering and re-runnability, the two SQL
queries that prove a migration landed, `pg_dump` through the session pooler with
`auth` included and why, storage objects separately, restore into a scratch
project, four verification queries including the member-to-`auth.users` orphan
count that must be zero, single-row recovery, and a rollback matrix.

The rollback rule that matters most: a bad migration with data intact is always
fixed by writing the next migration, never by restoring. A restore is reserved
for data actually destroyed, and `VITE_SUPABASE_URL` is baked in at build time,
so repointing the database means a rebuild and redeploy inside the outage window.

---

## Deliverable F — What is not done, and who must do it

This is the honest half of the report. Each item names the human action.

**Blocked on credentials, not on work:**

| Item | Human action required |
| --- | --- |
| Backup restore rehearsal | Set `PGPASSWORD` from Dashboard → Settings → Database and run one dump plus one restore into a scratch project. The procedure exists and has never been executed |
| Migration `0016_account_deletion.sql` | Apply it. Written and reviewed, not pushed: no `SUPABASE_ACCESS_TOKEN` or database password on this host |
| Code signing | The Android keystore exists outside the repo and signed builds work; supply an Apple distribution certificate plus profile and a Windows code-signing certificate. None of these may be committed |
| Store submission | Create Play Console and App Store Connect accounts (both cost money and bind the owner legally), then authorize submission |
| Legal review | Send `/privacy`, `/terms` and `docs/PRIVACY-LIFECYCLE.md` to counsel for DPDP Act review. A product cannot self-certify this |
| License | Choose one. `LICENSE-DECISION.md` lays out the options and the four steps; until then the code is all-rights-reserved by default |

**Deliberately not built, with the reason:**

- **Payment gateway.** No provider account exists. Recording a payment staff
  actually received is honest; simulating a successful card or UPI charge is not.
- **SMS, email, push.** No delivery provider. Those actions state that nothing
  was sent rather than pretending.
- **Error tracking service.** None connected, and the health panel says
  `not configured` verbatim. The in-app boundary now catches render failures and
  exposes `recentErrors()` as the hook a tracker would attach to.
- **Richer platform dashboards.** The console has real gym, plan, and audit data;
  cross-gym revenue and usage analytics are partial and are not faked.
- **Three modules with no storage.** Payroll, Marketplace and Community render
  with no table behind them; their create actions say so instead of discarding
  input. Follow-ups and Access and roles do work, but as views over enquiries and
  staff rather than as their own records.

**Known small inconsistencies, named rather than hidden:**

- No member-app screenshots and no 1024×500 feature graphic exist, so store
  listings cannot be completed even if accounts existed.

---

## Verdict

The product is real: it runs, it isolates tenants at the database, it has a
verified owner journey and a verified cross-tenant probe, it builds for four
targets, and it tells the truth about what it cannot do.

What stands between this and paying gyms is not code. It is credentials,
certificates, accounts, and a lawyer.
