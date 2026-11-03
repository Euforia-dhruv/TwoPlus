# TwoPlus.fit — Mission Tracker

Status legend: `[x]` done and verified · `[~]` partial · `[ ]` todo · `[!]` blocked (reason inline)

Evidence rule: a phase is only `[x]` when a command or artifact proves it. No phase is
marked done from intent.

---

## Phase 0 — Project protection

- [x] Repo inspected: `D:\TwoPlus\TwoPlus-repo`, branch `master`, clean tree.
- [x] Recovery checkpoint: git commits preserved, nothing reset or force-pushed.
- [x] Stack recorded: React 19.3, TS 6, Vite 8.3, react-router 7, Tailwind 4, Supabase 2.118.
- [x] No secrets in git: only `.env.example` tracked with placeholders.
- [x] Protection rules honoured: no feature deleted to simplify, no template swap.

## Phase 1 — Skills discovery

- [x] Existing `skill-index` inspected; skills live in `~/.agents/skills`.
- [x] Loaded the ones that match this repo (design, glassmorphism, security).
- [x] Recorded selection rationale in the report below.
- [x] Reference repos reviewed for practice, not copied (OWASP ASVS/MASVS/CheatSheet, Semgrep, Gitleaks, Trivy, Playwright, axe-core).

## Phase 2 — Product architecture

- [x] Three surfaces exist: platform admin (`SuperAdmin.tsx`), gym workspace (`App.tsx`), member app (`Member.tsx`).
- [~] Platform admin: gym list, plans, audit log, support tickets present; usage/revenue dashboards partial.
- [~] Gym workspace: strong; five nav items have no backing table (see Phase 6).
- [~] Member app: profile, membership, workouts, diet, measurements, classes, photos present.

## Phase 3 — CRM

- [x] Member profiles with ID, contact, membership, trainer, attendance, payments, measurements.
- [x] Search, filters, sorting, pagination, bulk select with confirmation.
- [x] Import/export, duplicate detection.
- [x] Expiry alerts, inactive detection, segmentation, follow-ups, notes.
- [x] Renewal history and activity timeline.
- [x] Operational insight built from real rows only (no fabricated metrics).

## Phase 4 — Member fitness app

- [x] Onboarding and account linking via hardened `claim_member_account` (verified email, single match, compare-and-set).
- [x] Dashboard from real records.
- [x] Workout: plans, logging, history, personal records (`workout-stats.ts`).
- [~] Nutrition: plans and diet diary present; macro data shown only when recorded.
- [x] Progress: weight/measurements (member-writable as of 0015), photos, strength, streaks.
- [~] Communication: announcements and notifications present; trainer messaging partial.
- [x] Member cannot read other members' rows (RLS verified by `tenant-probe.mjs`).

## Phase 5 — Trainer workspace

- [~] Trainers see assigned members, plans, progress, notes.
- [x] Trainer-specific scheduling view: a trainer sees only their own classes, matched
  through `staff.user_id` (`f61f4b0`). Owners/managers link a login to an employee row in
  Edit employee; unlinked trainers get an empty list plus the reason, never the whole org's
  schedule. Schedule class now records a trainer at all (previously always "Unassigned").
- [x] Trainer role cannot escalate to owner/admin (`org_has_role` enforced server-side).

## Phase 6 — Gym operations

- [~] Billing: packages, renewals, invoices, dues, refunds tracked; **no live payment gateway** (blocked: no provider credentials/account authorization).
- [x] Attendance: manual check-in, history, duplicate prevention, eligibility validation.
- [~] Employees: profiles, roles, payroll records; salary access restricted.
- [x] Finance: income, expenses, payroll, reports, export.
- [x] Classes: capacity, trainer, bookings, cancellations (race-safe `book_class`).
- [!] Equipment, Inventory, Customer support, Offers & referrals, Feedback: **no table, no persistence**. These nav entries are being removed rather than faked.

## Phase 7 — UI/UX

- [x] Glass design system with tokens, dark/light modes, `color-scheme` per mode.
- [x] Shell, sidebar, header, cards, tables, inputs, menus all on the same surface language.
- [x] Member cards on FlipCard with no face clipping.
- [x] Loading/empty/error/success states; destructive-action confirmation.
- [x] Reduced-motion respected.
- [x] Final per-screen visual pass on every module: `tests/screens.spec.ts` walks every
  nav route at 1440/1024/390 in both modes and fails on horizontal overflow (naming the
  offending element), a missing heading, or an uncaught page error. Green.

