-- TwoPlus.fit — 0002_platform_admin
-- Platform (Super Admin) layer: platform roles, platform plans,
-- org subscriptions, invoices, verified payments, audit log, support tickets.
--
-- Security model:
--   * Tenant RLS policies from 0001 are NOT modified. All cross-tenant
--     admin access goes through SECURITY DEFINER functions that assert
--     is_platform_admin() internally.
--   * platform_admins has RLS enabled with no policies: even an admin
--     cannot read it directly through PostgREST.
--   * Suspension is enforced in org_has_role(): every write policy in
--     0001 flows through it, so suspended/cancelled organizations become
--     read-only without touching a single policy. Reads (is_org_member)
--     stay open so gym data is preserved and visible.
--   * Money is integer minor units; timestamps are timestamptz.

-- ---------------------------------------------------------------------------
-- 1. Organization lifecycle status
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column status text not null default 'active'
    check (status in ('active','trial','suspended','cancelled'));

create index organizations_status_idx on public.organizations (status);

-- ---------------------------------------------------------------------------
-- 2. Platform admin roles. RLS on, NO policies: the only access path is
--    SECURITY DEFINER helpers below. Rows are inserted exclusively by
--    promote_to_platform_admin() (SQL editor / CLI) — no public signup.
-- ---------------------------------------------------------------------------

