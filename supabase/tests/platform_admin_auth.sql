-- TwoPlus.fit — platform admin authorization tests
--
-- Run (against a DEV project only — it creates and discards fixtures):
--   psql "$DB_URL" -f supabase/tests/platform_admin_auth.sql
--
-- Everything runs inside one transaction and is rolled back at the end,
-- so no fixture ever persists. The script aborts with a non-zero exit on
-- the first failed assertion (each starts with "FAIL").
--
-- Covered:
--   T1-T9    gym user (authenticated, non-admin) is denied platform data,
--            admin RPCs, and the bootstrap function
--   T10      trial org can still write (suspension must not affect normal use)
--   T11-T15  suspended org: reads preserved, writes blocked, cannot
--            self-reactivate, still denied admin RPCs
--   T16-T26  admin: metrics/list/details work; suspend+audit; full billing
--            state machine; fake payment providers rejected; plans/tickets/
--            audit RPCs work

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- Fixtures (created as postgres = table owner, bypasses RLS; rolled back)
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'rls-test-gym-a@twoplus.test',
   crypt('TestPass123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"RLS Gym A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'rls-test-gym-b@twoplus.test',
   crypt('TestPass123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"RLS Gym B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'rls-test-admin@twoplus.test',
   crypt('TestPass123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"RLS Test Admin"}'::jsonb);

insert into public.organizations (id, owner_id, name, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'RLS Gym A', 'trial'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'RLS Gym B', 'trial');

insert into public.organization_members (organization_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'owner');

insert into public.platform_admins (user_id, role) values
  ('33333333-3333-3333-3333-333333333333', 'super_admin');

insert into public.platform_plans (id, code, name, price_minor, billing_interval,
                                   trial_days, feature_limits)
values ('cccccccc-0000-0000-0000-000000000001', 'test-plan', 'Test Plan',
        450000, 'monthly', 14, '{"max_members": 50}');

insert into public.org_subscriptions (organization_id, plan_id, status,
                                      current_period_start, current_period_end)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'active', now() - interval '10 days', now() + interval '20 days');

insert into public.members (id, organization_id, member_code, first_name, phone)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'M-001', 'Alpha', '9000000001'),
       ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002',
        'M-001', 'Beta', '9000000002');

-- ---------------------------------------------------------------------------
-- Phase 1 — admin suspends Gym B (audited)
-- ---------------------------------------------------------------------------

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"rls-test-admin@twoplus.test"}';
set local role authenticated;

do $$
declare v jsonb;
begin
  -- T16: admin reads platform metrics (real, computed)
  v := public.admin_platform_metrics();
  if (v->>'total_orgs')::integer < 2 then
    raise exception 'FAIL T16: total_orgs %', v->>'total_orgs';
  end if;
  if v->'orgs_by_status'->>'trial' is null then
    raise exception 'FAIL T16: orgs_by_status missing trial';
  end if;
  if (v->>'mrr_minor')::integer <> 450000 then
    raise exception 'FAIL T16: mrr_minor % (expected 450000)', v->>'mrr_minor';
  end if;

  -- T17: admin lists all organizations across tenants
  v := public.admin_list_organizations('RLS Gym', null, 10, 0);
  if (v->>'total')::integer <> 2 then
    raise exception 'FAIL T17: org list total %', v->>'total';
  end if;

  -- T18: admin reads full org detail (cross-tenant)
  v := public.admin_org_details('aaaaaaaa-0000-0000-0000-000000000002');
  if v->>'name' <> 'RLS Gym B' then
    raise exception 'FAIL T18: org details %', v->>'name';
  end if;

  -- T19: suspend Gym B, audit row written
  perform public.admin_set_organization_status(
    'aaaaaaaa-0000-0000-0000-000000000002', 'suspended', 'authorization test');
  if (select status from public.organizations
      where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'suspended' then
    raise exception 'FAIL T19: status not applied';
  end if;
  if (select count(*) from public.admin_audit_log
      where action = 'organization.status.suspended') < 1 then
    raise exception 'FAIL T19: no audit row for suspension';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Phase 2 — gym user A (non-admin, org on trial): denied everything
-- platform-side, but normal gym writes still work (T10)
-- ---------------------------------------------------------------------------

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"rls-test-gym-a@twoplus.test"}';
set local role authenticated;

