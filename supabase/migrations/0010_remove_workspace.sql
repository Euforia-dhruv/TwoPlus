-- 0010_remove_workspace.sql
--
-- Owner-only workspace removal. Deleting an organization cascades through every
-- child table (0001 declares on delete cascade on all of them), so one delete is
-- enough; the RPC exists to enforce the owner check in one place and to give the
-- client something to call that is not a raw delete on a table.
--
-- Not applied yet. Until it is, api.removeWorkspace() surfaces a clear message
-- and the UI stays disabled rather than pretending the action worked.

create policy "org delete owner" on public.organizations
  for delete using (public.org_has_role(id, 'owner'));

create or replace function public.delete_organization(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.org_has_role(target, 'owner') then
    raise exception 'Only the workspace owner can remove this workspace'
      using errcode = '42501';
  end if;

  delete from public.organizations where id = target;
end;
$$;

-- The function is invoked through PostgREST, so authenticated callers need the
-- grant even though the body re-checks ownership.
revoke all on function public.delete_organization(uuid) from public;
grant execute on function public.delete_organization(uuid) to authenticated;
