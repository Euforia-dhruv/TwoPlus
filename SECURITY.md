# Security policy

## Reporting a vulnerability

Do not open a public issue. Email the maintainer at the address on the GitHub
profile of the repository owner, or use GitHub's private "Report a
vulnerability" advisory form on this repository.

Include what you did, what you expected, and what happened. A reproduction with
a request, a URL, or a test is worth more than a description. If the report
involves a live gym's data, stop at the first row you can see and say so rather
than reading further.

You should get an acknowledgement within a few days. There is no bug bounty and
no paid disclosure programme, so please do not expect payment.

## Scope

In scope:

- Cross-tenant reads or writes: seeing, changing, or deleting another gym's
  members, payments, attendance, staff, plans, or notes.
- Privilege escalation inside a gym (a trainer or receptionist doing what only
  an owner or manager may do) or into the platform console.
- Authentication flaws: session handling, password reset, account takeover.
- The offline queue replaying a write that duplicates or corrupts data.
- Secrets committed to the repository or shipped inside `dist/`, the APK, the
  `.ipa`, or the Windows binary.
- Missing authorization on a platform-admin RPC.

Out of scope:

- Findings that require a compromised machine, a rooted device, or physical
  access to an unlocked browser.
- Missing rate limiting on the Supabase Auth endpoints (that is the provider's
  responsibility).
- Reports produced only by an automated scanner with no demonstrated impact.
- The intentionally-unwired features listed in the README: no payment gateway,
  no messaging provider, no error tracking. Those are known gaps, not
  vulnerabilities.

## How authorization is meant to work

The database is the boundary, not the UI. Every gym-scoped table has RLS
enabled and every policy checks the caller's membership through
`org_has_role()`. Hiding a button is a convenience for staff; the request behind
it is refused independently.

The platform console is guarded twice: the route checks the database role via
the `platform_admin_role` RPC, and every admin RPC re-checks
`is_platform_admin()` itself. A caller without a session gets `401`; a session
without the role gets `403`.

`suspend` on an organization never deletes data. It flips the gym to read-only
through the same role check, so owners and staff can still sign in and read
history.

## Deployment requirements

These are properties of the Supabase project, not of this repository. They
cannot be tested by the suite, so they are listed here to be checked when a
project is created or restored.

- **"Confirm email" must be ON** (Authentication → Providers → Email) with a
  working SMTP sender. `claim_member_account()` reads `email_confirmed_at` from
  `auth.users` and treats a confirmed address as proof the caller owns it. With
  autoconfirm on, GoTrue stamps that column at signup, so the check proves
  nothing and any account could claim a member row by registering the gym's
  address. Migration `0011_harden_member_claim.sql` depends on this; the
  invite-code claim noted there would remove the dependency.
- **Email provider rate limits stay enabled.** The app throttles repeat
  credential attempts in the browser (`src/lib/attempt-limit.ts`), but that is a
  UI brake the user can clear. The server-side quota is the actual control.
- **RLS stays enabled on every table.** `scripts/rls-audit.mjs` checks the live
  database for this; a table added without a policy is readable by nobody at
  best and unprotected at worst.

## Automated checks in CI

- **gitleaks** over full history on every push and pull request. A secret that
  was committed and later removed is still in the object store, so the scan
  fetches all history.
- **Types, lint, and a production build** on every push and pull request.
- **Playwright**, including a cross-tenant probe that queries 15 tables with the
  signed-in token against a foreign `organization_id` and fails if any row comes
  back.

The last manual runs of gitleaks, semgrep, trivy and `npm audit`, with what was
found and what was accepted, are recorded in `docs/SECURITY-SCAN.md`.

## Known accepted risks

- GitHub Actions are pinned to mutable tags (`actions/checkout@v4` and similar)
  rather than commit SHAs. Pinning to SHAs is deferred; the workflow files are
  protected by review rather than by a hash.
- `npm audit` reports moderate advisories in `glob` / `minimatch` / `rimraf`,
  reached through `@electron/packager` and `@capacitor/cli`. They are
  build-time tools and nothing from them ships in `dist/` or the desktop
  binary. The only offered fix is a breaking downgrade.
- A vendored skills directory under `.opencode/` produces semgrep warnings. It is
  never bundled into a build.
