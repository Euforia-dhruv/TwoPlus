-- 0014 — private storage for member progress photographs
--
-- member_progress_photos (0006) stores the row; this adds the bucket the
-- storage_path points at. The bucket is private: a fitness photograph is among
-- the most sensitive rows a member owns, so there is no public URL for it and
-- reads go through short-lived signed URLs.
--
-- Path convention: <organization_id>/<member_id>/<uuid>.<ext>
-- A member may only write inside their own <org>/<member> prefix, which is
-- checked against their linked member row rather than trusted from the path.

insert into storage.buckets (id, name, public)
values ('member-progress', 'member-progress', false)
on conflict (id) do update set public = false;

-- Re-runnable: create policy has no `if not exists`.
drop policy if exists "progress photos read own" on storage.objects;
drop policy if exists "progress photos insert own" on storage.objects;
drop policy if exists "progress photos delete own" on storage.objects;
drop policy if exists "progress photos read by staff" on storage.objects;

-- Own photos: read, upload, replace, delete.
create policy "progress photos read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-progress'
    and exists (
      select 1
      from public.members m
      where m.user_id = auth.uid()
        and storage.objects.name like m.organization_id::text || '/' || m.id::text || '/%'
    )
  );

create policy "progress photos insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-progress'
    and exists (
      select 1
      from public.members m
      where m.user_id = auth.uid()
        and storage.objects.name like m.organization_id::text || '/' || m.id::text || '/%'
    )
  );

create policy "progress photos delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-progress'
    and exists (
      select 1
      from public.members m
      where m.user_id = auth.uid()
        and storage.objects.name like m.organization_id::text || '/' || m.id::text || '/%'
    )
  );

-- Gym staff who coach the member may read progress photos; they cannot write.
-- org_has_role() is the same helper every other policy uses.
create policy "progress photos read by staff"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-progress'
    and exists (
      select 1
      from public.members m
      where storage.objects.name like m.organization_id::text || '/' || m.id::text || '/%'
        and public.org_has_role(m.organization_id, 'owner', 'manager', 'trainer')
    )
  );
