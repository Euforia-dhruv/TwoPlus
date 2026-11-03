-- 0016 - a member can erase their own account
--
-- The member app could already delete a measurement or a workout. It could not
-- leave: the row, the health history and the sign-in all stayed. This adds one
-- server-side function so a member can end the relationship themselves.
--
-- What is erased and what is kept is a deliberate split, not an oversight:
--
--   erased  identity fields on the member row (name, email, phone, date of
--           birth, gender, address, emergency contacts, notes), the sign-in,
--           workout sessions and sets, body measurements, progress photos and
--           their stored objects, both plan assignments, class bookings,
--           attendance, internal staff notes.
--
--   kept    payments, invoices, membership rows and renewals, attached to an
--           anonymised member row. A gym has to be able to account for money it
--           took; a receipt is not a reason to keep someone's phone number.
--
-- The row itself is anonymised rather than deleted because deleting it would
-- cascade the payment history away. It is marked archived and unlinked, so it
-- no longer appears as an active member and no sign-in reaches it.
--
-- An organisation owner cannot use this: owner_id is `on delete restrict`, and
-- deleting the auth user would take the gym's staff access with it. They get a
-- clear refusal instead of a half-deleted workspace.

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_member  uuid;
  v_org     uuid;
  v_photos  integer := 0;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- Refuse before touching anything. A gym owner has to transfer or close the
  -- gym first; that is an operational decision, not something a delete button
  -- should make for them.
  if exists (select 1 from public.organizations where owner_id = v_uid) then
    raise exception
      'This sign-in owns a gym. Transfer or close the gym before deleting the account.'
      using errcode = '42501';
  end if;

  select m.id, m.organization_id
    into v_member, v_org
    from public.members m
   where m.user_id = v_uid
   limit 1;

  if v_member is not null then
    -- Stored photographs first: the row is the index, the object is the data.
    delete from storage.objects
     where bucket_id = 'member-progress'
       and name like v_org::text || '/' || v_member::text || '/%';
    get diagnostics v_photos = row_count;

    delete from public.member_progress_photos where member_id = v_member;
    delete from public.fitness_measurements where member_id = v_member;
    -- workout_sets hangs off workout_sessions by cascade; this is the parent.
    delete from public.workout_sessions where member_id = v_member;
    delete from public.member_workout_assignments where member_id = v_member;
    delete from public.member_diet_assignments where member_id = v_member;
    delete from public.class_bookings where member_id = v_member;
    delete from public.attendance where member_id = v_member;
    delete from public.member_internal_notes where member_id = v_member;

    -- Money stays, tied to a row that no longer identifies anyone.
    update public.members
       set first_name = 'Deleted',
           last_name = '',
           email = null,
           phone = '',
           date_of_birth = null,
           gender = null,
           address = null,
           emergency_contact_name = null,
           emergency_contact_phone = null,
           notes = null,
           photo_url = null,
           status = 'archived',
           user_id = null
     where id = v_member;
  end if;

  -- Last: the sign-in itself. profiles, notifications and any platform role row
  -- reference auth.users with on delete cascade, so they go with it.
  delete from auth.users where id = v_uid;

  return jsonb_build_object(
    'member_erased', v_member is not null,
    'photos_removed', v_photos
  );
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Erases the caller''s identity and health data and deletes their sign-in. Financial records are retained against an anonymised member row. Refuses for gym owners.';
