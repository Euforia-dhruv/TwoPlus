-- 0015 — members can record their own measurements
--
-- 0007 gave members a read-only policy on fitness_measurements, so the member
-- app could show weight history but a member could never add to it. Tracking
-- weight is a core promise of the member experience, so this adds self-service
-- writes scoped to the caller's own linked member row.
--
-- The table already enforces one row per (member_id, measured_on), so a second
-- entry for the same day is an edit rather than a duplicate. That is what makes
-- an "upsert" the correct write here.
--
-- Staff policies from 0006 are untouched: this only widens what a member may do
-- to their own rows. A member cannot write another member's row, cannot move a
-- row to a different member, and cannot change which gym the row belongs to.

drop policy if exists "measurements insert self" on public.fitness_measurements;
create policy "measurements insert self" on public.fitness_measurements
  for insert with check (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and m.user_id = auth.uid()
        and m.organization_id = fitness_measurements.organization_id
    )
  );

drop policy if exists "measurements update self" on public.fitness_measurements;
create policy "measurements update self" on public.fitness_measurements
  for update using (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and m.user_id = auth.uid()
        and m.organization_id = fitness_measurements.organization_id
    )
  );

-- Members may delete a measurement they entered by mistake. Nothing else in the
-- member app deletes fitness history, so this stays tightly scoped to own rows.
drop policy if exists "measurements delete self" on public.fitness_measurements;
create policy "measurements delete self" on public.fitness_measurements
  for delete using (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and m.user_id = auth.uid()
    )
  );
