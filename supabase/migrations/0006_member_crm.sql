-- TwoPlus.fit — 0006_member_crm
--
-- Member CRM: fitness records, fitness measurements, progress photos,
-- invoices, renewal history, internal notes, activity log.
--
-- Also closes a tenancy hole in 0001: payments/attendance/member_memberships
-- referenced members(id) only, so a caller authorised for org A could point a
-- row at a member that belongs to org B. Composite foreign keys on
-- (member_id, organization_id) make that impossible at the database level.
--
-- Re-runnable: every object is created with "if not exists" or replaced.

-- ---------------------------------------------------------------------------
-- Theme style: 0003 shipped the glass look as the only look. Theme 2 keeps the
-- previous solid surfaces available per workspace.
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists theme_style text not null default 'glass'
  check (theme_style in ('glass','classic'));

-- ---------------------------------------------------------------------------
-- Tenancy anchors
-- ---------------------------------------------------------------------------
-- Composite FKs need a unique key on the referenced pair.
alter table public.members
  add constraint members_id_org_key unique (id, organization_id);

alter table public.staff
  add constraint staff_id_org_key unique (id, organization_id);

alter table public.membership_plans
  add constraint membership_plans_id_org_key unique (id, organization_id);

alter table public.member_memberships
  add constraint member_memberships_id_org_key unique (id, organization_id);

-- Re-point the child tables at the pair. The single-column FKs stay (they
-- cascade on delete); these add the tenant check.
alter table public.member_memberships
  add constraint member_memberships_member_org_fk
  foreign key (member_id, organization_id)
  references public.members (id, organization_id) on delete cascade;

-- staff.trainer_id must point at staff in the same gym.
alter table public.members
  add constraint members_trainer_org_fk
  foreign key (trainer_id, organization_id)
  references public.staff (id, organization_id) on delete set null;

alter table public.payments
  add constraint payments_member_org_fk
  foreign key (member_id, organization_id)
  references public.members (id, organization_id) on delete cascade;

alter table public.payments
  add constraint payments_membership_org_fk
  foreign key (membership_id, organization_id)
  references public.member_memberships (id, organization_id) on delete set null;

alter table public.attendance
  add constraint attendance_member_org_fk
  foreign key (member_id, organization_id)
  references public.members (id, organization_id) on delete cascade;

-- Enough digits to be a real phone number, not a free-text field. NOT VALID
-- so pre-existing rows cannot block the migration; new writes are checked.
alter table public.members
  add constraint members_phone_shape
  check (phone ~ '^[0-9+() -]{6,20}$') not valid;

-- ---------------------------------------------------------------------------
-- Member code counter — collision-safe, per gym, no client input
-- ---------------------------------------------------------------------------
create table if not exists public.org_member_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  last_number     integer not null default 0 check (last_number >= 0)
);

alter table public.org_member_counters enable row level security;
-- No policies: only the SECURITY DEFINER functions below touch this table.

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  membership_id   uuid,
  invoice_number  text not null,
  issued_on       date not null default current_date,
  due_on          date,
  total_minor     integer not null check (total_minor >= 0),
  status          text not null default 'issued'
                  check (status in ('draft','issued','partial','paid','void')),
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, invoice_number),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id)
    references public.member_memberships (id, organization_id) on delete set null
);
create index if not exists invoices_org_date_idx on public.invoices (organization_id, issued_on desc);
create index if not exists invoices_member_idx on public.invoices (member_id);

alter table public.payments
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
create index if not exists payments_invoice_idx on public.payments (invoice_id);

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

drop policy if exists "invoices read" on public.invoices;
create policy "invoices read" on public.invoices
  for select using (public.is_org_member(organization_id));

drop policy if exists "invoices write" on public.invoices;
create policy "invoices write" on public.invoices
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'finance', 'receptionist'));

drop policy if exists "invoices update" on public.invoices;
create policy "invoices update" on public.invoices
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'finance'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'finance'));

