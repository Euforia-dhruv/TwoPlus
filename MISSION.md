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
- [ ] Gitleaks / Semgrep / Trivy runs (tools not installed; attempted and recorded).
- [ ] Dependency audit results recorded.

## Phase 13 — Performance

- [ ] Bundle analysis and code splitting.
- [ ] Lighthouse run.
- [ ] Pagination/index review on large lists.

## Phase 14 — Automated testing

- [x] 16 Playwright tests green (auth, contrast, member app, studio nav, workout stats).
- [x] Unit tests for workout stats.
- [ ] Owner journey end-to-end (create member → assign → renew → attendance).
- [ ] Security journey tests (cross-gym denied).

## Phase 15 — Repository cleanup

- [x] `.gitignore` correct; build artifacts not tracked.
- [x] Scratch scripts removed from git.
- [ ] README rewrite (setup, architecture, desktop/mobile builds, security).
- [ ] Issue/PR templates, security policy, contribution guide, changelog.
- [ ] License: **requires owner decision**, not chosen unilaterally.

## Phase 16 — CI/CD

- [x] `.github/workflows/ci.yml` runs install, lint, typecheck, build, tests.
- [ ] Release workflow with versioned artifacts and checksums.
- [ ] Signing wiring (blocked: no keys, and none may be committed).

## Phase 17 — Store readiness

- [!] Blocked: no signing credentials, no store accounts, no screenshots, and store submission
      needs the owner's explicit authorization.
- [x] Compliance checklist drafted (account deletion, privacy declarations, data safety).

## Phase 18 — Privacy and legal

- [x] Progress photos private by default; member records RLS-protected.
- [ ] Privacy policy, ToS, retention and deletion policy drafts.
- [ ] Data export and account deletion flows.
- [!] Legal review and DPDP Act compliance: **requires counsel**, cannot be self-certified.

## Phase 19 — Production readiness

- [x] Database migrations applied and verified.
- [x] HTTPS/domain/CSP in place.
- [ ] Backups verified restorable.
- [ ] Monitoring and error tracking.
- [ ] Rollback and restore runbook.

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