create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role = 'super_admin'),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Platform plans — what gyms subscribe to. Separate from gym-side
--    membership_plans (those are the gym's own product).
-- ---------------------------------------------------------------------------

create table public.platform_plans (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  price_minor       integer not null check (price_minor >= 0),
  currency         text not null default 'INR',
  billing_interval text not null check (billing_interval in ('monthly','quarterly','annual')),
  trial_days       integer not null default 14 check (trial_days >= 0),
  status           text not null default 'active' check (status in ('active','retired')),
  feature_limits   jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.platform_plans enable row level security;

-- ---------------------------------------------------------------------------
-- 4. One subscription per organization.
--    State machine: trialing --(verified payment on invoice)--> active;
--    active --(open invoice past due, set manually/monitoring)--> past_due;
--    any --(admin)--> cancelled. A subscription only reaches 'active'
--    after a verified payment, so MRR over status='active' is paid MRR.
-- ---------------------------------------------------------------------------

create table public.org_subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null unique references public.organizations(id) on delete cascade,
  plan_id              uuid not null references public.platform_plans(id) on delete restrict,
  status               text not null default 'trialing'
                         check (status in ('trialing','active','past_due','cancelled','expired')),
  started_at           timestamptz not null default now(),
  trial_ends_at        timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.org_subscriptions enable row level security;
create index org_subscriptions_status_idx on public.org_subscriptions (status);

-- ---------------------------------------------------------------------------
-- 5. Invoices and platform-side payments. Payments are only marked
--    'verified' by admin_record_subscription_payment(); non-manual
--    providers are rejected until a real gateway webhook exists —
--    we never pretend a payment succeeded.
-- ---------------------------------------------------------------------------

create table public.subscription_invoices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.org_subscriptions(id) on delete cascade,
  amount_minor    integer not null check (amount_minor > 0),
  currency        text not null default 'INR',
  status          text not null default 'open' check (status in ('open','paid','void')),
  period_start    date not null,
  period_end      date not null,
  due_at          date not null,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (period_end >= period_start)
);

alter table public.subscription_invoices enable row level security;
create index subscription_invoices_org_idx on public.subscription_invoices (organization_id, status);
create index subscription_invoices_due_idx on public.subscription_invoices (due_at) where status = 'open';

create table public.subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id      uuid not null references public.subscription_invoices(id) on delete cascade,
  amount_minor    integer not null check (amount_minor > 0),
  currency        text not null default 'INR',
  provider        text not null default 'manual' check (provider in ('manual','razorpay','stripe')),
  provider_ref    text,
  status          text not null default 'pending' check (status in ('pending','verified','failed')),
  verified_at     timestamptz,
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Admin audit log — actor, action, target, timestamp, metadata.
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email   text,
  action        text not null,
  target_type   text not null,
  target_id     uuid,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

-- ---------------------------------------------------------------------------
-- 7. Support tickets (platform-side support management per organization)
-- ---------------------------------------------------------------------------

create table public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject         text not null,
  body            text,
  status          text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
create index support_tickets_org_idx on public.support_tickets (organization_id, status);

-- updated_at maintenance (set_updated_at exists from 0001)

create trigger platform_plans_updated_at before update on public.platform_plans
  for each row execute function public.set_updated_at();
create trigger org_subscriptions_updated_at before update on public.org_subscriptions
  for each row execute function public.set_updated_at();
create trigger subscription_invoices_updated_at before update on public.subscription_invoices
  for each row execute function public.set_updated_at();
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Platform admin helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.platform_admins p where p.user_id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.platform_admin_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select p.role from public.platform_admins p where p.user_id = auth.uid();
$$;

-- Audit writer. SECURITY DEFINER so it works from inside admin functions;
-- executable only by those functions (revoked from API roles below).
create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_log (actor_user_id, actor_email, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'system'),
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_admin_action(text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. Suspension enforcement (single choke point).
--    Every write policy in 0001 calls org_has_role(); requiring an
--    active/trial organization here makes suspended and cancelled gyms
--    read-only everywhere at once. No tenant policy is modified.
-- ---------------------------------------------------------------------------

create or replace function public.org_has_role(org uuid, variadic roles text[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role = any(roles)
      and o.status in ('active','trial')
  );
$$;

-- ---------------------------------------------------------------------------
-- 10. Bootstrap: grant platform role. SQL-editor / CLI only — PostgREST
--     always sets the `role` GUC (anon/authenticated/service_role), so the
--     API path is rejected before anything else runs. Revoked from API
--     roles entirely as a second layer.
-- ---------------------------------------------------------------------------

create or replace function public.promote_to_platform_admin(p_email text, p_role text default 'super_admin')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_setting text;
begin
  v_setting := coalesce(nullif(current_setting('role', true), ''), 'postgres');
  if v_setting in ('anon','authenticated','service_role')
     or current_setting('request.jwt.claims', true) is not null then
    raise exception 'promote_to_platform_admin may only be run from the SQL editor or CLI'
      using errcode = '42501';
  end if;
  if p_role <> 'super_admin' then
    raise exception 'Only the super_admin platform role can be granted';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No user with email %. The account must sign up first.', p_email;
  end if;
  insert into public.platform_admins (user_id, role, granted_by)
  values (v_uid, p_role, null)
  on conflict (user_id) do update set role = excluded.role;
  insert into public.admin_audit_log (actor_user_id, actor_email, action, target_type, target_id, metadata)
  values (v_uid, lower(trim(p_email)), 'platform_admin.granted', 'user', v_uid,
          jsonb_build_object('role', p_role));
end;
$$;

revoke execute on function public.promote_to_platform_admin(text, text)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11. Onboarding creates trial organizations (self-serve gyms start on
--     platform trial; first verified payment moves them to 'active').
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
set search_path = ''
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

  insert into public.organizations (owner_id, name, phone, address, timezone, status)
  values (v_uid, trim(p_name), p_phone, p_address, coalesce(p_timezone, 'Asia/Kolkata'), 'trial')
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
-- 12. Plan entitlement: enforce max_members on new member inserts when the
--     organization's plan defines a limit. SECURITY DEFINER so the limit is
--     readable despite platform tables having no tenant policies.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_member_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select (pl.feature_limits ->> 'max_members')::integer into v_limit
  from public.org_subscriptions s
  join public.platform_plans pl on pl.id = s.plan_id
  where s.organization_id = new.organization_id
    and s.status in ('trialing','active','past_due')
  limit 1;

  if v_limit is not null then
    select count(*) into v_count
    from public.members
    where organization_id = new.organization_id and status <> 'archived';
    if v_count >= v_limit then
      raise exception 'Plan limit reached: this plan allows % members', v_limit
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger members_plan_limit
  before insert on public.members
  for each row execute function public.enforce_member_plan_limit();

-- ---------------------------------------------------------------------------
-- 13. Admin RPC: platform metrics (all real, computed from these tables)
-- ---------------------------------------------------------------------------

create or replace function public.admin_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_orgs', (select count(*) from public.organizations),
    'orgs_by_status', coalesce(
      (select jsonb_object_agg(status, cnt)
         from (select status, count(*)::integer as cnt from public.organizations group by status) s),
      '{}'::jsonb),
    'total_members', (select count(*) from public.members),
    'active_members', (select count(*) from public.members where status = 'active'),
    'active_subscriptions', (select count(*) from public.org_subscriptions where status = 'active'),
    'trialing_subscriptions', (select count(*) from public.org_subscriptions where status = 'trialing'),
    -- MRR from active (i.e. payment-verified) subscriptions, normalized to month
    'mrr_minor', coalesce(
      (select sum(
          case p.billing_interval
            when 'monthly' then p.price_minor
            when 'quarterly' then round(p.price_minor / 3.0)::integer
            else round(p.price_minor / 12.0)::integer
          end)
       from public.org_subscriptions s
       join public.platform_plans p on p.id = s.plan_id
       where s.status = 'active'),
      0),
    'verified_revenue_minor', coalesce(
      (select sum(amount_minor) from public.subscription_payments where status = 'verified'), 0),
    'failed_payments_30d', (
      select count(*) from public.subscription_payments
      where status = 'failed' and created_at >= now() - interval '30 days'),
    'overdue_invoices', (
      select count(*) from public.subscription_invoices
      where status = 'open' and due_at < current_date),
    'renewals_due_14d', (
      select count(*) from public.org_subscriptions
      where status = 'active' and current_period_end <= now() + interval '14 days'),
    'trials_ending_14d', (
      select count(*) from public.org_subscriptions
      where status = 'trialing' and trial_ends_at <= now() + interval '14 days'),
    'new_orgs_7d', (
      select count(*) from public.organizations where created_at >= now() - interval '7 days'),
    'support_open', (
      select count(*) from public.support_tickets where status <> 'resolved'),
    'recent_orgs', coalesce(
      (select jsonb_agg(x order by x->>'created_at' desc) from (
         select jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status,
                                   'created_at', o.created_at) as x
         from public.organizations o
         order by o.created_at desc
         limit 5) t),
      '[]'::jsonb),
    'recent_activity', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'action', a.action, 'target_type', a.target_type, 'target_id', a.target_id,
                'actor_email', a.actor_email, 'metadata', a.metadata, 'created_at', a.created_at)
              order by a.created_at desc)
       from (select * from public.admin_audit_log order by created_at desc limit 8) a),
      '[]'::jsonb),
    'health', jsonb_build_object(
      'server_time', now(),
      'database_version', version(),
      'error_monitoring', 'not configured')
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Admin RPC: organization list with search / status filter / pagination
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_organizations(
  p_search text default null,
  p_status text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('active','trial','suspended','cancelled') then
    raise exception 'Invalid status %', p_status;
  end if;

  select count(*)::integer into v_total
  from public.organizations o
  left join auth.users u on u.id = o.owner_id
  where (p_status is null or o.status = p_status)
    and (p_search is null or length(trim(p_search)) = 0
         or o.name ilike '%' || trim(p_search) || '%'
         or u.email ilike '%' || trim(p_search) || '%');

  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'status', o.status,
      'phone', o.phone,
      'created_at', o.created_at,
      'owner_id', o.owner_id,
      'owner_email', u.email,
      'owner_name', coalesce(pr.full_name, ''),
      'member_count', (select count(*) from public.members m where m.organization_id = o.id),
      'branch_count', (select count(*) from public.branches b where b.organization_id = o.id),
      'plan_name', pl.name,
      'sub_status', s.status,
      'period_end', s.current_period_end,
      'trial_ends_at', s.trial_ends_at
    ) as r
    from public.organizations o
    left join auth.users u on u.id = o.owner_id
    left join public.profiles pr on pr.id = o.owner_id
    left join public.org_subscriptions s on s.organization_id = o.id
    left join public.platform_plans pl on pl.id = s.plan_id
    where (p_status is null or o.status = p_status)
      and (p_search is null or length(trim(p_search)) = 0
           or o.name ilike '%' || trim(p_search) || '%'
           or u.email ilike '%' || trim(p_search) || '%')
    order by o.created_at desc
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Admin RPC: full detail for one organization
-- ---------------------------------------------------------------------------