## Phase 8 — Mobile (Android + iOS)

- [!] **Cannot build here**: no java, no gradle, no Android SDK, no macOS/Xcode.
- [x] Capacitor architecture decision documented (reuse the web app in a native shell).
- [x] Capacitor project scaffold + config committed (`1971c9f`): `capacitor.config.ts`
  (appId `fit.twoplus.app`, `webDir: dist`, no committed `server.url`, mixed content off)
  plus `android/` and `ios/` native projects. `npx cap sync android` copies the real
  `dist/` bundle into the native project, proven in output. Docs: `docs/BUILDING.md`.
- [x] Android build workflow (`.github/workflows/android.yml`): JDK 21 + Android SDK, builds
  the web bundle, `cap sync`, `gradlew assembleDebug`, uploads the APK artifact.
  **Prepared but not built here** — no JDK/SDK on this machine, so CI is the proof path.
- [x] iOS build workflow (`.github/workflows/ios.yml`): `macos-latest`, simulator build
  with `CODE_SIGNING_ALLOWED=NO`. **Prepared but not built here** — Xcode is macOS-only.

## Phase 9 — Desktop (Windows)

- [x] Architecture decision: **Electron**, not Tauri. Tauri needs the Rust
  toolchain; this machine has no `rustc`/`cargo`, Electron is JS-only.
- [x] Project scaffold, icon, metadata. `electron/main.js` serves `dist/` over a
  custom `app://bundle` scheme (a `file://` origin would break `BrowserRouter`
  and `localStorage`), with `contextIsolation` on, `nodeIntegration` off,
  `sandbox` on, single-instance lock, and the same CSP as `vercel.json`.
  `package.json` gained `main`, `productName`, `description`, `author`, and
  `desktop` / `desktop:smoke` / `desktop:icon` / `desktop:package` scripts.
  `scripts/make-icon.mjs` renders `public/favicon.svg` into a 7-size
  `build/icon.ico` using the Chromium Playwright already installed.
- [x] Production `.exe` built **and run here**: `npm run desktop:package` emits
  `release/TwoPlus-win32-x64/TwoPlus.exe` (Electron 45.2.1, x64, 250 MB with
  runtime, 2.05 MB `app.asar`). Packaged binary passes `--smoke-check`: mounts
  `app://bundle/` and routes a deep link to `/app/overview/overview`, exit 0.
  Version metadata is real (`ProductName`/`CompanyName` `TwoPlus`,
  `FileVersion 1.0.0`, `Copyright (C) 2026 TwoPlus`), not the packager default.
  **Not wired:** code signing and an installer (owner-held certificate).

## Phase 10 — Offline

- [x] Cached reads for workout/diet/schedule/profile. `src/lib/offline-cache.ts` writes through
      to `localStorage` on every successful read and falls back to the last good copy on failure.
      `src/pages/Member.tsx` caches member, memberships, payments, attendance, workouts, diets,
      measurements, sessions and classes. Progress-photo URLs are deliberately not cached
      (signed URLs expire).
- [x] Queued mutations with stable operation IDs and duplicate protection. `src/lib/sync-queue.ts`
      keys each intent (`workout:<member>:<date>`, `measure:...`, `class-book:...`) so a repeat
      replaces the pending copy instead of stacking; every queued write is idempotent
      server-side. Replay stops at the first failure and caps at 50 rather than dropping edits.
- [x] Pending-sync state surfaced in the UI. `src/pages/member-sync-panel.tsx` shows the queue,
      the offline notice and stale-data state; it drains automatically on reconnect.
      Tests: `tests/outbox.spec.ts` (6 green).

## Phase 11 — Backend hardening