do $$
begin
  -- T1: platform_admins is invisible (RLS, no policies)
  if (select count(*) from public.platform_admins) <> 0 then
    raise exception 'FAIL T1: gym user read platform_admins';
  end if;

  -- T2: only own organization visible (cross-tenant isolation)
  if (select count(*) from public.organizations) <> 1 then
    raise exception 'FAIL T2: sees % organizations (expected 1)',
      (select count(*) from public.organizations);
  end if;

  -- T3: audit log invisible
  if (select count(*) from public.admin_audit_log) <> 0 then
    raise exception 'FAIL T3: gym user read admin_audit_log';
  end if;

  -- T4: platform plan table invisible
  if (select count(*) from public.platform_plans) <> 0 then
    raise exception 'FAIL T4: gym user read platform_plans';
  end if;

  -- T5: subscriptions/invoices/payments tables invisible
  if (select count(*) from public.org_subscriptions) <> 0
     or (select count(*) from public.subscription_invoices) <> 0
     or (select count(*) from public.subscription_payments) <> 0 then
    raise exception 'FAIL T5: gym user read billing tables';
  end if;

  -- T6: admin metrics RPC denied
  begin
    perform public.admin_platform_metrics();
    raise exception 'FAIL T6: gym user read platform metrics';
  exception when insufficient_privilege then null;
  end;

  -- T7: admin org list RPC denied
  begin
    perform public.admin_list_organizations(null, null, 10, 0);
    raise exception 'FAIL T7: gym user listed all organizations';
  exception when insufficient_privilege then null;
  end;

  -- T8: admin status-change RPC denied (even on own org)
  begin
    perform public.admin_set_organization_status(
      'aaaaaaaa-0000-0000-0000-000000000001', 'active');
    raise exception 'FAIL T8: gym user changed org status';
  exception when insufficient_privilege then null;
  end;

  -- T9: bootstrap + audit-forgery functions not executable by API roles
  begin
    perform public.promote_to_platform_admin('rls-test-gym-a@twoplus.test');
    raise exception 'FAIL T9: gym user executed promote_to_platform_admin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.log_admin_action('forged.action', 'organization', null);
    raise exception 'FAIL T9: gym user executed log_admin_action';
  exception when insufficient_privilege then null;
  end;

  -- T10: positive control — trial org can still write members normally
  insert into public.members (organization_id, member_code, first_name, phone)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'M-POS', 'Positive', '9000000009');
  if (select count(*) from public.members
      where organization_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 2 then
    raise exception 'FAIL T10: trial org write blocked';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Phase 3 — gym user B (suspended org): read-only, no self-reactivation
-- ---------------------------------------------------------------------------

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"rls-test-gym-b@twoplus.test"}';
set local role authenticated;

do $$
begin
  -- T11: data preserved — reads still work
  if (select count(*) from public.organizations) <> 1 then
    raise exception 'FAIL T11: suspended org lost its organization row';
  end if;
  if (select count(*) from public.members
      where organization_id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 1 then
    raise exception 'FAIL T11: suspended org lost member read access';
  end if;

  -- T12: writes blocked (insert hits the org_has_role choke point)
  begin
    insert into public.members (organization_id, member_code, first_name, phone)
    values ('aaaaaaaa-0000-0000-0000-000000000002', 'M-BLK', 'Blocked', '9000000008');
    raise exception 'FAIL T12: suspended org inserted a member';
  exception when insufficient_privilege then null;
  end;

  -- T13: updates blocked (0 rows — policy USING fails)
  update public.members set notes = 'should not apply'
  where organization_id = 'aaaaaaaa-0000-0000-0000-000000000002';
  if found then
    raise exception 'FAIL T13: suspended org updated a member';
  end if;

  -- T14: suspended org cannot flip its own status back (self-reactivation)
  update public.organizations set status = 'active'
  where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  if found then
    raise exception 'FAIL T14: suspended org self-reactivated';
  end if;

  -- T15: still no platform access while suspended
  begin
    perform public.admin_platform_metrics();
    raise exception 'FAIL T15: suspended gym user read platform metrics';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Phase 4 — admin billing/plans/tickets/audit state machine
-- ---------------------------------------------------------------------------

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"rls-test-admin@twoplus.test"}';
set local role authenticated;

do $$
declare
  v jsonb;
  v_invoice uuid;
  v_invoice2 uuid;
  v_plan uuid;
  v_ticket uuid;
  v_sub uuid;