-- ---------------------------------------------------------------------------
-- Statuses: extend the vocabulary without breaking existing rows
-- ---------------------------------------------------------------------------
-- 0001 allowed ('scheduled','active','expired','frozen','cancelled'). "paused"
-- is the word the UI uses; it maps to frozen. Renewal history needs to know
-- which membership row was extended and by whom, so it gets its own table.
create table if not exists public.membership_renewals (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  membership_id        uuid not null,
  member_id            uuid not null,
  previous_end_date    date not null,
  new_end_date         date not null,
  extended_days        integer not null,
  amount_minor         integer not null default 0 check (amount_minor >= 0),
  note                 text,
  renewed_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  check (new_end_date > previous_end_date),
  foreign key (membership_id, organization_id)
    references public.member_memberships (id, organization_id) on delete cascade,
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade
);
create index if not exists membership_renewals_member_idx
  on public.membership_renewals (member_id, created_at desc);

alter table public.membership_renewals enable row level security;

drop policy if exists "renewals read" on public.membership_renewals;
create policy "renewals read" on public.membership_renewals
  for select using (public.is_org_member(organization_id));

drop policy if exists "renewals write" on public.membership_renewals;
create policy "renewals write" on public.membership_renewals
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));

-- ---------------------------------------------------------------------------
-- Internal notes — restricted to owner/manager, separate from members.notes
-- ---------------------------------------------------------------------------
create table if not exists public.member_internal_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  body            text not null check (char_length(trim(body)) > 0),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade
);
create index if not exists member_internal_notes_member_idx
  on public.member_internal_notes (member_id, created_at desc);

alter table public.member_internal_notes enable row level security;

drop policy if exists "internal notes read" on public.member_internal_notes;
create policy "internal notes read" on public.member_internal_notes
  for select using (public.org_has_role(organization_id, 'owner', 'manager'));

drop policy if exists "internal notes write" on public.member_internal_notes;
create policy "internal notes write" on public.member_internal_notes
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager'));

-- ---------------------------------------------------------------------------
-- Workout plans
-- ---------------------------------------------------------------------------
create table if not exists public.workout_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(trim(name)) between 2 and 120),
  goal            text,
  description     text,
  is_archived     boolean not null default false,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists workout_plans_org_idx on public.workout_plans (organization_id, is_archived);

create table if not exists public.workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.workout_plans(id) on delete cascade,
  day_label     text,
  exercise_name text not null check (char_length(trim(exercise_name)) > 0),
  sets          integer check (sets is null or sets > 0),
  reps          text,
  rest_seconds  integer check (rest_seconds is null or rest_seconds >= 0),
  instructions  text,
  position      integer not null default 0
);
create index if not exists workout_exercises_plan_idx on public.workout_exercises (plan_id, position);

create table if not exists public.member_workout_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  plan_id         uuid not null,
  trainer_id      uuid,
  assigned_by     uuid references auth.users(id) on delete set null,
  effective_from  date not null default current_date,
  ended_on        date,
  status          text not null default 'active' check (status in ('active','ended')),
  notes           text,
  created_at      timestamptz not null default now(),
  check (ended_on is null or ended_on >= effective_from),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade,
  foreign key (plan_id, organization_id)
    references public.workout_plans (id, organization_id) on delete restrict,
  foreign key (trainer_id, organization_id)
    references public.staff (id, organization_id) on delete set null
);
create index if not exists member_workout_assignments_member_idx
  on public.member_workout_assignments (member_id, effective_from desc);

-- Workout plans gained a tenant key only now; the FK above needs it.
alter table public.workout_plans
  add constraint workout_plans_id_org_key unique (id, organization_id);

alter table public.workout_plans enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.member_workout_assignments enable row level security;

drop policy if exists "workout plans read" on public.workout_plans;
create policy "workout plans read" on public.workout_plans
  for select using (public.is_org_member(organization_id));
drop policy if exists "workout plans write" on public.workout_plans;
create policy "workout plans write" on public.workout_plans
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
drop policy if exists "workout plans update" on public.workout_plans;
create policy "workout plans update" on public.workout_plans
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));

