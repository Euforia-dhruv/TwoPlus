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

The schema lives in `supabase/migrations/0001_init.sql` (organizations,
branches, profiles, organization_members, members, membership_plans,
member_memberships, payments, attendance, enquiries, staff, classes,
class_bookings, expenses, notifications — with RLS on every table).

Apply it with the Supabase CLI against your project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the file into the Supabase Dashboard → SQL Editor and run it once.

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
  `/forgot-password`, `/reset-password`, `/onboarding`, `/` dashboard)
- `supabase/migrations/` — version-controlled schema; org creation happens via
  a security-definer RPC so owners cannot self-grant roles from the client
