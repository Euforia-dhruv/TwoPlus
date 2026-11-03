# TwoPlus

Gym management software for one gym or many. A single codebase serves three
surfaces: the gym workspace that owners and staff work in every day, the member
app that members open on their phones, and the platform console that operators
use to manage paying gyms.

Multi-tenancy is enforced by Postgres Row Level Security, not by the UI. Every
table that holds gym data carries an `organization_id`, and every policy checks
the caller's membership in that organization. A gym that is suspended becomes
read-only rather than losing its data.

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase (Auth, PostgreSQL, Row Level Security, Storage)
- **Surfaces:** browser app, Android and iOS shells (Capacitor), Windows desktop
  (Electron)

## Quick start

```bash
npm ci
cp .env.example .env.local   # then fill in your Supabase project values
npm run dev                  # http://localhost:5173
```

You need a Supabase project with the migrations applied (see
[Database](#database)) and at least one confirmed Auth account.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local`, CI secret | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, CI secret | Publishable key. Safe in a browser: RLS protects the data |
| `SHOT_EMAIL`, `SHOT_PASS` | local env, CI secret | The account the Playwright suite signs in as |

The service-role key never belongs in frontend code, in `.env.example`, or in
git. If it leaks, rotate it in the Supabase dashboard: an RLS policy cannot stop
a key that bypasses RLS entirely.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | `tsc -b` then `vite build` into `dist/` |
| `npm run check` | Build plus lint. The gate to run before pushing |
| `npm run lint` | Oxlint |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Playwright suite (needs the env vars above) |
| `npm run test:gate` | `check` then `test` |
| `npm run desktop` | Build, then run the Electron shell |
| `npm run desktop:smoke` | Build, then verify the shell mounts a deep link |
| `npm run desktop:package` | Build a Windows binary into `release/` |

Node 22 is what CI uses. There is no `engines` pin, so an older Node may work
but is untested.

## Database

Schema lives in `supabase/migrations/`, applied in filename order from
`0001_init.sql` to `0015_member_measurements.sql`. Never edit a migration that
has already run against a live project: add a new one, because existing
installations will not re-run it.

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the files into the dashboard SQL editor, in order, once.

What the migrations cover beyond the obvious CRUD tables:

- **0002** platform admin: a separate role for the console, organization
  lifecycle controls, plans, subscriptions, invoices, support tickets, audit
  log. Cross-gym access is not exposed as table reads; it goes through
  database-guarded RPCs.
- **0007, 0011** member accounts, including a hardening pass on how a signed-in
  user is claimed as a member of a gym.
- **0012–0015** workout logging, class booking, progress photos, and body
  measurements.

To make the first operator an administrator, run this in the SQL editor after
that account exists and is confirmed:

```sql
select public.promote_to_platform_admin('admin@example.com', 'super_admin');
```

The function refuses calls that arrive through the browser. The
`/super-admin` route checks the same database role, so editing the URL or
calling the admin RPCs directly both fail with `403`.

### Authorization tests

`supabase/tests/platform_admin_auth.sql` covers the gym-versus-platform
boundary: denied admin RPCs, cross-tenant isolation, suspension behaviour, and
the billing state machine. It runs inside a transaction and rolls back, so it
leaves nothing behind.

```bash
psql "$DATABASE_URL" -f supabase/tests/platform_admin_auth.sql
```

`scripts/rls-audit.mjs` is the offline counterpart: it parses the migrations and
prints how many tables exist, how many have RLS, how many have a policy, and
which are closed to the API on purpose. It needs no database connection.

```bash
node scripts/rls-audit.mjs
```

## Architecture

```
src/
  router.tsx         routes, auth/org guards, one Suspense boundary
  App.tsx            gym workspace (staff-facing)
  pages/Member.tsx   member app
  pages/SuperAdmin.tsx  platform console
  pages/Marketing.tsx   public landing page
  lib/api.ts         all workspace data access, organization-scoped
  lib/member-api.ts  member-scoped reads and writes
  lib/admin-api.ts   platform RPCs
  lib/auth.tsx       session context
  lib/org.tsx        organization + role context
  lib/sync-queue.ts  offline outbox (pure, storage injected)
  offline-cache.ts   last-good reads for offline
  member-sync.ts     ties the two to the member app
  navigation.ts      the two-level nav that drives both URL and rails
```

Routes are lazy: each surface is its own chunk, so a member on a phone is not
downloaded the platform console and the whole staff workspace before a workout
appears. `DocPages` stays eager because the 404 is reachable from anywhere and
is small.

Workspace URLs are `/app/:category/:module`, driven by
`src/lib/navigation.ts`. Adding a module means adding it to that file; the side
dock, the top dock, and the route all follow.

### Offline

The member app caches its last successful read for workouts, diet, schedule,
profile, payments and measurements, then serves that copy with a visible
"stale" notice when a fetch fails. Writes that fail for network reasons are
queued in `localStorage` and replayed on reconnect.

Queued writes carry a stable intent key (`workout:<member>:<date>`,
`class-book:<member>:<class>:<date>`), so re-enqueueing the same intent replaces
the pending op instead of stacking a duplicate. The server-side writes are
idempotent too, so a replay after a flaky connection cannot double-book a class.
The queue refuses to grow past 50 entries rather than silently dropping the
oldest, and it stops at the first failure to keep writes in order.

Progress photo URLs are deliberately not cached: they are signed and expire.

## Testing

```bash
SHOT_EMAIL=... SHOT_PASS=... npm run test
```

One setup project signs in and saves a storage state; every other spec reuses
it. `AUDIT_URL` points the suite at another origin (a preview or a deployed
build) instead of `http://localhost:5173`.

What the suite actually asserts:

- **Auth and contrast:** the login screen paints in the remembered mode, and
  text meets contrast in both light and dark.
- **Navigation:** every module in `navigation.ts` renders its own heading at
  1440, 1024 and 390 px in both modes, with no horizontal overflow and no
  uncaught page errors.
- **Owner journey:** add a member, assign a plan, renew it, check them in,
  reload to confirm the writes landed, then archive the member it created.
- **Security journey:** 15 tenant tables are queried with the signed-in token
  against a foreign `organization_id` and must return nothing; anonymous RPC
  calls to the platform-admin functions must be denied.
- **Member app:** renders without uncaught errors and fits a phone.
- **Outbox:** unit tests for the queue's replace, failure and cap behaviour.
- **Workout stats:** personal records and streak counting.

The suite needs a real Supabase project and a real account. CI skips the
end-to-end job when those secrets are absent, because otherwise it would fail on
a missing account rather than on a missing feature.

## Building and shipping

`docs/BUILDING.md` covers all four targets in full. In short:

- **Web:** `npm run build` produces `dist/`. `vercel.json` holds the SPA rewrite
  and the security headers (CSP, HSTS, nosniff, frame denial, referrer policy,
  permission policy).
- **Android:** `npm run build && npx cap sync android`, then Gradle. Needs JDK 21
  and the Android SDK. CI builds an unsigned debug APK.
- **iOS:** `npx cap sync ios`, then `xcodebuild`. Needs macOS and Xcode, so CI
  does it on `macos-latest`.
- **Windows:** `npm run desktop:package` produces `release/TwoPlus-win32-x64/`.
  The shell serves `dist/` over a privileged `app://bundle` origin, because a
  `file://` origin would break `BrowserRouter` and `localStorage`.

Both `android/` and `ios/` are Capacitor wrappers around the same bundle. There
is no second implementation to keep in sync, and `capacitor.config.ts`
deliberately has no `server.url`: a committed dev-server URL would make a
release build load code from a laptop.

Code signing (Android keystore, Apple certificate, Windows certificate), store
submissions, and a Windows installer are not wired. Each needs credentials the
owner holds.

## Security

- **Isolation** is enforced in the database. The browser never gets a
  cross-gym read path; the platform console uses RPCs that check the role
  server-side.
- **Suspension** flips a gym to read-only through `org_has_role()`, which every
  org-scoped write policy calls. Nothing is deleted.
- **Secrets** are scanned with gitleaks over full history in CI. Results of the
  last run, with semgrep and trivy, are in `docs/SECURITY-SCAN.md`.
- **The desktop shell** runs with `contextIsolation` on, `nodeIntegration` off,
  `sandbox` on, no preload script, and the same CSP as the web build. Links that
  leave the app open in the system browser.

Report a vulnerability as described in `SECURITY.md`. Do not open a public issue
for one.

## Operations

`docs/OPERATIONS.md` is the runbook: migration order, what to do when a
migration half-applies, backups with the session pooler host, a restore into a
scratch project with verification queries, single-row recovery, and the
rollback matrix.

Restoring a backup has never been rehearsed against this project's real data,
and the document says so where it matters.

## Known limitations

- **Payments:** no gateway is configured. Gym member payments are recorded by
  staff; platform subscription payments are manual attestations an administrator
  records after verifying them elsewhere. Nothing simulates a successful card or
  UPI charge.
- **Messaging:** no SMS or email provider. Invitations, campaigns, notifications
  and reminders say they are not configured instead of pretending to send.
- **Modules without storage:** Payroll, Marketplace and Community render but
  have no table behind them. Their create actions say so rather than discarding
  input. Follow-ups and Access and roles do work, but as views over enquiries
  and staff rather than as their own records.
- **Monitoring:** no error-tracking service is connected. The platform health
  panel reports database reachability and states that monitoring is absent.
- **Legal:** privacy policy and terms are drafts pending review; data export and
  account deletion are not implemented.

## Project documents

- `MISSION.md` — the phase checklist, with the evidence for each completed phase
- `docs/BUILDING.md` — every build target
- `docs/OPERATIONS.md` — migrations, backup, restore, rollback
- `docs/SECURITY-SCAN.md` — last secret, SAST and dependency scan results
- `DESIGN.md`, `PRODUCT.md` — design system and product scope
- `CHANGELOG.md` — what changed per release
- `CONTRIBUTING.md` — how to work in this repo

## License

No license has been chosen yet. This is the owner's decision: until one is
added, the code is all rights reserved by default. See `LICENSE-DECISION.md`.
