# Operations runbook

Migration and backup/restore procedure for the TwoPlus database. Written to be
followed by someone who has never touched this project, under pressure, at 2am.

Project ref: `qhxgqyzrzqxwvriugnya` (eu-west-1). Region matters: a restore into a
project in another region changes latency for every query.

## Migrations

`supabase/migrations/` is the only source of schema truth. The live database is
not edited by hand; anything done in the SQL editor that is not also in a file is
lost at the next restore.

Current state: `0001` through `0015`, applied in order. To confirm what the
database has actually run:

```bash
npx supabase migration list --linked
```

Rules for a new migration:

1. **Number is the next free integer.** Never reuse or renumber an applied file;
   the CLI treats a changed hash as a different migration.
2. **Re-runnable where possible.** `create table if not exists`,
   `add column if not exists`, `drop policy if exists` before `create policy`.
   Early migrations already follow this, and it is what makes a partial failure
   safe to retry.
3. **RLS in the same file as the table.** A table without a policy is readable by
   nobody, or worse, forgotten. Every `create table` in this repo is followed by
   `enable row level security` and its policies.
4. **`security definer` functions pin `search_path`.** Without it a caller can
   shadow a table name and run their code with the definer's rights.
5. **No data deletion in a schema migration.** A destructive change is a separate,
   reviewed step with its own backup.

Apply:

```bash
npx supabase link --project-ref qhxgqyzrzqxwvriugnya
npx supabase db push            # applies every unapplied file in order
```

`db push` is forward-only. There is no down migration. A mistake is corrected by
writing the next migration that undoes it, because a real database has rows in it
by then and a generated rollback guesses wrong.

### Verifying a migration landed

```sql
-- did the table arrive with RLS on?
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- every table must have at least one policy
select c.relname, count(p.polname) as policies
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
group by c.relname having count(p.polname) = 0;
```

The second query must return zero rows. This is the check that catches a table
shipped without tenancy.

## Backup

Supabase takes a nightly physical backup on paid plans and keeps 7 days. That is
not sufficient on its own: it is a whole-project restore, it cannot recover one
accidentally deleted member, and on the free tier the window is shorter. Take a
logical dump before every migration and keep it off the machine.

```bash
# session pooler host, not the direct db host: direct connections are IPv6-only
export PGPASSWORD='<database password from Dashboard > Settings > Database>'
pg_dump "postgresql://postgres.qhxgqyzrzqxwvriugnya@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  --schema=public --schema=auth --no-owner --no-privileges \
  --format=custom --file=backup-$(date +%Y%m%d-%H%M).dump
```

- `--format=custom` so `pg_restore` can do selective restore and run in parallel.
- `auth` is included deliberately: without it, members keep their member rows but
  lose the identity that proves the row is theirs, and every member has to be
  re-linked by hand.
- Storage objects are **not** in the dump. They live in S3 and need the separate
  procedure below.

### Storage objects

```bash
# requires the service-role key; run from a trusted machine, never a browser
npx supabase storage cp -r ss:///member-progress-photos ./backup/photos \
  --experimental --linked
```

Buckets: `member-progress-photos` (private, signed URLs only) and
`workspace-media` (public by design). A restore without these leaves every photo
row pointing at nothing.

### Where the files go

Not in git, not on the laptop that runs the migration. One copy in object
storage in a different account from the database, one copy offline. A backup on
the same provider that hosts the database is not a backup against that provider.

## Restore

Never restore over the live database. Restore into a scratch project and prove
the data is there, then decide.

```bash
# 1. new empty Supabase project
npx supabase link --project-ref <scratch-ref>

# 2. schema first, so the data lands in tables that already have RLS
pg_restore --schema-only --no-owner --no-privileges --dbname "$SCRATCH_URL" backup.dump

# 3. data, in one transaction per table so one bad table does not stop the rest
pg_restore --data-only --no-owner --no-privileges --disable-triggers \
  --dbname "$SCRATCH_URL" backup.dump
```

`--disable-triggers` is required because the audit triggers fire on restored
rows and would attribute history to the restoring role.

### Restore verification

A restore is not done until these pass. Run them against the scratch project.

```sql
-- 1. row counts match the source, per table
select relname, n_live_tup from pg_stat_user_tables order by 2 desc;

-- 2. no table was left without RLS (see the migration check above)
-- 3. every member still resolves to a sign-in identity
select count(*) from public.members where user_id is not null
  and not exists (select 1 from auth.users u where u.id = public.members.user_id);
-- must be 0; anything else is a member who cannot reach their own data

-- 4. tenancy still holds: no member row points at a missing organization
select count(*) from public.members m
  where not exists (select 1 from public.organizations o where o.id = m.organization_id);
-- must be 0
```

Then log in to the scratch deployment as a real owner and as a real member and
open the dashboard and the member app. A row count does not prove a policy works;
a signed-in session does.

### Restoring one deleted row

Do not restore the whole dump for this. Extract the table, load it into a
temporary schema, and insert the rows back:

```bash
pg_restore --data-only --table=public.members --file=members.sql backup.dump
```

Check the foreign keys by hand before inserting: a member restored without their
membership row is a member the gym cannot bill.

## Rollback

Application rollback and database rollback are separate decisions.

| Situation | Action |
| --- | --- |
| Bad frontend deploy | Revert the commit on the host (Netlify/Vercel keep every previous deploy; promote it). No database action. |
| Bad migration, data intact | Write the next migration that reverses it. Do not restore. |
| Bad migration, data destroyed | Stop writes (suspend the organization members' access by revoking, or point the app at a maintenance page), restore the last dump into a new project, verify, then repoint `VITE_SUPABASE_URL`. |
| Suspected breach | Rotate the anon key and the service-role key, force sign-out of all sessions in the dashboard, then investigate the audit log. |

The app reads `VITE_SUPABASE_URL` at build time, so repointing the database means
a rebuild and redeploy, not a config change. Budget for that in the outage.

## What is not automated

- No scheduled logical dump. The nightly physical backup is the only automatic
  one, and it is whole-project.
- No restore rehearsal schedule. This runbook has not been executed against a
  scratch project because no database password or access token is available in
  this environment; the commands are unverified.
- No off-site copy configured. Someone has to choose the bucket.
