-- Room 102 (Couple Bed Non AC): bookable by staff while its photos are pending,
-- refused on the guest booking path. Run after 053.
-- Keep room_type_capacity and staff_only_room_types in step with src/data/roomCatalog.ts
-- (staff-only rooms there have listedOnWebsite: false).

create or replace function public.room_type_capacity(p_room_type text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_room_type
    when '103' then 6 when '104' then 6 when '201' then 6 when '202' then 6 when '203' then 6
    when '102' then 3 when '105' then 3 when '204' then 3 when '205' then 3 when '206' then 3
    when 'conference' then 100
    else 0
  end;
$$;

create or replace function private.staff_only_room_types()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['102']::text[];
$$;

revoke all on function private.staff_only_room_types() from public, anon, authenticated;

-- Same as 040, plus the staff-only room check before the inventory check.
create or replace function private.insert_booking_if_available(
  p_id text,
  p_payload jsonb,
  p_check_in date,
  p_check_out date,
  p_guest_email text,
  p_guest_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.booking_submission_rate_exceeded(p_guest_email, p_guest_phone, 30) then
    return jsonb_build_object('ok', false, 'error', 'rate_limit_exceeded');
  end if;

  if exists (
    select 1
    from public.booking_room_lines(p_payload) as l
    where l.room_type = any (private.staff_only_room_types())
  ) then
    return jsonb_build_object('ok', false, 'error', 'inventory_unavailable');
  end if;

  perform public.lock_booking_inventory_slots(p_check_in, p_check_out, p_payload);

  if not public.booking_inventory_available(p_check_in, p_check_out, p_payload, null) then
    return jsonb_build_object('ok', false, 'error', 'inventory_unavailable');
  end if;

  insert into public.bookings (
    id, payload, status, check_in, check_out, guest_email, guest_phone, created_at, updated_at
  )
  values (
    p_id,
    jsonb_set(p_payload, '{status}', '"pending"', true),
    'pending',
    p_check_in,
    p_check_out,
    p_guest_email,
    p_guest_phone,
    coalesce((p_payload->>'createdAt')::timestamptz, now()),
    coalesce((p_payload->>'updatedAt')::timestamptz, now())
  );

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate_id');
end;
$$;

revoke all on function private.insert_booking_if_available(text, jsonb, date, date, text, text)
  from public;
grant execute on function private.insert_booking_if_available(text, jsonb, date, date, text, text)
  to anon, authenticated;

insert into public.room_rates (room_id, price, list_price, total_rooms)
values ('102', 4000, 4000, 1)
on conflict (room_id) do nothing;
