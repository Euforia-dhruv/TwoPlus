# Changelog

Notable changes, newest first. Versions follow the desktop binary, which is the
only artifact that carries a version number today; the web build is deployed
from `master` and has no separate release cadence.

## Unreleased

A codebase audit, with the fixes it turned up. No user-facing feature changed.

### Fixed

- The mobile header used a 246 px column on a 390 px screen, because the shell
  kept its desktop rail gutter below the breakpoint. A category with five items
  (Finance) was clipped at both edges with no way to reach the rest. The gutter
  now resets on small screens and the category strip scrolls.
- `scripts/shots.mjs` had been capturing the public marketing page and
  reporting success, because it targeted navigation that no longer exists. It
  now signs in, navigates by route, and exits non-zero on a page error or
  overflow.
- Refs were read and written during render in the flip card, the animated
  counter, the rating pill and the commit slider. That is undefined behaviour
  under React's concurrent renderer; all four now derive from state or update in
  an effect.
- `body` carried a 360 px `min-width`, so every screen overflowed a 320 px
  viewport by exactly 40 px. The floor is now 320 px and all 27 routes are clean
  at all 16 audited widths.

### Changed

- `framer-motion` was installed alongside `motion`, which is the same library
  and already the one in use. Seven files imported the duplicate; they now import
  `motion/react` and the extra package is gone, trimming the dependency tree.

### Added

- `AUDIT.md`, `IMPLEMENTATION_PLAN.md`, `SKILL_PROGRESS.md` and `ISSUES.md`,
  recording what was measured, what was fixed, and what is knowingly left.
- The native member app under `mobile/` is now tracked. It previously had no
  version history at all.

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
- An invited member who confirms their email now lands on the claim screen. They
  have no member row until they claim one, and the old redirect sent them to the
  workspace, which bounced them into the "set up your gym" form, leaving the only
  screen that can link their account unreachable. The gym name on signup is
  optional now, and the home redirect is a tested pure function rather than
  inline branches.
- The sign-in, sign-up and password-reset screens lock one address for 60 s after
  5 failed attempts, instead of letting a stuck button or a shared tablet
  hammer the auth endpoint.

### Security

- CSP, HSTS, `nosniff`, frame denial, referrer policy and a permission policy on
  the deployed web build, and the same CSP inside the desktop shell.
- gitleaks, semgrep and trivy runs recorded in `docs/SECURITY-SCAN.md`.
  No secrets in history; no critical or high dependency findings in what ships.

### Known gaps

- No payment gateway, no SMS or email provider, no error tracking.
- Three modules render but have no storage (Payroll, Marketplace, Community);
  their create actions are disabled.
- Privacy policy and terms are drafts pending legal review; data export and
  account deletion are implemented but the deletion migration is unapplied.
- Apple and Windows code signing, store submission and a Windows installer need
  owner-held credentials. Android builds are already signed from a keystore kept
  outside the repo.