create or replace function public.admin_org_details(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'status', o.status,
    'phone', o.phone,
    'address', o.address,
    'timezone', o.timezone,
    'currency', o.currency,
    'created_at', o.created_at,
    'owner_id', o.owner_id,
    'owner_email', u.email,
    'owner_name', coalesce(pr.full_name, ''),
    'member_count', (select count(*) from public.members m where m.organization_id = o.id),
    'active_member_count', (select count(*) from public.members m
                             where m.organization_id = o.id and m.status = 'active'),
    'branch_count', (select count(*) from public.branches b where b.organization_id = o.id),
    'staff_count', (select count(*) from public.staff st where st.organization_id = o.id),
    'gym_payment_count', (select count(*) from public.payments pay where pay.organization_id = o.id),
    'gym_revenue_minor', coalesce(
      (select sum(amount_minor) from public.payments pay
       where pay.organization_id = o.id and pay.status = 'paid'), 0),
    'branches', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', b.id, 'name', b.name, 'is_primary', b.is_primary,
                'is_archived', b.is_archived, 'created_at', b.created_at)
              order by b.is_primary desc, b.created_at)
       from public.branches b where b.organization_id = o.id),
      '[]'::jsonb),
    'subscription', (
      select jsonb_build_object(
        'id', s.id,
        'status', s.status,
        'started_at', s.started_at,
        'trial_ends_at', s.trial_ends_at,
        'current_period_start', s.current_period_start,
        'current_period_end', s.current_period_end,
        'cancelled_at', s.cancelled_at,
        'plan_id', pl.id,
        'plan_code', pl.code,
        'plan_name', pl.name,
        'price_minor', pl.price_minor,
        'currency', pl.currency,
        'billing_interval', pl.billing_interval,
        'trial_days', pl.trial_days,
        'feature_limits', pl.feature_limits
      )
      from public.org_subscriptions s
      join public.platform_plans pl on pl.id = s.plan_id
      where s.organization_id = o.id
    ),
    'invoices', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', i.id, 'amount_minor', i.amount_minor, 'status', i.status,
                'period_start', i.period_start, 'period_end', i.period_end,
                'due_at', i.due_at, 'paid_at', i.paid_at, 'created_at', i.created_at)
              order by i.created_at desc)
       from public.subscription_invoices i where i.organization_id = o.id),
      '[]'::jsonb),
    'tickets', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', t.id, 'subject', t.subject, 'status', t.status,
                'created_at', t.created_at, 'updated_at', t.updated_at)
              order by t.updated_at desc)
       from public.support_tickets t where t.organization_id = o.id),
      '[]'::jsonb),
    'recent_audit', coalesce(
      (select jsonb_agg(x) from (
         select jsonb_build_object(
                  'action', a.action, 'actor_email', a.actor_email,
                  'metadata', a.metadata, 'created_at', a.created_at) as x
         from public.admin_audit_log a
         where a.target_type = 'organization' and a.target_id = o.id
         order by a.created_at desc
         limit 10) t),
      '[]'::jsonb)
  ) into v_org
  from public.organizations o
  left join auth.users u on u.id = o.owner_id
  left join public.profiles pr on pr.id = o.owner_id
  where o.id = p_org_id;

  if v_org is null then
    raise exception 'Organization not found';
  end if;
  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. Admin RPC: provision an organization for an existing user account
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_organization(
  p_owner_email text,
  p_name text,
  p_phone text default null,
  p_branch_name text default null,
  p_plan_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_org uuid;
  v_plan public.platform_plans%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Gym name must be at least 2 characters';
  end if;

  select id into v_owner
  from auth.users
  where lower(email) = lower(trim(coalesce(p_owner_email, '')));
  if v_owner is null then
    raise exception 'No user with email %. The gym owner must sign up first, then retry.',
      p_owner_email;
  end if;
  if exists (select 1 from public.organizations where owner_id = v_owner) then
    raise exception 'That user already owns an organization';
  end if;

  insert into public.organizations (owner_id, name, phone, status)
  values (v_owner, trim(p_name), p_phone, 'trial')
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org, v_owner, 'owner');

  insert into public.branches (organization_id, name, is_primary)
  values (
    v_org,
    case when p_branch_name is not null and length(trim(p_branch_name)) > 0
         then trim(p_branch_name) else 'Main branch' end,
    true
  );

  if p_plan_code is not null then
    select * into v_plan from public.platform_plans
    where code = p_plan_code and status = 'active';
    if not found then
      raise exception 'Unknown or retired plan code %', p_plan_code;
    end if;
    insert into public.org_subscriptions (organization_id, plan_id, status, trial_ends_at)
    values (v_org, v_plan.id, 'trialing',
            now() + make_interval(days => v_plan.trial_days));
  end if;

  perform public.log_admin_action('organization.created', 'organization', v_org,
    jsonb_build_object('name', trim(p_name),
                       'owner_email', lower(trim(coalesce(p_owner_email, ''))),
                       'plan_code', p_plan_code));

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17. Admin RPC: suspend / reactivate / cancel (status change + audit).
--     Suspension never deletes data — it only flips this status column,
--     which org_has_role() consults to block writes.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_organization_status(
  p_org_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status not in ('active','trial','suspended','cancelled') then
    raise exception 'Invalid status %', p_status;
  end if;

  select status into v_prev from public.organizations where id = p_org_id;
  if v_prev is null then
    raise exception 'Organization not found';
  end if;
  if v_prev = p_status then
    return;
  end if;

  update public.organizations set status = p_status where id = p_org_id;

  perform public.log_admin_action('organization.status.' || p_status, 'organization', p_org_id,
    jsonb_build_object('previous', v_prev, 'reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- 18. Admin RPC: assign / replace a gym's platform subscription
-- ---------------------------------------------------------------------------

create or replace function public.admin_assign_subscription(
  p_org_id uuid,
  p_plan_code text,
  p_trial_days integer default null  -- null = plan default, 0 = no trial (invoice now)
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.platform_plans%rowtype;
  v_sub uuid;
  v_trial integer;
  v_end date;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'Organization not found';
  end if;
  select * into v_plan from public.platform_plans
  where code = p_plan_code and status = 'active';
  if not found then
    raise exception 'Unknown or retired plan code %', p_plan_code;
  end if;
  if p_trial_days is not null and p_trial_days < 0 then
    raise exception 'Trial days cannot be negative';
  end if;
  v_trial := coalesce(p_trial_days, v_plan.trial_days);

  -- Update in place (never delete): invoice history must survive re-assignment.
  insert into public.org_subscriptions
    (organization_id, plan_id, status, trial_ends_at, started_at, cancelled_at,
     current_period_start, current_period_end)
  values (
    p_org_id,
    v_plan.id,
    case when v_trial > 0 then 'trialing' else 'past_due' end,
    case when v_trial > 0 then now() + make_interval(days => v_trial) end,
    now(),
    null,
    null,
    null
  )
  on conflict (organization_id) do update
    set plan_id = excluded.plan_id,
        status = excluded.status,
        trial_ends_at = excluded.trial_ends_at,
        started_at = now(),
        cancelled_at = null,
        current_period_start = null,
        current_period_end = null
  returning id into v_sub;

  -- No trial: open the first invoice immediately so billing starts now.
  if v_trial = 0 then
    v_end := (current_date + case v_plan.billing_interval
                              when 'monthly' then interval '1 month'
                              when 'quarterly' then interval '3 months'
                              else interval '1 year'
                            end)::date;
    insert into public.subscription_invoices
      (organization_id, subscription_id, amount_minor, currency,
       period_start, period_end, due_at)
    values (p_org_id, v_sub, v_plan.price_minor, v_plan.currency,
            current_date, v_end, current_date + 7);
  end if;

  perform public.log_admin_action('subscription.assigned', 'organization', p_org_id,
    jsonb_build_object('plan_code', p_plan_code, 'trial_days', v_trial,
                       'subscription_id', v_sub));

  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------------
-- 19. Admin RPC: generate a renewal invoice for the next billing period
-- ---------------------------------------------------------------------------

create or replace function public.admin_generate_invoice(p_subscription_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub record;
  v_start date;
  v_end date;
  v_invoice uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select s.id, s.organization_id, s.status, s.current_period_end,
         p.price_minor, p.currency, p.billing_interval
    into v_sub
  from public.org_subscriptions s
  join public.platform_plans p on p.id = s.plan_id
  where s.id = p_subscription_id;
  if not found then
    raise exception 'Subscription not found';
  end if;
  if v_sub.status = 'cancelled' then
    raise exception 'Cannot invoice a cancelled subscription';
  end if;
  if exists (select 1 from public.subscription_invoices
             where subscription_id = v_sub.id and status = 'open') then
    raise exception 'An open invoice already exists for this subscription';
  end if;

  v_start := coalesce(v_sub.current_period_end::date, current_date);
  if v_start < current_date then
    v_start := current_date; -- never back-date a renewal period
  end if;
  v_end := (v_start + case v_sub.billing_interval
                       when 'monthly' then interval '1 month'
                       when 'quarterly' then interval '3 months'
                       else interval '1 year'
                     end)::date;

  insert into public.subscription_invoices
    (organization_id, subscription_id, amount_minor, currency,
     period_start, period_end, due_at)
  values (v_sub.organization_id, v_sub.id, v_sub.price_minor, v_sub.currency,
          v_start, v_end, current_date + 7)
  returning id into v_invoice;

  perform public.log_admin_action('subscription.invoice_generated', 'organization',
    v_sub.organization_id,
    jsonb_build_object('invoice_id', v_invoice, 'amount_minor', v_sub.price_minor,
                       'period_start', v_start, 'period_end', v_end));

  return v_invoice;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20. Admin RPC: record a payment and mark it verified (server-side).
--     Only provider='manual' is accepted: no gateway webhook exists yet,
--     so any other provider would be a fake verification. Manual entries
--     are admin attestation and are labelled as such in the UI.
-- ---------------------------------------------------------------------------

create or replace function public.admin_record_subscription_payment(
  p_invoice_id uuid,
  p_provider text default 'manual',
  p_provider_ref text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv record;
  v_payment uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if coalesce(p_provider, 'manual') <> 'manual' then
    raise exception 'No payment provider is configured; only manual attestation is available';
  end if;

  select i.id, i.organization_id, i.subscription_id, i.amount_minor, i.currency,
         i.status, i.period_start, i.period_end
    into v_inv
  from public.subscription_invoices i
  where i.id = p_invoice_id
  for update;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if v_inv.status = 'paid' then
    raise exception 'Invoice is already paid';
  end if;
  if v_inv.status = 'void' then
    raise exception 'Cannot pay a void invoice';
  end if;

  insert into public.subscription_payments
    (organization_id, invoice_id, amount_minor, currency, provider, provider_ref,
     status, verified_at, recorded_by)
  values (v_inv.organization_id, v_inv.id, v_inv.amount_minor, v_inv.currency,
          'manual', p_provider_ref, 'verified', now(), auth.uid())
  returning id into v_payment;

  update public.subscription_invoices
    set status = 'paid', paid_at = now()
    where id = v_inv.id;

  -- Activate the subscription for the invoiced period.
  update public.org_subscriptions
    set status = 'active',
        current_period_start = v_inv.period_start::timestamptz,
        current_period_end = v_inv.period_end::timestamptz,
        trial_ends_at = null,
        cancelled_at = null
    where id = v_inv.subscription_id;

  -- First verified payment moves the gym from trial to active.
  update public.organizations
    set status = 'active'
    where id = v_inv.organization_id and status = 'trial';

  perform public.log_admin_action('subscription.payment_verified', 'organization',
    v_inv.organization_id,
    jsonb_build_object('invoice_id', v_inv.id, 'payment_id', v_payment,
                       'amount_minor', v_inv.amount_minor, 'provider_ref', p_provider_ref));

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- 21. Admin RPC: cancel a subscription (voids open invoices, keeps history)
-- ---------------------------------------------------------------------------

create or replace function public.admin_cancel_subscription(
  p_subscription_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub record;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select id, organization_id, status into v_sub
  from public.org_subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'Subscription not found';
  end if;
  if v_sub.status = 'cancelled' then
    return;
  end if;

  update public.org_subscriptions
    set status = 'cancelled', cancelled_at = now()
    where id = p_subscription_id;

  update public.subscription_invoices
    set status = 'void'
    where subscription_id = p_subscription_id and status = 'open';

  perform public.log_admin_action('subscription.cancelled', 'organization',
    v_sub.organization_id,
    jsonb_build_object('subscription_id', p_subscription_id, 'reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- 22. Admin RPC: platform plans CRUD
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_plans()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(r order by r->>'created_at'), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', p.id, 'code', p.code, 'name', p.name,
      'price_minor', p.price_minor, 'currency', p.currency,
      'billing_interval', p.billing_interval, 'trial_days', p.trial_days,
      'status', p.status, 'feature_limits', p.feature_limits,
      'created_at', p.created_at,
      'subscriber_count', (
        select count(*) from public.org_subscriptions s
        where s.plan_id = p.id and s.status in ('trialing','active','past_due'))
    ) as r
    from public.platform_plans p
  ) t;

  return v_rows;
end;
$$;

create or replace function public.admin_upsert_plan(
  p_id uuid default null,
  p_code text default null,
  p_name text default null,
  p_price_minor integer default 0,
  p_currency text default 'INR',
  p_billing_interval text default 'monthly',
  p_trial_days integer default 14,
  p_status text default 'active',
  p_feature_limits jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  v_code := lower(trim(coalesce(p_code, '')));
  if length(v_code) < 2 then
    raise exception 'Plan code must be at least 2 characters';
  end if;
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Plan name must be at least 2 characters';
  end if;
  if coalesce(p_price_minor, 0) < 0 then
    raise exception 'Price cannot be negative';
  end if;
  if p_billing_interval not in ('monthly','quarterly','annual') then
    raise exception 'Invalid billing interval %', p_billing_interval;
  end if;
  if p_status not in ('active','retired') then
    raise exception 'Invalid plan status %', p_status;
  end if;
  if coalesce(p_trial_days, 0) < 0 then
    raise exception 'Trial days cannot be negative';
  end if;
  if p_feature_limits is null or jsonb_typeof(p_feature_limits) <> 'object' then
    raise exception 'Feature limits must be a JSON object';
  end if;

  if p_id is null then
    insert into public.platform_plans
      (code, name, price_minor, currency, billing_interval, trial_days, status, feature_limits)
    values (v_code, trim(p_name), p_price_minor, p_currency, p_billing_interval,
            coalesce(p_trial_days, 0), p_status, p_feature_limits)
    returning id into v_id;
    perform public.log_admin_action('platform_plan.created', 'platform_plan', v_id,
      jsonb_build_object('code', v_code, 'name', trim(p_name)));
  else
    update public.platform_plans
      set code = v_code,
          name = trim(p_name),
          price_minor = p_price_minor,
          currency = p_currency,
          billing_interval = p_billing_interval,
          trial_days = coalesce(p_trial_days, 0),
          status = p_status,
          feature_limits = p_feature_limits
      where id = p_id
      returning id into v_id;
    if v_id is null then
      raise exception 'Plan not found';
    end if;
    perform public.log_admin_action('platform_plan.updated', 'platform_plan', v_id,
      jsonb_build_object('code', v_code, 'name', trim(p_name), 'status', p_status));
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 23. Admin RPC: subscription list (for the billing screen)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_subscriptions(
  p_status text default null,
  p_search text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('trialing','active','past_due','cancelled','expired') then
    raise exception 'Invalid status %', p_status;
  end if;

  select count(*)::integer into v_total
  from public.org_subscriptions s
  join public.organizations o on o.id = s.organization_id
  left join auth.users u on u.id = o.owner_id
  where (p_status is null or s.status = p_status)
    and (p_search is null or length(trim(p_search)) = 0
         or o.name ilike '%' || trim(p_search) || '%'
         or u.email ilike '%' || trim(p_search) || '%');

  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', s.id,
      'organization_id', o.id,
      'org_name', o.name,
      'org_status', o.status,
      'owner_email', u.email,
      'status', s.status,
      'started_at', s.started_at,
      'trial_ends_at', s.trial_ends_at,
      'current_period_end', s.current_period_end,
      'plan_name', p.name,
      'plan_code', p.code,
      'price_minor', p.price_minor,
      'billing_interval', p.billing_interval,
      'open_invoice', (
        select jsonb_build_object('id', i.id, 'amount_minor', i.amount_minor,
                                  'due_at', i.due_at, 'status', i.status)
        from public.subscription_invoices i
        where i.subscription_id = s.id and i.status = 'open'
        order by i.created_at desc
        limit 1),
      'last_payment', (
        select jsonb_build_object('amount_minor', pay.amount_minor,
                                  'provider', pay.provider, 'verified_at', pay.verified_at)
        from public.subscription_payments pay
        where pay.invoice_id in (
                select id from public.subscription_invoices i2
                where i2.subscription_id = s.id and i2.status = 'paid')
        order by pay.verified_at desc nulls last
        limit 1)
    ) as r
    from public.org_subscriptions s
    join public.organizations o on o.id = s.organization_id
    left join auth.users u on u.id = o.owner_id
    join public.platform_plans p on p.id = s.plan_id
    where (p_status is null or s.status = p_status)
      and (p_search is null or length(trim(p_search)) = 0
           or o.name ilike '%' || trim(p_search) || '%'
           or u.email ilike '%' || trim(p_search) || '%')
    order by s.created_at desc
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- 24. Admin RPCs: audit log search + support tickets
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_audit(
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select count(*)::integer into v_total
  from public.admin_audit_log a
  where p_search is null or length(trim(p_search)) = 0
     or a.action ilike '%' || trim(p_search) || '%'
     or a.actor_email ilike '%' || trim(p_search) || '%'
     or a.target_type ilike '%' || trim(p_search) || '%';

  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', a.id, 'actor_email', a.actor_email, 'action', a.action,
      'target_type', a.target_type, 'target_id', a.target_id,
      'metadata', a.metadata, 'created_at', a.created_at
    ) as r
    from public.admin_audit_log a
    where p_search is null or length(trim(p_search)) = 0
       or a.action ilike '%' || trim(p_search) || '%'
       or a.actor_email ilike '%' || trim(p_search) || '%'
       or a.target_type ilike '%' || trim(p_search) || '%'
    order by a.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function public.admin_list_tickets(
  p_status text default null,
  p_search text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('open','in_progress','resolved') then
    raise exception 'Invalid status %', p_status;
  end if;

  select count(*)::integer into v_total
  from public.support_tickets t
  join public.organizations o on o.id = t.organization_id
  where (p_status is null or t.status = p_status)
    and (p_search is null or length(trim(p_search)) = 0
         or t.subject ilike '%' || trim(p_search) || '%'
         or o.name ilike '%' || trim(p_search) || '%');

  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'id', t.id, 'organization_id', o.id, 'org_name', o.name,
      'subject', t.subject, 'body', t.body, 'status', t.status,
      'created_at', t.created_at, 'updated_at', t.updated_at
    ) as r
    from public.support_tickets t
    join public.organizations o on o.id = t.organization_id
    where (p_status is null or t.status = p_status)
      and (p_search is null or length(trim(p_search)) = 0
           or t.subject ilike '%' || trim(p_search) || '%'
           or o.name ilike '%' || trim(p_search) || '%')
    order by t.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function public.admin_upsert_ticket(
  p_id uuid default null,
  p_org_id uuid default null,
  p_subject text default null,
  p_body text default null,
  p_status text default 'open'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_org uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_subject is null or length(trim(p_subject)) < 3 then
    raise exception 'Subject must be at least 3 characters';
  end if;
  if p_status not in ('open','in_progress','resolved') then
    raise exception 'Invalid status %', p_status;
  end if;

  if p_id is null then
    if p_org_id is null or not exists (
        select 1 from public.organizations where id = p_org_id) then
      raise exception 'Organization not found';
    end if;
    insert into public.support_tickets (organization_id, subject, body, status, created_by)
    values (p_org_id, trim(p_subject), p_body, p_status, auth.uid())
    returning id into v_id;
    perform public.log_admin_action('support_ticket.created', 'organization', p_org_id,
      jsonb_build_object('ticket_id', v_id, 'subject', trim(p_subject)));
  else
    update public.support_tickets
      set subject = trim(p_subject),
          body = p_body,
          status = p_status,
          updated_at = now()
      where id = p_id
      returning id, organization_id into v_id, v_org;
    if v_id is null then
      raise exception 'Ticket not found';
    end if;
    perform public.log_admin_action('support_ticket.updated', 'organization', v_org,
      jsonb_build_object('ticket_id', v_id, 'status', p_status, 'subject', trim(p_subject)));
  end if;

  return v_id;
end;
$$;

-- Keep platform authorization helpers and admin operations off the anonymous
-- API. Every callable operation is granted only to signed-in users, and each
-- SECURITY DEFINER body performs its own platform role check.
revoke execute on function public.is_platform_admin() from public, anon, service_role;
revoke execute on function public.platform_admin_role() from public, anon, service_role;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.platform_admin_role() to authenticated;

revoke execute on function public.admin_platform_metrics() from public, anon, service_role;
revoke execute on function public.admin_list_organizations(text, text, integer, integer) from public, anon, service_role;
revoke execute on function public.admin_org_details(uuid) from public, anon, service_role;
revoke execute on function public.admin_create_organization(text, text, text, text, text) from public, anon, service_role;
revoke execute on function public.admin_set_organization_status(uuid, text, text) from public, anon, service_role;
revoke execute on function public.admin_assign_subscription(uuid, text, integer) from public, anon, service_role;
revoke execute on function public.admin_generate_invoice(uuid) from public, anon, service_role;
revoke execute on function public.admin_record_subscription_payment(uuid, text, text) from public, anon, service_role;
revoke execute on function public.admin_cancel_subscription(uuid, text) from public, anon, service_role;
revoke execute on function public.admin_list_plans() from public, anon, service_role;
revoke execute on function public.admin_upsert_plan(uuid, text, text, integer, text, text, integer, text, jsonb) from public, anon, service_role;
revoke execute on function public.admin_list_subscriptions(text, text, integer, integer) from public, anon, service_role;
revoke execute on function public.admin_list_audit(text, integer, integer) from public, anon, service_role;
revoke execute on function public.admin_list_tickets(text, text, integer, integer) from public, anon, service_role;
revoke execute on function public.admin_upsert_ticket(uuid, uuid, text, text, text) from public, anon, service_role;

grant execute on function public.admin_platform_metrics() to authenticated;
grant execute on function public.admin_list_organizations(text, text, integer, integer) to authenticated;
grant execute on function public.admin_org_details(uuid) to authenticated;
grant execute on function public.admin_create_organization(text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_organization_status(uuid, text, text) to authenticated;
grant execute on function public.admin_assign_subscription(uuid, text, integer) to authenticated;
grant execute on function public.admin_generate_invoice(uuid) to authenticated;
grant execute on function public.admin_record_subscription_payment(uuid, text, text) to authenticated;
grant execute on function public.admin_cancel_subscription(uuid, text) to authenticated;
grant execute on function public.admin_list_plans() to authenticated;
grant execute on function public.admin_upsert_plan(uuid, text, text, integer, text, text, integer, text, jsonb) to authenticated;
grant execute on function public.admin_list_subscriptions(text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_audit(text, integer, integer) to authenticated;
grant execute on function public.admin_list_tickets(text, text, integer, integer) to authenticated;
grant execute on function public.admin_upsert_ticket(uuid, uuid, text, text, text) to authenticated;