- [x] RLS on every table; tenant boundaries enforced server-side via `org_has_role`.
- [x] `SECURITY DEFINER` functions pinned `search_path`.
- [x] Storage buckets private except `workspace-media` (public by design).
- [!] Rate limiting: none at the app layer; must be configured at the edge (documented).
- [x] Migration + backup/restore runbook: `docs/OPERATIONS.md` (apply order, the
      "never edit live schema" rule, session-pooler `pg_dump`, why `auth` is dumped,
      scratch-project restore, the four restore verification queries, single-row
      recovery, rollback matrix). `scripts/rls-audit.mjs` proves the claim the runbook
      tells a human to check: 38 tables, 38 with RLS, 30 with policies, 8 closed to the
      API by design (named with reasons), exit 0. The restore steps are **unverified** —
      no database password or access token in this environment.

## Phase 12 — Security audit

- [x] Secret scan of tracked files: clean.
- [x] RLS probe: anon cannot read any protected table.
- [x] Cross-tenant probe: signed-in user cannot read another org's rows.
- [x] CSP and hardening headers shipped and verified against the real bundle.
- [x] Gitleaks / Semgrep / Trivy runs: `docs/SECURITY-SCAN.md`. Gitleaks 8.30.1 over the
      full history (144 commits) = no leaks, exit 0; `dir` mode found 3 real secrets in the
      gitignored `.env.local` and `tests/.auth/state.json`, never committed. Semgrep 1.183.0
      (290 rules, 540 files) = 17 findings, all reviewed: 14 mutable action tags in the
      workflows (accepted, pinned SHA deferred) and 3 in vendored skill JS that never ships.
      Trivy 0.76.1 = 0 critical/high.
- [x] Dependency audit recorded: production tree `npm audit --omit=dev` = **0**. Full tree = 7
      moderate, one chain (`glob`/`minimatch`/`rimraf`) reachable only through
      `@electron/packager` and `@capacitor/cli` at build time; the advertised fix is a
      breaking downgrade of the release tooling, so it is recorded and left. Nothing from
      that chain is in `dist/` or the shipped `.exe`.

## Phase 13 — Performance

- [x] Bundle analysis and code splitting. One static 1647 kB bundle became 20 chunks:
      `src/router.tsx` lazy-loads all nine pages behind a single `<Suspense>`, and
      `AuthLayout` lazy-loads the three.js `WaveGridBackground` so the 543 kB chunk is
      fetched only by `/login`. The first path now loads `index` 262 kB + `supabase`
      209 kB + runtime 8.8 kB; `App` (222 kB), `SuperAdmin` (39 kB), `Member` (25 kB)
      and `Marketing` (15 kB) arrive on navigation. The only remaining >500 kB warning
      is the three.js chunk itself, which no route outside `/login` downloads.
- [x] Lighthouse run. Lighthouse 13.6.0 (desktop) against `vite preview`: `/login`
      99 / 100 / 100 (FCP 0.6 s, LCP 0.6 s, TBT 10 ms, CLS 0), `/` 96 / 100 / 100.
      The one real failure found was `.mk-word` at `opacity: 0.3` measuring 2.33:1;
      raised to 0.45, contrast items now 0 and accessibility is 100 on both.
- [x] Pagination/index review on large lists. `scripts/agg-probe.mjs` established that
      this PostgREST returns `PGRST123` for aggregate functions, which is why totals
      were summed in the browser after `.limit(10_000)` — a silent truncation at ~36k
      attendance rows for a busy gym. `src/lib/api.ts` now exposes `selectAll`, which
      pages `.range(0, 999)` in `id` order until a short page; the monthly report and
      dashboard stat loaders use it, and no `.limit(10_000)` remains. Index coverage
      was already in place: migrations 0001–0015 carry ~50 indexes including
      `members_org_status_idx`, `members_org_name_idx`, `members_org_phone_idx`,
      `payments_org_date_idx`, `payments_org_status_idx`, `attendance_org_date_idx`,
      `classes_org_start_idx`, `member_memberships_expiry_idx` and
      `class_bookings_class_status_idx`, one for every filter and sort these queries
      actually use. No migration was needed. Full suite 23 green.

## Phase 14 — Automated testing

