# Restore rehearsal, 2026-11-04

Source: live project `qhxgqyzrzqxwvriugnya`.
Target: scratch project `lmhpbpalgcbccbyybemt`, direct host `db.lmhpbpalgcbccbyybemt.supabase.co`.
Dump: `backup-20261104-1252-withacl.dump`, 433,527 bytes.

## Result: pass

| Check | Source | Restored |
|---|---|---|
| public tables | 38 | 38 |
| per-table row counts | 38 tables | 0 mismatches |
| tables without RLS | 0 | 0 |
| policies | 108 | 108 |
| table grants to `authenticated` | 266 | 266 |
| `authenticated` can execute `promote_to_platform_admin` | false | false |
| members pointing at a missing `auth.users` row | 0 | 0 |
| members pointing at a missing organization | 0 | 0 |
| `auth.users` | 6 | 6 |
| `auth.identities` | 6 | 6 |
| `auth.sessions` | 42 | 42 |
| `auth.refresh_tokens` | 49 | 49 |

Policy behaviour, impersonating real users inside a rolled-back transaction:

| Session | orgs | members | payments | plans |
|---|---|---|---|---|
| owner, baddie gym | 1 | 2 | 0 | 0 |
| receptionist, Admin | 1 | 16 | 0 | 1 |
| owner, E2E Test Gym (owns the one payment) | 1 | 2 | 1 | 1 |
| owner, fit one | 1 | 1 | 0 | 0 |
| user with no organization | 0 | 0 | 0 | 0 |

Total members in the source is 22; no session saw more than its own org, and the
payment appeared only for the org that owns it.

## Three defects found in the runbook, now fixed in docs/OPERATIONS.md

1. **`--no-privileges` on the dump.** Drops all GRANT and REVOKE statements.
   Consequence: every table ungranted (app reads nothing), and
   `authenticated` regained `EXECUTE` on `promote_to_platform_admin` and
   `log_admin_action`, which the migrations deliberately revoke. This is a
   security regression hidden inside the backup procedure.
2. **`--schema-only` then `--data-only`.** Creates all foreign keys before any
   row is copied, so children fail against missing parents. Restoring `public`
   in a single pass replays constraints after COPY and works.
3. **`--disable-triggers` is not usable.** Requires superuser; Supabase's
   `postgres` role is not superuser, so the flag is ineffective.

## Other operational notes

- The scratch project's pooler host rejected the ref (`tenant/user ... not
  found`) on every region and port tried; the direct host worked.
- A `pg_restore -L` list file must be written without a UTF-8 BOM, or the first
  line is silently ignored and that table is skipped.
- Expected benign errors on the `public` pass: two
  `permission denied to change default privileges`, because the dump records
  default ACLs owned by `supabase_admin`.

## Not covered

Storage objects. `member-progress-photos` and `workspace-media` live in S3 and
are not in the dump; see the storage section of the runbook.
