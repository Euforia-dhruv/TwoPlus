-- TwoPlus.fit — 0004_reminders_and_roster
-- Two gaps the reminders screen and the access & roles screen hit:
--
-- 1. public.notifications has read/update policies scoped to "own row" but no
--    INSERT policy, so nothing can ever be created. Members must be able to
--    write their own reminders; owners and managers must be able to assign one
--    to anyone in their gym. Both are limited to existing members of that
--    organization, so a row can never target an unrelated account.
--
-- 2. The team roster needs every member's name and email, but public.profiles
--    is readable only for your own row ("profiles read own"). Rather than
--    widening that policy, the roster comes from a SECURITY DEFINER function
--    that returns only the columns the screen needs and only for callers who
--    already belong to the organization.

-- The subquery reads organization_members, whose own "orgmember read" policy
-- already allows the caller's row and, for owners and managers, the whole gym.
-- re-run safe: drop the policy first in case a previous run already created it
drop policy if exists "notifications insert own or managed" on public.notifications;
create policy "notifications insert own or managed" on public.notifications
  for insert
  with check (
    organization_id is not null
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = notifications.organization_id
        and m.user_id = notifications.user_id
    )
    and (
      user_id = auth.uid()
      or public.org_has_role(organization_id, 'owner', 'manager')
    )
  );

-- SECURITY DEFINER for the same reason is_org_member is: the function reads
-- organization_members and profiles, whose own policies would otherwise filter
-- the results down to the caller. The guard clause keeps the extra rows from
-- leaking outside the caller's organization.
-- Email is not on profiles; it lives on auth.users, which a definer function
-- can read. Only the caller's own organization is ever returned.
create or replace function public.list_org_members(p_org_id uuid)
returns table (user_id uuid, role text, full_name text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id,
         m.role,
         coalesce(p.full_name, ''),
         u.email::text
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = p_org_id
    and public.is_org_member(p_org_id)
  order by
    case m.role
      when 'owner' then 0
      when 'manager' then 1
      when 'trainer' then 2
      when 'receptionist' then 3
      when 'finance' then 4
      else 5
    end,
    coalesce(p.full_name, '');
$$;

revoke execute on function public.list_org_members(uuid) from public, anon, service_role;
grant execute on function public.list_org_members(uuid) to authenticated;