- [x] 16 Playwright tests green (auth, contrast, member app, studio nav, workout stats).
- [x] Unit tests for workout stats.
- [x] Owner journey end-to-end (create member → assign → renew → attendance). `tests/owner-journey.spec.ts` drives add member, plan assignment, profile open, renewal (re-reads "Valid until" after a reload), check-in, and archives the member it created. Passed 2/2.
- [x] Security journey tests (cross-gym denied). `tests/security-journey.spec.ts`: 15 tenant tables queried with the signed-in token against a foreign `organization_id` return zero rows, with positive controls proving the same token reads its own gym; anonymous RPC calls to `platform_admin_role`/`is_platform_admin`/`admin_platform_metrics` return 401; a signed-out visitor to `/super-admin` lands on `/login` and never renders `.admin-rail`. Passed 4/4.

## Phase 15 — Repository cleanup

- [x] `.gitignore` correct; build artifacts not tracked.
- [x] Scratch scripts removed from git.
- [x] README rewrite (setup, architecture, desktop/mobile builds, security). `README.md` rewritten around the three surfaces, all 15 migrations, the offline design, the four build targets, the real test inventory, and the known gaps. Every referenced path was checked to exist; the stale "modules without tables" list was corrected against `src/lib/navigation.ts` and the migration files (Payroll, Marketplace and Community are the ones with no table).
- [x] Issue/PR templates, security policy, contribution guide, changelog. `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/pull_request_template.md`, `SECURITY.md` (scope, the database-is-the-boundary model, accepted risks), `CONTRIBUTING.md` (gates, migration rules, RLS review questions), `CHANGELOG.md` (1.0.0).
- [x] License: **requires owner decision**, not chosen unilaterally. No `LICENSE` added. `LICENSE-DECISION.md` states that the code is currently all-rights-reserved, lays out the realistic options (proprietary, MIT/Apache-2.0, AGPL-3.0, BUSL), what each affects, and the exact four steps to close it once the owner chooses. The README's License section points there.

## Phase 16 — CI/CD

- [x] `.github/workflows/ci.yml` runs install, lint, typecheck, build, tests.
- [x] Release workflow with versioned artifacts and checksums. `.github/workflows/release.yml` triggers on `v*` tags (and manually), builds on `windows-latest`, packages the desktop app, runs `--smoke-check` against the packaged `.exe` and **fails the release if it exits non-zero**, writes `artifacts/twoplus-web-<version>.zip` and `artifacts/twoplus-desktop-win32-x64-<version>.zip`, hashes every archive with `scripts/checksums.mjs`, and publishes them to a GitHub release with `SHA256SUMS` attached. Version comes from `package.json` (currently 1.0.0). Checksum script proven locally: `node scripts/checksums.mjs dist` -> 29 files, exit 0.
- [!] Signing wiring: **blocked, no keys exist**. Android keystore, Apple distribution certificate plus provisioning profile, and a Windows code-signing certificate are owner-held credentials and must never be committed. The release workflow therefore ships unsigned archives and says so in the release body. Wiring is a documented 3-step change in `docs/BUILDING.md` once the owner supplies secrets.

## Phase 17 — Store readiness

- [!] Store accounts do not exist, and submission needs the owner's explicit authorization. Creating a Play Console or App Store Connect account costs money and binds the owner legally, so it is not something this repo can do.
- [x] Compliance checklist drafted (account deletion, privacy declarations, data safety). Artifact: `docs/STORE-READINESS.md`. Records app id `fit.twoplus.app` across all three targets, the permission audit (Android declares only `INTERNET`; iOS has no `NS*UsageDescription` and requests nothing), the tracking answer (no analytics or attribution SDK in `dependencies`, so "used to track you" is no), a data-safety table derived from the schema and `src/lib/member-api.ts`, draft store copy, and a ready/prepared/blocked split. It also names two real gaps rather than hiding them: `package.json` says 1.0.0 while both native projects say 1.0, and no member-app screenshots or 1024x500 feature graphic exist. Checked against `android/app/build.gradle`, `Info.plist`, `project.pbxproj`, `AndroidManifest.xml`, and the 1024x1024 `AppIcon-512@2x.png`.

## Phase 18 — Privacy and legal