drop policy if exists "workout exercises read" on public.workout_exercises;
create policy "workout exercises read" on public.workout_exercises
  for select using (exists (
    select 1 from public.workout_plans p
    where p.id = plan_id and public.is_org_member(p.organization_id)
  ));
drop policy if exists "workout exercises write" on public.workout_exercises;
create policy "workout exercises write" on public.workout_exercises
  for insert with check (exists (
    select 1 from public.workout_plans p
    where p.id = plan_id
      and public.org_has_role(p.organization_id, 'owner', 'manager', 'trainer')
  ));
drop policy if exists "workout exercises update" on public.workout_exercises;
create policy "workout exercises update" on public.workout_exercises
  for update using (exists (
    select 1 from public.workout_plans p
    where p.id = plan_id
      and public.org_has_role(p.organization_id, 'owner', 'manager', 'trainer')
  ));

drop policy if exists "workout assignments read" on public.member_workout_assignments;
create policy "workout assignments read" on public.member_workout_assignments
  for select using (public.is_org_member(organization_id));
drop policy if exists "workout assignments write" on public.member_workout_assignments;
create policy "workout assignments write" on public.member_workout_assignments
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
drop policy if exists "workout assignments update" on public.member_workout_assignments;
create policy "workout assignments update" on public.member_workout_assignments
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));

-- ---------------------------------------------------------------------------
-- Diet plans
-- ---------------------------------------------------------------------------
create table if not exists public.diet_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(trim(name)) between 2 and 120),
  description     text,
  -- Nullable on purpose: a target the gym did not supply is stored as unknown,
  -- never as an invented number.
  target_calories integer check (target_calories is null or target_calories > 0),
  target_protein_g integer check (target_protein_g is null or target_protein_g >= 0),
  target_carbs_g  integer check (target_carbs_g is null or target_carbs_g >= 0),
  target_fat_g    integer check (target_fat_g is null or target_fat_g >= 0),
  is_archived     boolean not null default false,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists diet_plans_org_idx on public.diet_plans (organization_id, is_archived);

create table if not exists public.diet_meals (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.diet_plans(id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  timing      text,
  coach_notes text,
  position    integer not null default 0
);
create index if not exists diet_meals_plan_idx on public.diet_meals (plan_id, position);

create table if not exists public.diet_meal_items (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.diet_meals(id) on delete cascade,
  food_item  text not null check (char_length(trim(food_item)) > 0),
  portion    text,
  notes      text,
  position   integer not null default 0
);
create index if not exists diet_meal_items_meal_idx on public.diet_meal_items (meal_id, position);

create table if not exists public.member_diet_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  plan_id         uuid not null,
  trainer_id      uuid,
  assigned_by     uuid references auth.users(id) on delete set null,
  effective_from  date not null default current_date,
  ended_on        date,
  status          text not null default 'active' check (status in ('active','ended')),
  notes           text,
  created_at      timestamptz not null default now(),
  check (ended_on is null or ended_on >= effective_from),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade,
  foreign key (trainer_id, organization_id)
    references public.staff (id, organization_id) on delete set null
);
create index if not exists member_diet_assignments_member_idx
  on public.member_diet_assignments (member_id, effective_from desc);

alter table public.diet_plans
  add constraint diet_plans_id_org_key unique (id, organization_id);

alter table public.member_diet_assignments
  add constraint member_diet_assignments_plan_org_fk
  foreign key (plan_id, organization_id)
  references public.diet_plans (id, organization_id) on delete restrict;

alter table public.diet_plans enable row level security;
alter table public.diet_meals enable row level security;
alter table public.diet_meal_items enable row level security;
alter table public.member_diet_assignments enable row level security;

drop policy if exists "diet plans read" on public.diet_plans;
create policy "diet plans read" on public.diet_plans
  for select using (public.is_org_member(organization_id));
