-- TwoPlus.fit — 0001_init
-- Multi-tenant foundation: organizations, branches, members, memberships,
-- payments, attendance, enquiries, staff, classes, expenses, notifications.
-- Money is stored in integer minor units (paise). Timestamps are timestamptz.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete restrict,
  name        text not null check (char_length(trim(name)) between 2 and 120),
  phone       text,
  address     text,
  timezone    text not null default 'Asia/Kolkata',
  currency    text not null default 'INR',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner','manager','trainer','receptionist','finance')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.branches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  address         text,
  is_primary      boolean not null default false,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now()
);
create index branches_org_idx on public.branches (organization_id);

create table public.staff (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  branch_id         uuid references public.branches(id) on delete set null,
  user_id           uuid references auth.users(id) on delete set null,
  name              text not null,
  phone             text not null,
  email             text,
  job_role          text not null default 'Trainer',
  employment_status text not null default 'active' check (employment_status in ('active','inactive')),
  joined_on         date not null default current_date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index staff_org_idx on public.staff (organization_id);

create table public.membership_plans (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  description         text,
  duration_days       integer not null check (duration_days > 0),
  price_minor         integer not null check (price_minor >= 0),
  joining_fee_minor   integer not null default 0 check (joining_fee_minor >= 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, name)
);
create index membership_plans_org_idx on public.membership_plans (organization_id);

create table public.members (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  member_code             text not null,
  first_name              text not null,
  last_name               text not null default '',
  email                   text,
  phone                   text not null,
  date_of_birth           date,
  gender                  text check (gender in ('male','female','other')),
  address                 text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  trainer_id              uuid references public.staff(id) on delete set null,
  status                  text not null default 'active' check (status in ('active','suspended','archived')),
  notes                   text,
  joined_on               date not null default current_date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (organization_id, member_code)
);
create index members_org_status_idx on public.members (organization_id, status);
create index members_org_name_idx on public.members (organization_id, lower(first_name || ' ' || last_name));
create index members_org_phone_idx on public.members (organization_id, phone);

create table public.member_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  plan_id         uuid references public.membership_plans(id) on delete set null,
  plan_name       text not null,
  status          text not null default 'active' check (status in ('scheduled','active','expired','frozen','cancelled')),
  start_date      date not null,
  end_date        date not null,
  price_minor     integer not null check (price_minor >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_date >= start_date)
);
create index member_memberships_org_idx on public.member_memberships (organization_id, status);
create index member_memberships_member_idx on public.member_memberships (member_id);
create index member_memberships_expiry_idx on public.member_memberships (organization_id, end_date);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  membership_id   uuid references public.member_memberships(id) on delete set null,
  amount_minor    integer not null check (amount_minor > 0),
  currency        text not null default 'INR',
  method          text not null default 'cash' check (method in ('cash','upi','card','bank_transfer','other')),
  status          text not null default 'paid' check (status in ('paid','pending','failed','refunded')),
  paid_on         date not null default current_date,
  description     text,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index payments_org_date_idx on public.payments (organization_id, paid_on);
create index payments_org_status_idx on public.payments (organization_id, status);
create index payments_member_idx on public.payments (member_id);

create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  member_id       uuid not null references public.members(id) on delete cascade,
  check_in        timestamptz not null default now(),
  check_out       timestamptz,
  method          text not null default 'manual' check (method in ('manual','self','turnstile','other')),
  created_at      timestamptz not null default now(),
  check (check_out is null or check_out >= check_in)
);
create index attendance_org_date_idx on public.attendance (organization_id, check_in);
create index attendance_member_idx on public.attendance (member_id);
-- One open check-in per member at a time (duplicate check-in prevention)
create unique index attendance_open_checkin_idx on public.attendance (member_id) where check_out is null;

