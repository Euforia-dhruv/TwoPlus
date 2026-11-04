# Changelog

Notable changes, newest first. Versions follow the desktop binary, which is the
only artifact that carries a version number today; the web build is deployed
from `master` and has no separate release cadence.

## 1.0.0

First version that is complete enough to run a gym on, and the first with a
packaged Windows build. Everything below landed between the initial scaffold and
this point.

### Added

- Gym workspace: members, memberships and plans, payments, invoices, expenses,
  attendance, staff and trainers, classes, enquiries, and monthly reports, with
  a two-level navigation whose URLs are real routes.
- Member app: own profile, membership and plan, outstanding balance, workout
  logging with personal records and weekly streaks, diet plans, class booking,
  body measurements, progress photos, and payment history.
- Platform console: gym lifecycle (including suspend and cancel), plans,
  subscriptions, invoices, support tickets, an audit log, and database-guarded
  admin RPCs. `/super-admin` and `/admin` are the same console.
- Multi-tenancy through Postgres Row Level Security on every gym-scoped table,
  with a separate platform-admin role that cannot be reached through table
  reads.
- Suspension makes a gym read-only through `org_has_role()` rather than
  deleting anything.
- Offline support in the member app: cached reads with a stale notice, a queued
  outbox for writes that failed for network reasons, idempotent replay, and a
  pending-sync panel.
- Public marketing page, privacy and terms drafts, and a workspace manual.
- Android and iOS shells via Capacitor, with CI workflows that build them.
- Windows desktop build via Electron, serving the bundle over a privileged
  `app://` origin so history routing and `localStorage` work, with a
  `--smoke-check` self test.
- Playwright suite covering auth, contrast, every module at three widths in both
  modes, the owner journey, member app, offline queue, workout stats, and a
  cross-tenant probe against 15 tables.
- CI: types, lint, production build, secret scan over full history, and the
  end-to-end suite when credentials are present.
- Operations runbook covering migration order, backup, restore into a scratch
  project, single-row recovery, and rollback.

### Changed

- Routes are code-split per surface, so a member on a phone no longer downloads
  the platform console and the staff workspace before their workout renders.
- Report and dashboard totals page through every row instead of summing a
  `limit(10_000)` window, which silently truncated at high visit volumes.
- Workspace text contrast raised to meet WCAG AA in both light and dark.

### Fixed

- Staff accounts now link to the login that owns them, so a trainer's schedule
  shows their classes rather than every class in the gym.
- Deep links survive a hard reload.
- The member-app home redirect picks the right surface for an account that is
  both staff and member.

### Security

- CSP, HSTS, `nosniff`, frame denial, referrer policy and a permission policy on
  the deployed web build, and the same CSP inside the desktop shell.
- gitleaks, semgrep and trivy runs recorded in `docs/SECURITY-SCAN.md`.
  No secrets in history; no critical or high dependency findings in what ships.

### Known gaps

- No payment gateway, no SMS or email provider, no error tracking.
- Nine modules render but have no storage; their create actions are disabled.
- Privacy policy and terms are drafts; data export and account deletion are not
  implemented.
- Apple and Windows code signing, store submission and a Windows installer need
  owner-held credentials. Android builds are already signed from a keystore kept
  outside the repo.