drop policy if exists "diet plans write" on public.diet_plans;
create policy "diet plans write" on public.diet_plans
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
drop policy if exists "diet plans update" on public.diet_plans;
create policy "diet plans update" on public.diet_plans
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));

drop policy if exists "diet meals read" on public.diet_meals;
create policy "diet meals read" on public.diet_meals
  for select using (exists (
    select 1 from public.diet_plans p
    where p.id = plan_id and public.is_org_member(p.organization_id)
  ));
drop policy if exists "diet meals write" on public.diet_meals;
create policy "diet meals write" on public.diet_meals
  for insert with check (exists (
    select 1 from public.diet_plans p
    where p.id = plan_id
      and public.org_has_role(p.organization_id, 'owner', 'manager', 'trainer')
  ));
drop policy if exists "diet meals update" on public.diet_meals;
create policy "diet meals update" on public.diet_meals
  for update using (exists (
    select 1 from public.diet_plans p
    where p.id = plan_id
      and public.org_has_role(p.organization_id, 'owner', 'manager', 'trainer')
  ));

drop policy if exists "diet items read" on public.diet_meal_items;
create policy "diet items read" on public.diet_meal_items
  for select using (exists (
    select 1 from public.diet_meals m
    join public.diet_plans p on p.id = m.plan_id
    where m.id = meal_id and public.is_org_member(p.organization_id)
  ));
drop policy if exists "diet items write" on public.diet_meal_items;
create policy "diet items write" on public.diet_meal_items
  for insert with check (exists (
    select 1 from public.diet_meals m
    join public.diet_plans p on p.id = m.plan_id
    where m.id = meal_id
      and public.org_has_role(p.organization_id, 'owner', 'manager', 'trainer')
  ));

drop policy if exists "diet assignments read" on public.member_diet_assignments;
create policy "diet assignments read" on public.member_diet_assignments
  for select using (public.is_org_member(organization_id));
drop policy if exists "diet assignments write" on public.member_diet_assignments;
create policy "diet assignments write" on public.member_diet_assignments
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
drop policy if exists "diet assignments update" on public.member_diet_assignments;
create policy "diet assignments update" on public.member_diet_assignments
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));

-- ---------------------------------------------------------------------------
-- Fitness measurements
-- ---------------------------------------------------------------------------
create table if not exists public.fitness_measurements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  measured_on     date not null default current_date,
  weight_kg       numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 500)),
  height_cm       numeric(5,1) check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  body_fat_pct    numeric(4,1) check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 70)),
  chest_cm        numeric(5,1) check (chest_cm is null or (chest_cm > 0 and chest_cm < 300)),
  waist_cm        numeric(5,1) check (waist_cm is null or (waist_cm > 0 and waist_cm < 300)),
  hips_cm         numeric(5,1) check (hips_cm is null or (hips_cm > 0 and hips_cm < 300)),
  arms_cm         numeric(5,1) check (arms_cm is null or (arms_cm > 0 and arms_cm < 300)),
  thighs_cm       numeric(5,1) check (thighs_cm is null or (thighs_cm > 0 and thighs_cm < 300)),
  notes           text,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- One measurement set per member per day: a second entry is an edit.
  unique (member_id, measured_on),
  check (measured_on <= current_date),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade
);
create index if not exists fitness_measurements_member_idx
  on public.fitness_measurements (member_id, measured_on desc);

alter table public.fitness_measurements enable row level security;

drop policy if exists "measurements read" on public.fitness_measurements;
create policy "measurements read" on public.fitness_measurements
  for select using (public.is_org_member(organization_id));
drop policy if exists "measurements write" on public.fitness_measurements;
create policy "measurements write" on public.fitness_measurements
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer', 'receptionist'));
drop policy if exists "measurements update" on public.fitness_measurements;
create policy "measurements update" on public.fitness_measurements
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));