create table public.enquiries (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  phone               text not null,
  email               text,
  interest            text,
  source              text not null default 'walk_in' check (source in ('walk_in','referral','social','website','phone','other')),
  status              text not null default 'new' check (status in ('new','contacted','follow_up','converted','lost')),
  follow_up_date      date,
  notes               text,
  converted_member_id uuid references public.members(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index enquiries_org_status_idx on public.enquiries (organization_id, status);
create index enquiries_org_followup_idx on public.enquiries (organization_id, follow_up_date);

create table public.classes (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  branch_id         uuid references public.branches(id) on delete set null,
  name              text not null,
  trainer_id        uuid references public.staff(id) on delete set null,
  starts_at         timestamptz not null,
  duration_minutes  integer not null default 60 check (duration_minutes > 0),
  capacity          integer not null check (capacity > 0),
  status            text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index classes_org_start_idx on public.classes (organization_id, starts_at);

create table public.class_bookings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  class_id        uuid not null references public.classes(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  status          text not null default 'booked' check (status in ('booked','cancelled','attended')),
  created_at      timestamptz not null default now(),
  unique (class_id, member_id)
);
create index class_bookings_org_idx on public.class_bookings (organization_id);
create index class_bookings_member_idx on public.class_bookings (member_id);

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  category        text not null,
  description     text,
  amount_minor    integer not null check (amount_minor > 0),
  expense_date    date not null default current_date,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index expenses_org_date_idx on public.expenses (organization_id, expense_date);

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  body            text,
  type            text not null default 'info' check (type in ('info','warning','success','task')),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();
create trigger membership_plans_updated_at before update on public.membership_plans
  for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger member_memberships_updated_at before update on public.member_memberships
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();
create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Signup: create a profile row for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Onboarding RPC: retry-safe, duplicate-proof organization creation.
-- The role 'owner' is granted here, server-side, based on auth.uid() — never
-- taken from client input.
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_timezone text default 'Asia/Kolkata',
  p_branch_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Gym name must be at least 2 characters';
  end if;

  -- Resume interrupted onboarding: return the org this user already owns.
  select id into v_org from public.organizations where owner_id = v_uid limit 1;
  if v_org is not null then
    return v_org;
  end if;

  insert into public.organizations (owner_id, name, phone, address, timezone)
  values (v_uid, trim(p_name), p_phone, p_address, coalesce(p_timezone, 'Asia/Kolkata'))
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org, v_uid, 'owner');

  insert into public.branches (organization_id, name, is_primary)
  values (
    v_org,
    case when p_branch_name is not null and length(trim(p_branch_name)) > 0
         then trim(p_branch_name)
         else 'Main branch' end,
    true
  );

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so RLS policies can check membership without
-- recursing into organization_members' own policies). Defined after the
-- tables because SQL function bodies are validated at creation time.
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select m.role from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid();
$$;

create or replace function public.org_has_role(org uuid, variadic roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.branches enable row level security;
alter table public.staff enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.member_memberships enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.enquiries enable row level security;
alter table public.classes enable row level security;
alter table public.class_bookings enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;

-- profiles: users manage their own row
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations: members read; owner created via RPC only (no client insert policy)
create policy "org read member" on public.organizations
  for select using (public.is_org_member(id));
create policy "org update owner" on public.organizations
  for update using (public.org_has_role(id, 'owner'))
  with check (public.org_has_role(id, 'owner'));

-- organization_members: self + owner/manager visibility; joining/role grants
-- happen only through the RPC or owner invitation flows
create policy "orgmember read" on public.organization_members
  for select using (
    user_id = auth.uid()
    or public.org_has_role(organization_id, 'owner', 'manager')
  );
create policy "orgmember insert self owner" on public.organization_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );
create policy "orgmember update owner" on public.organization_members
  for update using (public.org_has_role(organization_id, 'owner'))
  with check (public.org_has_role(organization_id, 'owner'));
create policy "orgmember leave" on public.organization_members
  for delete using (
    user_id = auth.uid()
    or public.org_has_role(organization_id, 'owner')
  );

-- branches
create policy "branch read" on public.branches
  for select using (public.is_org_member(organization_id));
create policy "branch write owner manager" on public.branches
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager'));
create policy "branch update owner manager" on public.branches
  for update using (public.org_has_role(organization_id, 'owner', 'manager'))
  with check (public.org_has_role(organization_id, 'owner', 'manager'));

-- staff
create policy "staff read" on public.staff
  for select using (public.is_org_member(organization_id));
create policy "staff write owner manager" on public.staff
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager'));
create policy "staff update owner manager" on public.staff
  for update using (public.org_has_role(organization_id, 'owner', 'manager'))
  with check (public.org_has_role(organization_id, 'owner', 'manager'));
create policy "staff delete owner" on public.staff
  for delete using (public.org_has_role(organization_id, 'owner'));

-- membership_plans
create policy "plans read" on public.membership_plans
  for select using (public.is_org_member(organization_id));
create policy "plans write owner manager" on public.membership_plans
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager'));
create policy "plans update owner manager" on public.membership_plans
  for update using (public.org_has_role(organization_id, 'owner', 'manager'))
  with check (public.org_has_role(organization_id, 'owner', 'manager'));

-- members
create policy "members read" on public.members
  for select using (public.is_org_member(organization_id));
create policy "members write" on public.members
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));
create policy "members update" on public.members
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));

-- member_memberships
create policy "memberships read" on public.member_memberships
  for select using (public.is_org_member(organization_id));
create policy "memberships write" on public.member_memberships
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));
create policy "memberships update" on public.member_memberships
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));

-- payments: finance role also writes
create policy "payments read" on public.payments
  for select using (public.is_org_member(organization_id));
create policy "payments write" on public.payments
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist', 'finance'));
create policy "payments update" on public.payments
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'finance'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'finance'));

-- attendance
create policy "attendance read" on public.attendance
  for select using (public.is_org_member(organization_id));
create policy "attendance write" on public.attendance
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist', 'trainer'));
create policy "attendance update" on public.attendance
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));

-- enquiries
create policy "enquiries read" on public.enquiries
  for select using (public.is_org_member(organization_id));
create policy "enquiries write" on public.enquiries
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));
create policy "enquiries update" on public.enquiries
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist'));

-- classes & bookings
create policy "classes read" on public.classes
  for select using (public.is_org_member(organization_id));
create policy "classes write" on public.classes
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
create policy "classes update" on public.classes
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'trainer'));
create policy "bookings read" on public.class_bookings
  for select using (public.is_org_member(organization_id));
create policy "bookings write" on public.class_bookings
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist', 'trainer'));
create policy "bookings update" on public.class_bookings
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist', 'trainer'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'receptionist', 'trainer'));

-- expenses
create policy "expenses read" on public.expenses
  for select using (public.is_org_member(organization_id));
create policy "expenses write" on public.expenses
  for insert with check (public.org_has_role(organization_id, 'owner', 'manager', 'finance'));
create policy "expenses update" on public.expenses
  for update using (public.org_has_role(organization_id, 'owner', 'manager', 'finance'))
  with check (public.org_has_role(organization_id, 'owner', 'manager', 'finance'));

-- notifications: own rows only
create policy "notifications read own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications update own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
