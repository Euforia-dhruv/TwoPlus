-- TwoPlus.fit — 0007_member_accounts
--
-- Links a gym member row to a sign-in identity and grants that identity
-- read access to their own records only.
--
-- Runs AFTER 0006: the self-read policies below reference tables 0006
-- creates (fitness_measurements, member_progress_photos,
-- member_workout_assignments, member_diet_assignments).
--
-- Re-runnable: every object is created with "if not exists" or replaced.

-- ---------------------------------------------------------------------------
-- Identity link
--
-- A member row gets an optional user_id. Staff are NOT added to
-- organization_members (that table's role check stays staff-only): members
-- are linked purely through this column. That keeps the existing
-- is_org_member() read policies from leaking the whole member directory to
-- a member account.
-- ---------------------------------------------------------------------------
alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- One identity per member row, and one member row per identity.
create unique index if not exists members_user_id_unique
  on public.members (user_id)
  where user_id is not null;

create index if not exists members_lower_email_idx
  on public.members (lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Member self-service read policies
--
-- Postgres ORs policies of the same command, so staff keep today's org-wide
-- view while a member additionally sees exactly their own rows.
-- ---------------------------------------------------------------------------
create policy "members read self" on public.members
  for select using (user_id = auth.uid());

create policy "memberships read self" on public.member_memberships
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "payments read self" on public.payments
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "attendance read self" on public.attendance
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "workout assignments read self" on public.member_workout_assignments
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "diet assignments read self" on public.member_diet_assignments
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "measurements read self" on public.fitness_measurements
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

create policy "progress photos read self" on public.member_progress_photos
  for select using (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Claim your member account.
--
-- The invite is the pre-created member row whose email matches the signed-in
-- user's verified email. Calling this stamps user_id; the caller then reads
-- their own records through the self-policies above. Email ownership is the
-- verification: the function is security definer so it can write the link
-- the RLS would otherwise block.
-- ---------------------------------------------------------------------------
create or replace function public.claim_member_account()
returns uuid
language sql
security definer
set search_path = public
as $$
  update public.members m
    set user_id = auth.uid()
  where lower(m.email) = lower(auth.jwt() ->> 'email')
    and m.user_id is null
    and exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = lower(m.email)
    )
  returning m.id;
$$;

revoke all on function public.claim_member_account() from public;
grant execute on function public.claim_member_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Not in this migration
--  - Announcements: no table exists yet (community/P2); member access to gym
--    announcements comes with that table.
--  - Progress photo bytes: the storage bucket needs its own object-level
--    policy once the bucket exists.
--  - Member profile edits: deliberately read-only for members for now.
-- ---------------------------------------------------------------------------