-- ---------------------------------------------------------------------------
-- Progress photos — private bucket, path must start with the gym id
-- ---------------------------------------------------------------------------
create table if not exists public.member_progress_photos (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null,
  storage_path    text not null,
  taken_on        date not null default current_date,
  notes           text,
  uploaded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (member_id, organization_id)
    references public.members (id, organization_id) on delete cascade
);
create index if not exists member_progress_photos_member_idx
  on public.member_progress_photos (member_id, taken_on desc);

alter table public.member_progress_photos enable row level security;

drop policy if exists "progress photos read" on public.member_progress_photos;
create policy "progress photos read" on public.member_progress_photos
  for select using (public.is_org_member(organization_id));
drop policy if exists "progress photos write" on public.member_progress_photos;
create policy "progress photos write" on public.member_progress_photos
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
drop policy if exists "progress photos delete" on public.member_progress_photos;
create policy "progress photos delete" on public.member_progress_photos
  for delete using (public.org_has_role(organization_id, 'owner', 'manager'));

-- Private bucket. Uploads are namespaced by organization id so the storage
-- policies below can authorize on the first path segment alone.
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;

drop policy if exists "member photos read" on storage.objects;
create policy "member photos read" on storage.objects
  for select using (
    bucket_id = 'member-photos'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "member photos write" on storage.objects;
create policy "member photos write" on storage.objects
  for insert with check (
    bucket_id = 'member-photos'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner', 'manager', 'trainer', 'receptionist')
  );

drop policy if exists "member photos delete" on storage.objects;
create policy "member photos delete" on storage.objects
  for delete using (
    bucket_id = 'member-photos'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner', 'manager')
  );

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid,
  actor_id        uuid references auth.users(id) on delete set null,
  action          text not null,
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists activity_log_org_idx on public.activity_log (organization_id, created_at desc);
create index if not exists activity_log_member_idx on public.activity_log (member_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity read" on public.activity_log;
create policy "activity read" on public.activity_log
  for select using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer', 'receptionist', 'finance'));

-- Writes go through SECURITY DEFINER helpers only; no insert policy on purpose.

create or replace function public.log_activity(
  p_org uuid,
  p_member uuid,
  p_action text,
  p_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_log (organization_id, member_id, actor_id, action, detail)
  values (p_org, p_member, auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb));
$$;

revoke execute on function public.log_activity(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.log_activity(uuid, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- create_member — server-generated member code, duplicate guard, role check
-- ---------------------------------------------------------------------------
create or replace function public.create_member(
  p_organization_id uuid,
  p_first_name text,
  p_last_name text default '',
  p_phone text default null,
  p_email text default null,
  p_date_of_birth date default null,
  p_gender text default null,
  p_address text default null,
  p_emergency_name text default null,
  p_emergency_phone text default null,
  p_joined_on date default null,
  p_trainer_id uuid default null,
  p_photo_url text default null,
  p_fitness_goals text default null,
  p_notes text default null
)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_num integer;
  v_existing public.members;
  v_row public.members;
  v_phone text := nullif(trim(p_phone), '');
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'receptionist') then
    raise exception 'You do not have permission to register members' using errcode = '42501';
  end if;
  if p_first_name is null or char_length(trim(p_first_name)) < 1 then
    raise exception 'A first name is required';
  end if;
  if v_phone is null then
    raise exception 'A phone number is required';
  end if;
  if v_phone !~ '^[0-9+() -]{6,20}$' then
    raise exception 'That phone number does not look right';
  end if;
  if p_email is not null and p_email <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That email address does not look right';
  end if;
  if p_gender is not null and p_gender not in ('male','female','other') then
    raise exception 'Unsupported gender value';
  end if;
  if p_trainer_id is not null and not exists (
    select 1 from public.staff s
    where s.id = p_trainer_id and s.organization_id = p_organization_id
  ) then
    raise exception 'That trainer does not work at this gym';
  end if;
  if p_joined_on is not null and p_joined_on > current_date then
    raise exception 'Joining date cannot be in the future';
  end if;
  if p_date_of_birth is not null and p_date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future';
  end if;

  -- Duplicate guard: same phone, or same email, among members that are not
  -- archived. Archived records are history and stay untouched.
  select * into v_existing from public.members m
  where m.organization_id = p_organization_id
    and m.status <> 'archived'
    and (
      regexp_replace(m.phone, '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
      or (
        nullif(trim(p_email), '') is not null
        and lower(m.email) = lower(trim(p_email))
      )
    )
  limit 1;
  if found then
    raise exception 'A member with this phone or email already exists (% )', v_existing.member_code
      using errcode = '23505';
  end if;

  -- Collision-safe code: the counter row is locked for the duration of the
  -- transaction, so two concurrent registrations can never share a number.
  insert into public.org_member_counters (organization_id, last_number)
  values (p_organization_id, 1)
  on conflict (organization_id)
    do update set last_number = public.org_member_counters.last_number + 1
  returning last_number into v_num;

  v_code := 'M-' || lpad(v_num::text, 4, '0');

  insert into public.members (
    organization_id, member_code, first_name, last_name, email, phone,
    date_of_birth, gender, address, emergency_contact_name,
    emergency_contact_phone, trainer_id, joined_on, photo_url, notes
  ) values (
    p_organization_id, v_code, trim(p_first_name), coalesce(trim(p_last_name), ''),
    nullif(trim(p_email), ''), v_phone, p_date_of_birth, p_gender, p_address,
    p_emergency_name, p_emergency_phone, p_trainer_id,
    coalesce(p_joined_on, current_date), p_photo_url,
    nullif(trim(coalesce(p_notes, '') || case
      when nullif(trim(coalesce(p_fitness_goals, '')), '') is null then ''
      else E'\n\nFitness goals: ' || trim(p_fitness_goals)
    end), '')
  )
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, v_row.id, 'member.created',
    jsonb_build_object('member_code', v_row.member_code)
  );

  return v_row;
end;
$$;

revoke execute on function public.create_member(uuid,text,text,text,text,date,text,text,text,text,date,uuid,text,text,text) from public, anon;
grant execute on function public.create_member(uuid,text,text,text,text,date,text,text,text,text,date,uuid,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- record_attendance — idempotent within a short window
-- ---------------------------------------------------------------------------
-- The open-checkin index from 0001 stops a second entry while someone is
-- still inside. This also collapses an accidental double tap: a second call
-- inside three hours returns the first row instead of writing another.
create or replace function public.record_attendance(
  p_organization_id uuid,
  p_member_id uuid,
  p_branch_id uuid default null
)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.attendance;
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'receptionist', 'trainer') then
    raise exception 'You do not have permission to record attendance' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.organization_id = p_organization_id
  ) then
    raise exception 'That member is not in this gym';
  end if;
  if exists (
    select 1 from public.members m
    where m.id = p_member_id and m.status <> 'active'
  ) then
    raise exception 'This member is not active';
  end if;

  select * into v_row from public.attendance a
  where a.member_id = p_member_id
    and a.check_in > now() - interval '3 hours'
  order by a.check_in desc
  limit 1;
  if found then
    return v_row;
  end if;

  insert into public.attendance (organization_id, branch_id, member_id, method)
  values (p_organization_id, p_branch_id, p_member_id, 'manual')
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, p_member_id, 'attendance.checked_in',
    jsonb_build_object('attendance_id', v_row.id)
  );
  return v_row;
end;
$$;

revoke execute on function public.record_attendance(uuid, uuid, uuid) from public, anon;
grant execute on function public.record_attendance(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- renew_membership — dates only; payments stay separate
-- ---------------------------------------------------------------------------
create or replace function public.renew_membership(
  p_organization_id uuid,
  p_membership_id uuid,
  p_new_end_date date,
  p_amount_minor integer default 0,
  p_note text default null
)
returns public.member_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_memberships;
  v_prev date;
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'receptionist') then
    raise exception 'You do not have permission to renew memberships' using errcode = '42501';
  end if;

  select * into v_row from public.member_memberships mm
  where mm.id = p_membership_id and mm.organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'That membership does not exist in this gym';
  end if;

  v_prev := v_row.end_date;
  if p_new_end_date is null or p_new_end_date <= v_prev then
    raise exception 'The new end date must be after the current one (%)', v_prev;
  end if;

  update public.member_memberships
     set end_date = p_new_end_date,
         status = 'active'
   where id = p_membership_id
   returning * into v_row;

  insert into public.membership_renewals (
    organization_id, membership_id, member_id, previous_end_date,
    new_end_date, extended_days, amount_minor, note, renewed_by
  ) values (
    p_organization_id, p_membership_id, v_row.member_id, v_prev,
    p_new_end_date, (p_new_end_date - v_prev), coalesce(p_amount_minor, 0),
    p_note, auth.uid()
  );

  -- Deliberately does not touch public.payments: extending dates is not a
  -- payment, and a pending invoice stays pending until money is recorded.
  perform public.log_activity(
    p_organization_id, v_row.member_id, 'membership.renewed',
    jsonb_build_object('membership_id', p_membership_id, 'from', v_prev, 'to', p_new_end_date)
  );

  return v_row;
end;
$$;

revoke execute on function public.renew_membership(uuid, uuid, date, integer, text) from public, anon;
grant execute on function public.renew_membership(uuid, uuid, date, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- assign_membership — price and plan name resolved from the plan row
-- ---------------------------------------------------------------------------
create or replace function public.assign_membership(
  p_organization_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date default null
)
returns public.member_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.membership_plans;
  v_row public.member_memberships;
  v_start date := coalesce(p_start_date, current_date);
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'receptionist') then
    raise exception 'You do not have permission to assign memberships' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.organization_id = p_organization_id
  ) then
    raise exception 'That member is not in this gym';
  end if;

  select * into v_plan from public.membership_plans p
  where p.id = p_plan_id and p.organization_id = p_organization_id;
  if not found then
    raise exception 'That plan does not exist in this gym';
  end if;

  insert into public.member_memberships (
    organization_id, member_id, plan_id, plan_name, price_minor,
    start_date, end_date, status
  ) values (
    p_organization_id, p_member_id, v_plan.id, v_plan.name, v_plan.price_minor,
    v_start, v_start + v_plan.duration_days, 'active'
  )
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, p_member_id, 'membership.assigned',
    jsonb_build_object('plan', v_plan.name, 'end_date', v_row.end_date)
  );
  return v_row;
