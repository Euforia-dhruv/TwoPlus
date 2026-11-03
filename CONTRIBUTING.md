# Contributing

## Before you push

```bash
npm run check   # tsc -b, then vite build, then oxlint
npm run test    # Playwright, needs SHOT_EMAIL/SHOT_PASS
```

`npm run test:gate` runs both. A push should leave the tree green; CI runs the
same gates and will not be kinder than your machine.

The suite signs in against a real Supabase project, so it needs an account and
two environment variables. Without them the journey specs skip rather than fail,
which is useful locally but means a skipped run is not a passing run. Check the
count, not just the colour.

## What the gates do not catch

Types and tests do not see a wrong decision. Before you open a pull request,
check the things a machine cannot:

- **Authorization.** If you add a table, a read, or a write, ask who should be
  able to do it, then confirm the RLS policy says the same. Hiding a button is
  not access control. The database is the boundary.
- **Tenant scope.** Every query against gym data filters by
  `organization_id`. A query that forgets it either returns nothing (RLS
  saved you) or returns another gym's rows (RLS did not). Assume the second
  until you have read the policy.
- **Suspension.** New org-scoped write policies must call `org_has_role()`, or a
  suspended gym can still write.
- **Offline.** A new member-app write should be idempotent server-side and go
  through `submitOrQueue` with a stable intent key, otherwise a replay after a
  dropped connection duplicates it.

## Migrations

Never edit a migration that has already run against a live project. Add a new
numbered file, `NNNN_description.sql`. Existing installations will not re-run an
edited one, so the live schema silently diverges from the repository.

Every new table gets RLS enabled in the same migration that creates it. Every
policy is written explicitly; no table is left open "for now".

If your migration can be applied twice without error, say so in a comment. The
repo's recent migrations are written to be re-runnable; older ones are not.

## Code style

The surrounding code is the style guide. Beyond that:

- TypeScript strict. No `any` to silence a type error; fix the type.
- Paths use the `@/` alias for `src/`.
- Data access belongs in `src/lib/api.ts`, `member-api.ts`, or `admin-api.ts`,
  not in a component. Components render; the lib talks to Postgres.
- Navigation lives in `src/lib/navigation.ts`. Add a module there and the
  docks and routes follow.
- Comments explain why, not what. A comment that restates the code is noise; a
  comment that records a non-obvious constraint (why `file://` breaks routing,
  why the queue stops at the first failure) is the point.
- Do not add a dependency for a few lines. `scripts/make-icon.mjs` renders an
  ICO through Playwright's already-installed Chromium rather than pulling in an
  image library, and that is the standard to meet.

## Commits and pull requests

One logical change per commit, with a message that says what changed and why.
Prefix phases of the build plan with the phase number, as the history does.

A pull request should state what it changes, what it does not change, and how you
verified it: the commands you ran and their result. If something is unverified,
say which part and why. "Tests pass" without a count is not a verification.

Do not commit secrets. `.env.local`, `tests/.auth/`, `release/`, and `build/`
are ignored. If you ever do commit one, rotate it first: gitleaks scans full
history and a removed secret is still a leaked secret.

## Reporting a bug

Open an issue with the template. Include the surface (workspace, member app, or
platform console), what you did, what you expected, and what happened. For a
data problem, include the table and whether the write was refused or silently
dropped.

For a security issue, do not open an issue. Follow `SECURITY.md`.

## What needs the owner

These are not engineering decisions and should not be made in a pull request:
the license, app-store submission, code-signing certificates, payment provider
selection, and anything that spends money.