- [x] Progress photos private by default; member records RLS-protected.
- [x] Privacy policy, ToS, retention and deletion policy drafts. `/privacy` and `/terms` rewritten in `src/pages/DocPages.tsx` (dated 3 November 2026). Privacy covers what is stored, where it lives (including 10-minute signed photo links), payments, who can see it, export, deletion with the erased/kept split, and retention. Terms adds "Keeping records lawful", which puts the lawful-basis duty on the gym rather than the product. `docs/PRIVACY-LIFECYCLE.md` is the engineering companion: store-by-store inventory, the photo rules, the retention table, and an explicit "what this does not do" list (no scheduled purge, no backup redaction, not legal advice).
- [x] Data export and account deletion flows. Export: `exportMyData()` in `src/lib/member-api.ts` writes one JSON file (`twoplus-my-data-<date>.json`) with profile, memberships, payments, attendance, workouts, assigned workout and diet plans, measurements and photo metadata; signed photo URLs are stripped because a 10-minute link is not keepable data. Deletion: `supabase/migrations/0016_account_deletion.sql` adds `delete_my_account()` (security definer, granted to `authenticated` only, `search_path` pinned). It erases photos, measurements, workout sessions, assignments, bookings, attendance and notes, anonymises the member row, and deletes the `auth.users` row, while payments, invoices, memberships and renewals survive as financial records. It **refuses with 42501 when the caller owns an organization** (`organizations.owner_id` is `on delete restrict`), so deleting a sign-in can never orphan a live gym. Both actions live in the member app's tenth section, "Your data". Verified: `npx tsc -b` exit 0, `npm run build` exit 0, `npx playwright test tests/member-app.spec.ts` 3 passed. The migration itself is **written but not applied**: no `SUPABASE_ACCESS_TOKEN` and no database password on this host.
- [!] Legal review and DPDP Act compliance: **requires counsel**, cannot be self-certified.

## Phase 19 — Production readiness

- [x] Database migrations applied and verified.
- [x] HTTPS/domain/CSP in place.
- [!] Backups verified restorable: **blocked, not verified**. `docs/OPERATIONS.md` has the full procedure (pg_dump through the session pooler with `--schema=public --schema=auth`, storage objects separately, restore into a scratch project, four verification queries including the member→`auth.users` orphan count that must be zero, then signing in as a real owner and a real member). It has never been executed: this host has no `docker`, no `psql`, no `SUPABASE_ACCESS_TOKEN` and no database password, and the runbook says so in its own "What is not automated" section. **Human action:** set `PGPASSWORD` from Dashboard → Settings → Database and run the dump plus one restore rehearsal; then this box can be ticked. Migration `0016_account_deletion.sql` is written but likewise not applied, for the same missing credential.
- [x] Monitoring and error tracking. There is no third-party tracker and none is pretended: `admin_platform_metrics()` (migration 0002, security definer, `search_path=''`, `42501` unless `is_platform_admin()`) returns `error_monitoring` hardcoded to `not configured`, and the SuperAdmin *System health* panel renders that verbatim beside Database and Server time. What was missing was in-app failure handling, which is now real: `src/components/ErrorBoundary.tsx` wraps the whole tree in `src/main.tsx`, so a render error shows a message, the thrown text, and Reload / Go to sign in instead of a blank page; it logs to the console and keeps a five-entry ring exposed as `recentErrors()`, which is the hook a tracker would attach to. Verified: `npx tsc -b` exit 0, `npm run build` exit 0 (4.07s), `npx playwright test tests/error-boundary.spec.tsx` 3 passed.
- [x] Rollback and restore runbook. `docs/OPERATIONS.md` carries the rollback matrix (bad frontend deploy → promote the previous deploy, no database action; bad migration with data intact → write the next migration, never restore; bad migration that destroyed data → stop writes, restore into a new project, verify, repoint `VITE_SUPABASE_URL` and rebuild because it is baked in at build time; suspected breach → rotate the anon and service-role keys and force sign-out of all sessions), plus the restore procedure and single-row recovery. The commands are unverified against a real project and the file states that rather than implying otherwise.

## Phase 20 — Final report

- [ ] Deliverables A–F written with real results.

---

## Decisions log

| Decision | Why |
|---|---|
| Remove unbacked nav items instead of building tables | A nav item that cannot save is a lie to the user; removal is honest and reversible. |
| Capacitor over React Native for mobile | Reuses the whole verified web app; no rewrite, single codebase. |
| No payment gateway integration | No provider account or credentials; faking a checkout would risk real money. |
| No license chosen | Ownership is the repo owner's call. |