end;
$$;

revoke execute on function public.assign_membership(uuid, uuid, uuid, date) from public, anon;
grant execute on function public.assign_membership(uuid, uuid, uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- assign_workout / assign_diet — end the previous assignment, keep history
-- ---------------------------------------------------------------------------
create or replace function public.assign_workout_plan(
  p_organization_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_trainer_id uuid default null,
  p_effective_from date default null,
  p_notes text default null
)
returns public.member_workout_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_workout_assignments;
  v_start date := coalesce(p_effective_from, current_date);
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'trainer') then
    raise exception 'You do not have permission to assign workout plans' using errcode = '42501';
  end if;

  update public.member_workout_assignments
     set status = 'ended', ended_on = v_start
   where member_id = p_member_id
     and organization_id = p_organization_id
     and status = 'active'
     and ended_on is null;

  insert into public.member_workout_assignments (
    organization_id, member_id, plan_id, trainer_id,
    assigned_by, effective_from, notes
  ) values (
    p_organization_id, p_member_id, p_plan_id, p_trainer_id,
    auth.uid(), v_start, p_notes
  )
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, p_member_id, 'workout.assigned',
    jsonb_build_object('plan_id', p_plan_id)
  );
  return v_row;
end;
$$;

create or replace function public.assign_diet_plan(
  p_organization_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_trainer_id uuid default null,
  p_effective_from date default null,
  p_notes text default null
)
returns public.member_diet_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_diet_assignments;
  v_start date := coalesce(p_effective_from, current_date);
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'trainer') then
    raise exception 'You do not have permission to assign diet plans' using errcode = '42501';
  end if;

  update public.member_diet_assignments
     set status = 'ended', ended_on = v_start
   where member_id = p_member_id
     and organization_id = p_organization_id
     and status = 'active'
     and ended_on is null;

  insert into public.member_diet_assignments (
    organization_id, member_id, plan_id, trainer_id,
    assigned_by, effective_from, notes
  ) values (
    p_organization_id, p_member_id, p_plan_id, p_trainer_id,
    auth.uid(), v_start, p_notes
  )
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, p_member_id, 'diet.assigned',
    jsonb_build_object('plan_id', p_plan_id)
  );
  return v_row;
