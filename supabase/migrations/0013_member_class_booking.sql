-- 0013 — member class booking
--
-- Members are deliberately not rows in organization_members (0007), so every
-- policy that gates on is_org_member() is invisible to them. Without this
-- migration a signed-in member sees no classes and cannot book.
--
-- Booking is a security-relevant write: capacity and class state must be
-- enforced in the database, not in the client, because a member can call
-- PostgREST directly. book_class() is SECURITY DEFINER and therefore bypasses
-- RLS, so it re-checks ownership, gym, class state and capacity itself.

-- ---------------------------------------------------------------------------
-- Read access: a member sees their own gym's scheduled classes.
-- ---------------------------------------------------------------------------
create policy "classes read for own member" on public.classes
  for select using (
    exists (
      select 1
      from public.members m
      where m.user_id = auth.uid()
        and m.organization_id = classes.organization_id
    )
  );

-- A member sees their own bookings (other members' bookings stay private).
create policy "bookings read for own member" on public.class_bookings
  for select using (
    exists (
      select 1
      from public.members m
      where m.id = class_bookings.member_id
        and m.user_id = auth.uid()
    )
  );

-- Cancelling own booking only. The status check in the with-clause stops a
-- member from flipping a cancelled booking back to 'booked' (which would let
-- them bypass the capacity check in book_class()).
create policy "bookings cancel own" on public.class_bookings
  for update using (
    exists (
      select 1
      from public.members m
      where m.id = class_bookings.member_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    status = 'cancelled'
    and exists (
      select 1
      from public.members m
      where m.id = class_bookings.member_id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- book_class: idempotent, capacity-checked booking.
--
-- Returns the booking id. Booking twice returns the same row rather than
-- failing, so a double-tap or a retried request is harmless.
-- ---------------------------------------------------------------------------
create or replace function public.book_class(p_class_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_member   public.members%rowtype;
  v_class    public.classes%rowtype;
  v_booked   integer;
  v_booking  uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_member
  from public.members m
  where m.user_id = v_uid;

  if not found then
    raise exception 'No member record is linked to this account'
      using errcode = '42501';
  end if;

  -- Lock the class row so two members booking the last spot cannot both pass
  -- the capacity check. Without this the count below races.
  select * into v_class
  from public.classes c
  where c.id = p_class_id
  for update;

  if not found then
    raise exception 'That class does not exist' using errcode = 'P0002';
  end if;

  if v_class.organization_id <> v_member.organization_id then
    raise exception 'That class belongs to another gym' using errcode = '42501';
  end if;

  if v_class.status <> 'scheduled' then
    raise exception 'That class is not open for booking' using errcode = '22000';
  end if;

  if v_class.starts_at <= now() then
    raise exception 'That class has already started' using errcode = '22000';
  end if;

  -- Already booked (and not cancelled): return the existing row untouched.
  select b.id into v_booking
  from public.class_bookings b
  where b.class_id = p_class_id
    and b.member_id = v_member.id
    and b.status <> 'cancelled';

  if v_booking is not null then
    return v_booking;
  end if;

  select count(*) into v_booked
  from public.class_bookings b
  where b.class_id = p_class_id
    and b.status = 'booked';

  if v_booked >= v_class.capacity then
    raise exception 'That class is full' using errcode = '22000';
  end if;

  -- unique (class_id, member_id) means a previously cancelled booking has to be
  -- reopened rather than inserted again.
  insert into public.class_bookings (organization_id, class_id, member_id, status)
  values (v_class.organization_id, p_class_id, v_member.id, 'booked')
  on conflict (class_id, member_id) do update
    set status = 'booked'
  returning id into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_class(uuid) from public;
grant execute on function public.book_class(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_class_booking: own booking only.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_class_booking(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  update public.class_bookings b
     set status = 'cancelled'
   where b.class_id = p_class_id
     and b.status = 'booked'
     and exists (
       select 1
       from public.members m
       where m.id = b.member_id
         and m.user_id = v_uid
     );

  if not found then
    raise exception 'No booking to cancel' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.cancel_class_booking(uuid) from public;
grant execute on function public.cancel_class_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- class_seats: seat counts for the caller's own gym.
--
-- A member cannot count other members' bookings through RLS, and they should
-- not be able to see who booked. This returns only an aggregate, scoped to the
-- caller's gym.
-- ---------------------------------------------------------------------------
create or replace function public.class_seats()
returns table (class_id uuid, booked integer)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select b.class_id, count(*)::integer
  from public.class_bookings b
  join public.members m on m.organization_id = b.organization_id
  where m.user_id = auth.uid()
    and b.status = 'booked'
  group by b.class_id;
$$;

revoke all on function public.class_seats() from public;
grant execute on function public.class_seats() to authenticated;

-- Listing classes the member can book is a common read; index the seats count.
create index if not exists class_bookings_class_status_idx
  on public.class_bookings (class_id, status);