begin
  -- T20: reactivate Gym B, then assign a plan with no trial (invoice now)
  perform public.admin_set_organization_status(
    'aaaaaaaa-0000-0000-0000-000000000002', 'trial', 'resume test');
  perform public.admin_assign_subscription(
    'aaaaaaaa-0000-0000-0000-000000000002', 'test-plan', 0);

  select id into v_sub from public.org_subscriptions
  where organization_id = 'aaaaaaaa-0000-0000-0000-000000000002';
  if v_sub is null then
    raise exception 'FAIL T20: subscription not created';
  end if;
  if (select status from public.org_subscriptions where id = v_sub) <> 'past_due' then
    raise exception 'FAIL T20: expected past_due without trial';
  end if;

  -- T21: no-trial assignment opened an invoice for the plan price
  select id into v_invoice from public.subscription_invoices
  where subscription_id = v_sub and status = 'open'
  order by created_at desc limit 1;
  if v_invoice is null then
    raise exception 'FAIL T21: no open invoice';
  end if;
  if (select amount_minor from public.subscription_invoices where id = v_invoice) <> 450000 then
    raise exception 'FAIL T21: invoice amount wrong';
  end if;

  -- T22: verified payment activates invoice + subscription + org
  perform public.admin_record_subscription_payment(v_invoice, 'manual', 'UPI-TEST-1');
  if (select status from public.subscription_invoices where id = v_invoice) <> 'paid' then
    raise exception 'FAIL T22: invoice not paid';
  end if;
  if (select status from public.org_subscriptions where id = v_sub) <> 'active' then
    raise exception 'FAIL T22: subscription not active';
  end if;
  if (select status from public.organizations
      where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'active' then
    raise exception 'FAIL T22: org did not move trial -> active';
  end if;
  if (select count(*) from public.subscription_payments where status = 'verified') < 1 then
    raise exception 'FAIL T22: no verified payment row';
  end if;

  -- T23: fake payment providers are rejected (no gateway configured)
  v_invoice2 := public.admin_generate_invoice(v_sub);
  begin
    perform public.admin_record_subscription_payment(v_invoice2, 'razorpay');
    raise exception 'FAIL T23: unverified provider accepted';
  exception
    when others then
      if sqlerrm = 'FAIL T23: unverified provider accepted' then raise; end if;
      if sqlerrm not like 'No payment provider%' then
        raise exception 'FAIL T23: unexpected error: %', sqlerrm;
      end if;
  end;

  -- T24: duplicate open invoice blocked; cancellation voids it
  begin
    perform public.admin_generate_invoice(v_sub);
    raise exception 'FAIL T24: duplicate open invoice allowed';
  exception
    when others then
      if sqlerrm = 'FAIL T24: duplicate open invoice allowed' then raise; end if;
      if sqlerrm not like 'An open invoice already exists%' then
        raise exception 'FAIL T24: unexpected error: %', sqlerrm;
      end if;
  end;
  perform public.admin_cancel_subscription(v_sub, 'test cancel');
  if (select status from public.org_subscriptions where id = v_sub) <> 'cancelled' then
    raise exception 'FAIL T24: subscription not cancelled';
  end if;
  if (select count(*) from public.subscription_invoices
      where subscription_id = v_sub and status = 'open') <> 0 then
    raise exception 'FAIL T24: open invoice not voided on cancel';
  end if;

  -- T25: plans CRUD + audit/ticket RPCs
  v_plan := public.admin_upsert_plan(null, 'test-plan-2', 'Second Test Plan',
    99900, 'INR', 'annual', 30, 'active', '{"max_members": 10, "class_booking": true}');
  if (select status from public.platform_plans where id = v_plan) <> 'active' then
    raise exception 'FAIL T25: plan not created';
  end if;
  perform public.admin_upsert_plan(v_plan, 'test-plan-2', 'Second Test Plan',
    99900, 'INR', 'annual', 30, 'retired', '{"max_members": 10}');
  if (select status from public.platform_plans where id = v_plan) <> 'retired' then
    raise exception 'FAIL T25: plan not updated';
  end if;

  v_ticket := public.admin_upsert_ticket(null,
    'aaaaaaaa-0000-0000-0000-000000000001', 'Login issue',
    'Owner cannot sign in', 'open');
  perform public.admin_upsert_ticket(v_ticket, null, 'Login issue',
    'Owner cannot sign in', 'resolved');
  if (select status from public.support_tickets where id = v_ticket) <> 'resolved' then
    raise exception 'FAIL T25: ticket not updated';
  end if;

  v := public.admin_list_audit(null, 20, 0);
  if (v->>'total')::integer < 5 then
    raise exception 'FAIL T25: audit total % (expected >= 5)', v->>'total';
  end if;

  v := public.admin_list_subscriptions(null, null, 10, 0);
  if (v->>'total')::integer < 1 then
    raise exception 'FAIL T26: subscription list empty';
  end if;
  v := public.admin_list_tickets(null, null, 10, 0);
  if (v->>'total')::integer < 1 then
    raise exception 'FAIL T26: ticket list empty';
  end if;
end $$;

-- All assertions passed: discard fixtures.
reset role;
rollback;

select 'ALL PLATFORM ADMIN AUTHORIZATION TESTS PASSED' as result;