end;
$$;

revoke execute on function public.assign_workout_plan(uuid, uuid, uuid, uuid, date, text) from public, anon;
grant execute on function public.assign_workout_plan(uuid, uuid, uuid, uuid, date, text) to authenticated;
revoke execute on function public.assign_diet_plan(uuid, uuid, uuid, uuid, date, text) from public, anon;
grant execute on function public.assign_diet_plan(uuid, uuid, uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- record_payment — validates the member/membership pair belongs to the gym
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
  p_organization_id uuid,
  p_member_id uuid,
  p_amount_minor integer,
  p_method text default 'cash',
  p_status text default 'paid',
  p_membership_id uuid default null,
  p_invoice_id uuid default null,
  p_paid_on date default null,
  p_description text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if not public.org_has_role(p_organization_id, 'owner', 'manager', 'receptionist', 'finance') then
    raise exception 'You do not have permission to record payments' using errcode = '42501';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'Enter an amount greater than zero';
  end if;
  if p_method not in ('cash','upi','card','bank_transfer','other') then
    raise exception 'Unsupported payment method';
  end if;
  if p_status not in ('paid','pending','failed','refunded') then
    raise exception 'Unsupported payment status';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.organization_id = p_organization_id
  ) then
    raise exception 'That member is not in this gym';
  end if;
  if p_membership_id is not null and not exists (
    select 1 from public.member_memberships mm
    where mm.id = p_membership_id
      and mm.organization_id = p_organization_id
      and mm.member_id = p_member_id
  ) then
    raise exception 'That membership does not belong to this member';
  end if;
  if p_invoice_id is not null and not exists (
    select 1 from public.invoices i
    where i.id = p_invoice_id
      and i.organization_id = p_organization_id
      and i.member_id = p_member_id
  ) then
    raise exception 'That invoice does not belong to this member';
  end if;

  insert into public.payments (
    organization_id, member_id, membership_id, invoice_id, amount_minor,
    method, status, paid_on, description, recorded_by
  ) values (
    p_organization_id, p_member_id, p_membership_id, p_invoice_id,
    p_amount_minor, p_method, p_status, coalesce(p_paid_on, current_date),
    p_description, auth.uid()
  )
  returning * into v_row;

  perform public.log_activity(
    p_organization_id, p_member_id, 'payment.recorded',
    jsonb_build_object('amount_minor', p_amount_minor, 'status', p_status)
  );
  return v_row;
end;
$$;

revoke execute on function public.record_payment(uuid, uuid, integer, text, text, uuid, uuid, date, text) from public, anon;
grant execute on function public.record_payment(uuid, uuid, integer, text, text, uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Activity log read helper — one page of history for a member
-- ---------------------------------------------------------------------------
create or replace function public.member_activity(p_organization_id uuid, p_member_id uuid, p_limit integer default 50)
returns setof public.activity_log
language sql
security definer
set search_path = public
stable
as $$
  select * from public.activity_log a
  where a.organization_id = p_organization_id
    and a.member_id = p_member_id
    and public.org_has_role(p_organization_id, 'owner', 'manager', 'trainer', 'receptionist', 'finance')
  order by a.created_at desc
  limit least(coalesce(p_limit, 50), 200);
$$;

revoke execute on function public.member_activity(uuid, uuid, integer) from public, anon;
grant execute on function public.member_activity(uuid, uuid, integer) to authenticated;
