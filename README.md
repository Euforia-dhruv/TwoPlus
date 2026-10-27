# TwoPlus.fit — GymOS

Multi-tenant gym management SaaS. One application serves many independent gyms,
with strict data isolation enforced by Postgres Row Level Security.

- **Frontend:** React 19 + TypeScript + Vite (deployed on Netlify)
- **Backend:** Supabase (Auth + PostgreSQL + RLS)

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values.
3. Apply the database migration (see below).
4. Run the dev server: `npm run dev`

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` / Netlify env | Supabase project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` / Netlify env | Publishable/anon key — safe for the browser; RLS protects the data |

The **service-role key must never** appear in frontend code or `.env` files
committed to git. It belongs only in trusted server-side systems.

### Database migration

The gym schema lives in `supabase/migrations/0001_init.sql` (organizations,
branches, profiles, organization_members, members, membership_plans,
member_memberships, payments, attendance, enquiries, staff, classes,
class_bookings, expenses, notifications — with RLS on every table).
`0002_platform_admin.sql` adds the separate Super Admin role, organization
lifecycle controls, platform plans and subscriptions, invoices, support
tickets, audit logging, and database-guarded admin RPCs. It does not expose
cross-gym table access through the browser.

Apply it with the Supabase CLI against your project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the file into the Supabase Dashboard → SQL Editor and run it once.
For a new project, apply migrations `0001_init.sql` and then
`0002_platform_admin.sql`. Existing installations with `0001_init.sql` applied
only need the second migration.

### Grant the first Super Admin

After the administrator has created and confirmed their Supabase Auth account,
run this from the Supabase SQL Editor (replace the email with the account to
authorize):

```sql
select public.promote_to_platform_admin('admin@example.com', 'super_admin');
```

This bootstrap function rejects calls made through the browser/API. Only the
`super_admin` role is currently enabled; the table and every admin RPC enforce
that role in the database. The app's `/super-admin` page (also reachable at
`/admin`) checks the same database role and offers platform overview, gym
lifecycle management, plan and subscription controls, support tickets, and the
audit log. Subscription payments can only be recorded manually after they have
actually been verified outside the app; automated payment gateways are not
configured.

### Organization suspension

Suspending or cancelling an organization never deletes data. The status check
lives in `org_has_role()`, which every organization-scoped write policy calls,
so a suspended gym becomes read-only: its owners and staff can still sign in
and read members, payments, attendance, and history, but every insert, update,
and delete is refused by RLS. The dashboard shows a suspension notice instead of
failing silently. Gym users cannot change their own organization status.

### Known limitations

- **Payment gateways:** none configured. Platform payments are manual
  attestations recorded by an administrator; gym member payments are recorded
  by gym staff. Nothing simulates a successful card or UPI charge.
- **Messaging and invitations:** SMS, email campaigns, member app
  notifications, and staff invitations have no delivery provider. Those actions
  say so and do not pretend to send.
- **Modules without tables:** Follow-ups, Payroll, Workouts, Diet & nutrition,
  Equipment, Inventory, Reminders, Offers & referrals, Feedback, Branches,
  Access & roles, Customer support, and Community have UI but no database
  storage yet. Their create actions are disabled rather than silently discarding
  input. Persisting them needs new migrations.
- **Error monitoring:** no error-tracking service is connected, so the platform
  health panel reports only database reachability and states that monitoring is
  not configured.

### Supabase Auth configuration

- **Redirect URLs:** add your Netlify domain (and `http://localhost:5173` for
  local dev) to Authentication → URL Configuration → Redirect URLs.
- Password-reset emails redirect to `/reset-password`; verification emails
  land on `/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run lint` | Oxlint |
| `npm run preview` | Preview the production build |

## Architecture notes

- `src/lib/supabase.ts` — lazy Supabase client (typed row shapes in `src/lib/types.ts`)
- `src/lib/api.ts` — all data access, organization-scoped
- `src/lib/auth.tsx` / `src/lib/org.tsx` — session + organization context
- `src/router.tsx` — routes with auth/onboarding guards (`/login`, `/signup`,
  `/forgot-password`, `/reset-password`, `/onboarding`, `/` dashboard, and the
  database-authorized `/super-admin` control center, aliased at `/admin`)
- `supabase/migrations/` — version-controlled schema; org creation happens via
  a security-definer RPC so owners cannot self-grant roles from the client
