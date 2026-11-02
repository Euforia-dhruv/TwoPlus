-- TwoPlus.fit — 0011_harden_member_claim
--
-- Closes two defects in public.claim_member_account() (0007):
--
--   1. It trusted the email claim inside the JWT. That value is whatever the
--      caller signed up with, so any account could claim a member row by
--      registering a matching address. The guard now reads the address from
--      auth.users and requires email_confirmed_at, which the caller cannot set.
--
--   2. It could link a member row that was already linked to a different
--      identity, and could pick an arbitrary row when an address matched more
--      than one gym. Ambiguous matches are now refused.
--
-- IMPORTANT: check (1) is only sound when the Supabase project has "Confirm
-- email" ENABLED (Authentication → Providers → Email). With autoconfirm on,
-- GoTrue stamps email_confirmed_at at signup, so a confirmed timestamp proves
-- nothing about who owns the address and this function cannot tell the
-- difference. TwoPlus must ship with confirmations on; see docs/SECURITY.md.
-- An invite-code claim (gym issues a single-use token) would remove the
-- dependency on email entirely and is the recommended follow-up.
--
-- The invite path is unchanged: the gym pre-creates the member row with the
-- member's address, the member signs up and confirms, then claims.
--
-- Re-runnable: the function is replaced; the index and trigger are dropped
-- first.

-- ---------------------------------------------------------------------------
-- Fast path for the claim lookup and for lower(email) checks elsewhere.
-- ---------------------------------------------------------------------------
create index if not exists members_org_email_idx
  on public.members (organization_id, lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Hardened claim.
--
-- SECURITY DEFINER with a pinned search_path; every comparison is against the
-- auth store rather than against a claim the caller controls.
-- ---------------------------------------------------------------------------
create or replace function public.claim_member_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_count integer;
  v_member uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select lower(u.email)
    into v_email
    from auth.users u
   where u.id = v_uid
     and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'Confirm your email address before linking your gym account'
      using errcode = '28000';
  end if;

  -- Exactly one unclaimed row must match. Two matches means the person is on
  -- two gym rosters (or one address was reused); assigning either would expose
  -- records, so both are left for the gyms to resolve.
  select count(*)
    into v_count
    from public.members m
   where lower(m.email) = v_email
     and m.user_id is null;

  if v_count <> 1 then
    -- Deliberately returns null for 0 and for >1: the UI keeps its "ask your
    -- gym" message and nothing is disclosed about which case applies.
    return null;
  end if;

  select m.id
    into v_member
    from public.members m
   where lower(m.email) = v_email
     and m.user_id is null;

  -- The `and user_id is null` guard makes this a compare-and-set: a concurrent
  -- claim loses the race and updates nothing.
  update public.members
     set user_id = v_uid
   where id = v_member
     and user_id is null;

  if not found then
    return null;
  end if;

  return v_member;
end;
$$;

revoke all on function public.claim_member_account() from public;
grant execute on function public.claim_member_account() to authenticated;

-- ---------------------------------------------------------------------------
-- A linked row cannot be moved to a different sign-in identity. Unlinking
-- (user_id → null) stays available to staff so a wrong link can be corrected.
-- ---------------------------------------------------------------------------
create or replace function public.members_keep_link()
returns trigger
language plpgsql
as $$
begin
  if old.user_id is not null
     and new.user_id is not null
     and new.user_id <> old.user_id then
    raise exception 'This member account is already linked to a different sign-in'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists members_keep_link on public.members;
create trigger members_keep_link before update of user_id on public.members
  for each row execute function public.members_keep_link();
