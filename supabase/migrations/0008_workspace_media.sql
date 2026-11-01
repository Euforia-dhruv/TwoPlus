-- TwoPlus.fit — 0008_workspace_media
--
-- Public bucket for workspace custom background images. Objects are
-- namespaced by organization id (<org>/<file>) so the storage policies can
-- authorize on the first path segment alone, mirroring 0006's
-- member-photos bucket.
--
-- Re-runnable: every object is created with "if not exists" or replaced.

insert into storage.buckets (id, name, public)
values ('workspace-media', 'workspace-media', true)
on conflict (id) do nothing;

drop policy if exists "workspace media read" on storage.objects;
create policy "workspace media read" on storage.objects
  for select using (
    bucket_id = 'workspace-media'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "workspace media write" on storage.objects;
create policy "workspace media write" on storage.objects
  for insert with check (
    bucket_id = 'workspace-media'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner')
  );

drop policy if exists "workspace media update" on storage.objects;
create policy "workspace media update" on storage.objects
  for update using (
    bucket_id = 'workspace-media'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner')
  )
  with check (
    bucket_id = 'workspace-media'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner')
  );

drop policy if exists "workspace media delete" on storage.objects;
create policy "workspace media delete" on storage.objects
  for delete using (
    bucket_id = 'workspace-media'
    and public.org_has_role((storage.foldername(name))[1]::uuid, 'owner')
  );
