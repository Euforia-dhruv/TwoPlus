-- TwoPlus.fit — 0012_workout_logging
--
-- The member application could show a workout plan but had no way to record
-- that it happened: no table stored a completed session, so progress,
-- consistency and personal records had nothing real to read. This adds the two
-- tables that make those figures possible, plus the RLS that keeps each
-- member's log private to them and visible to their own gym's staff.
--
-- Two tables rather than one because a session is the unit of attendance and
-- "did I train today", while a set is the unit of strength progress. Storing
-- both in one row would make per-exercise history a client-side aggregation.
--
-- Re-runnable: everything is `if not exists` or dropped before creation.

-- ---------------------------------------------------------------------------
-- A completed (or in-progress) training session.
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  -- Nulled rather than blocked when a plan is retired: the session still
  -- happened, and history must survive the plan being deleted.
  plan_id         uuid references public.workout_plans(id) on delete set null,
  assignment_id   uuid references public.member_workout_assignments(id) on delete set null,
  performed_on    date not null default current_date,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 1440),
  note            text check (note is null or char_length(note) <= 2000),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists workout_sessions_member_idx
  on public.workout_sessions (member_id, performed_on desc);
create index if not exists workout_sessions_org_idx
  on public.workout_sessions (organization_id, performed_on desc);

-- One session per member per day per assignment. The member UI writes this on
-- every "finish workout" tap, so the constraint makes the write idempotent
-- instead of relying on the client to remember it already sent one.
create unique index if not exists workout_sessions_member_day_key
  on public.workout_sessions (
    member_id,
    performed_on,
    coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ---------------------------------------------------------------------------
-- The individual sets inside a session.
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.workout_sessions(id) on delete cascade,
  -- Nulled, not blocked, when an exercise is edited out of a plan: the set is
  -- still a true record of what was lifted.
  exercise_id uuid references public.workout_exercises(id) on delete set null,
  -- Kept even when exercise_id is null, so history stays readable.
  exercise_name text not null check (char_length(trim(exercise_name)) > 0),
  set_number  integer not null check (set_number > 0),
  reps        integer check (reps is null or reps >= 0),
  weight_kg   numeric(7, 2) check (weight_kg is null or weight_kg >= 0),
  created_at  timestamptz not null default now(),
  unique (session_id, set_number)
);

create index if not exists workout_sets_session_idx
  on public.workout_sets (session_id, set_number);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- Members reach their own rows through members.user_id = auth.uid(), the same
-- gate 0007 uses everywhere else. Staff reach rows inside their own gym only,
-- which is what org_has_role already enforces.
-- ---------------------------------------------------------------------------
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;

drop policy if exists "workout sessions read own" on public.workout_sessions;
create policy "workout sessions read own" on public.workout_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.members m
       where m.id = workout_sessions.member_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sessions insert own" on public.workout_sessions;
create policy "workout sessions insert own" on public.workout_sessions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
       where m.id = workout_sessions.member_id
         and m.user_id = auth.uid()
         and m.organization_id = workout_sessions.organization_id
    )
  );

drop policy if exists "workout sessions update own" on public.workout_sessions;
create policy "workout sessions update own" on public.workout_sessions
  for update to authenticated
  using (
    exists (
      select 1 from public.members m
       where m.id = workout_sessions.member_id
         and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
       where m.id = workout_sessions.member_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sessions delete own" on public.workout_sessions;
create policy "workout sessions delete own" on public.workout_sessions
  for delete to authenticated
  using (
    exists (
      select 1 from public.members m
       where m.id = workout_sessions.member_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sessions staff read" on public.workout_sessions;
create policy "workout sessions staff read" on public.workout_sessions
  for select to authenticated
  using (
    public.org_has_role(
      organization_id,
      'owner'::text, 'manager'::text, 'trainer'::text
    )
  );

-- Sets inherit their session's owner: a member may only write sets into a
-- session they own, which also stops a crafted session_id from attaching a set
-- to somebody else's record.
drop policy if exists "workout sets read own" on public.workout_sets;
create policy "workout sets read own" on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1
        from public.workout_sessions s
        join public.members m on m.id = s.member_id
       where s.id = workout_sets.session_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sets insert own" on public.workout_sets;
create policy "workout sets insert own" on public.workout_sets
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.workout_sessions s
        join public.members m on m.id = s.member_id
       where s.id = workout_sets.session_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sets delete own" on public.workout_sets;
create policy "workout sets delete own" on public.workout_sets
  for delete to authenticated
  using (
    exists (
      select 1
        from public.workout_sessions s
        join public.members m on m.id = s.member_id
       where s.id = workout_sets.session_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout sets staff read" on public.workout_sets;
create policy "workout sets staff read" on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
       where s.id = workout_sets.session_id
         and public.org_has_role(
           s.organization_id,
           'owner'::text, 'manager'::text, 'trainer'::text
         )
    )
  );
