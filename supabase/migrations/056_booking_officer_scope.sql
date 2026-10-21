-- Booking officers: only edit bookings they created, never add/remove bills,
-- and no longer access contact inquiries. Admin and manager are unchanged.
-- Requires 055_booking_booked_by.sql.

-- 1. Backfill bookedBy for staff-created bookings from the activity log.
update public.bookings b
set payload = jsonb_set(
  b.payload,
  '{bookedBy}',
  jsonb_build_object('type', 'staff', 'email', lower(a.actor_email), 'role', a.actor_role),
  true
)
from (
  select distinct on (entity_id) entity_id, actor_email, actor_role
  from public.staff_activity_log
  where action = 'booking.created' and entity_id is not null
  order by entity_id, created_at asc
) a
where a.entity_id = b.id
  and b.payload->'bookedBy' is null;

-- 2. Enforce the booking officer scope on every write path (direct table
--    writes and the security-definer booking RPCs).
create or replace function private.enforce_booking_officer_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_email text := lower(coalesce(public.current_auth_email(), ''));
begin
  if v_role is distinct from 'booking_officer' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(jsonb_array_length(new.payload->'extras'), 0) > 0 then
      raise exception 'booking_officer_cannot_add_bills' using errcode = '42501';
    end if;
    new.payload := jsonb_set(
      new.payload,
      '{bookedBy}',
      jsonb_build_object('type', 'staff', 'email', v_email, 'role', 'booking_officer'),
      true
    );
    return new;
  end if;

  -- Automatic check-out of past confirmed stays runs for any signed-in staff.
  if old.status = 'confirmed'
    and new.status = 'checked-out'
    and old.check_out < current_date
    and (new.payload - 'status' - 'updatedAt') = (old.payload - 'status' - 'updatedAt')
  then
    return new;
  end if;

  if v_email = '' or lower(coalesce(old.payload->'bookedBy'->>'email', '')) <> v_email then
    raise exception 'booking_officer_not_owner' using errcode = '42501';
  end if;

  if coalesce(new.payload->'extras', '[]'::jsonb) is distinct from coalesce(old.payload->'extras', '[]'::jsonb) then
    raise exception 'booking_officer_cannot_add_bills' using errcode = '42501';
  end if;

  new.payload := jsonb_set(new.payload, '{bookedBy}', old.payload->'bookedBy', true);
  return new;
end;
$$;

revoke all on function private.enforce_booking_officer_scope() from public, anon, authenticated;

drop trigger if exists bookings_booking_officer_scope on public.bookings;
create trigger bookings_booking_officer_scope
  before insert or update on public.bookings
  for each row
  execute function private.enforce_booking_officer_scope();

-- 3. Contact inquiries: admin and manager only.
drop policy if exists "Staff read contact inquiries" on public.contact_inquiries;
drop policy if exists "Admin and manager read contact inquiries" on public.contact_inquiries;
create policy "Admin and manager read contact inquiries"
  on public.contact_inquiries for select
  to authenticated
  using ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff update contact inquiries" on public.contact_inquiries;
drop policy if exists "Admin and manager update contact inquiries" on public.contact_inquiries;
create policy "Admin and manager update contact inquiries"
  on public.contact_inquiries for update
  to authenticated
  using ((select public.current_user_is_admin_or_manager()))
  with check ((select public.current_user_is_admin_or_manager()));
