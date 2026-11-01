-- TwoPlus.fit — 0009_member_plan_read
--
-- Grant a signed-in member read access to the workout and diet plan rows that
-- are assigned to them. 0007 already grants self-read on the assignment
-- tables; this extends that to the plan catalogs and their children so the
-- member app can render plan details without exposing other members' plans.
--
-- Re-runnable: every policy is dropped before being recreated.
--
-- NOTE on column qualification: every column in the WHERE clause is fully
-- qualified (table alias or policy-table name) because the EXISTS subqueries
-- join several tables that share column names (id, plan_id, organization_id).
-- Unqualified references raise 42702 (ambiguous column).

drop policy if exists "workout plans read member" on public.workout_plans;
create policy "workout plans read member" on public.workout_plans
  for select using (
    exists (
      select 1
      from public.member_workout_assignments a
      join public.members m on m.id = a.member_id
      where a.plan_id = workout_plans.id
        and a.organization_id = workout_plans.organization_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "workout exercises read member" on public.workout_exercises;
create policy "workout exercises read member" on public.workout_exercises
  for select using (
    exists (
      select 1
      from public.member_workout_assignments a
      join public.members m on m.id = a.member_id
      where a.plan_id = workout_exercises.plan_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "diet plans read member" on public.diet_plans;
create policy "diet plans read member" on public.diet_plans
  for select using (
    exists (
      select 1
      from public.member_diet_assignments a
      join public.members m on m.id = a.member_id
      where a.plan_id = diet_plans.id
        and a.organization_id = diet_plans.organization_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "diet meals read member" on public.diet_meals;
create policy "diet meals read member" on public.diet_meals
  for select using (
    exists (
      select 1
      from public.member_diet_assignments a
      join public.members m on m.id = a.member_id
      where a.plan_id = diet_meals.plan_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "diet items read member" on public.diet_meal_items;
create policy "diet items read member" on public.diet_meal_items
  for select using (
    exists (
      select 1
      from public.diet_meals ml
      join public.member_diet_assignments a on a.plan_id = ml.plan_id
      join public.members m on m.id = a.member_id
      where ml.id = diet_meal_items.meal_id
        and m.user_id = auth.uid()
    )
  );
