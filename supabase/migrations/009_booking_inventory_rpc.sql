-- Atomic inventory checks + safe status/checkout updates (run after 008)

-- Capacity per room type (matches src/data/roomCatalog.ts)
create or replace function public.room_type_capacity(p_room_type text)
returns int
language sql
immutable
as $$
  select case p_room_type
    when '103' then 6 when '104' then 6 when '201' then 6 when '202' then 6 when '203' then 6
    when '105' then 3 when '204' then 3 when '205' then 3 when '206' then 3
    when 'conference' then 100
    else 0
  end;
$$;

create or replace function public.booking_room_lines(p_payload jsonb)
returns table (room_type text, adults int, children int)
language sql
immutable
as $$
  select
    coalesce(line->>'roomType', '') as room_type,
    greatest(coalesce((line->>'adults')::int, 0), 0) as adults,
    greatest(coalesce((line->>'children')::int, 0), 0) as children
  from jsonb_array_elements(
    case
      when jsonb_typeof(p_payload->'rooms') = 'array' and jsonb_array_length(p_payload->'rooms') > 0
        then p_payload->'rooms'
      else jsonb_build_array(
        jsonb_build_object(
          'roomType', coalesce(p_payload->>'roomType', ''),
          'adults', coalesce((p_payload->>'adults')::int, 1),
          'children', coalesce((p_payload->>'children')::int, 0)
        )
      )
    end
  ) as line
  where coalesce(line->>'roomType', '') <> '';
$$;

create or replace function public.booking_line_matches_pool(p_line_type text, p_pool_rooms text[])
returns boolean
language sql
immutable
as $$
  select
    p_line_type = any (p_pool_rooms)
    or (p_line_type = 'garden-view' and p_pool_rooms @> array['103','104','105','201','202','203'])
    or (p_line_type = 'hill-view' and p_pool_rooms @> array['204','205','206'])
    or (p_line_type = 'deluxe' and p_pool_rooms @> array['103','104','105']);
$$;

create or replace function public.booking_pool_usage(
  p_pool_rooms text[],
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language sql
stable
as $$
  select count(distinct b.id)::int
  from public.bookings b
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(b.payload->'rooms') = 'array' and jsonb_array_length(b.payload->'rooms') > 0
        then b.payload->'rooms'
      else jsonb_build_array(
        jsonb_build_object('roomType', coalesce(b.payload->>'roomType', ''))
      )
    end
  ) as line
  where b.status in ('pending', 'confirmed')
    and p_check_in < b.check_out
    and p_check_out > b.check_in
    and (p_exclude_id is null or b.id <> p_exclude_id)
    and public.booking_line_matches_pool(line->>'roomType', p_pool_rooms);
$$;

create or replace function public.direct_bookings_on_room(
  p_room_id text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.bookings b
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(b.payload->'rooms') = 'array' and jsonb_array_length(b.payload->'rooms') > 0
        then b.payload->'rooms'
      else jsonb_build_array(
        jsonb_build_object('roomType', coalesce(b.payload->>'roomType', ''))
      )
    end
  ) as line
  where b.status in ('pending', 'confirmed')
    and p_check_in < b.check_out
    and p_check_out > b.check_in
    and (p_exclude_id is null or b.id <> p_exclude_id)
    and line->>'roomType' = p_room_id;
$$;

create or replace function public.physical_room_available(
  p_room_id text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns boolean
language sql
stable
as $$
  select
    public.direct_bookings_on_room(p_room_id, p_check_in, p_check_out, p_exclude_id) < 1
    and public.booking_pool_usage(array['103','104','105','201','202','203'], p_check_in, p_check_out, p_exclude_id)
        < case when p_room_id = any (array['103','104','105','201','202','203']) then 6 else 999 end
    and public.booking_pool_usage(array['204','205','206'], p_check_in, p_check_out, p_exclude_id)
        < case when p_room_id = any (array['204','205','206']) then 3 else 999 end
    and public.booking_pool_usage(array['103','104','105'], p_check_in, p_check_out, p_exclude_id)
        < case when p_room_id = any (array['103','104','105']) then 3 else 999 end;
$$;

create or replace function public.legacy_type_remaining(
  p_legacy_type text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language sql
stable
as $$
  select case p_legacy_type
    when 'garden-view' then
      6 - public.booking_pool_usage(array['103','104','105','201','202','203'], p_check_in, p_check_out, p_exclude_id)
    when 'hill-view' then
      3 - public.booking_pool_usage(array['204','205','206'], p_check_in, p_check_out, p_exclude_id)
    when 'deluxe' then
      3 - public.booking_pool_usage(array['103','104','105'], p_check_in, p_check_out, p_exclude_id)
    else 0
  end;
$$;

create or replace function public.room_type_remaining_units(
  p_room_type text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language plpgsql
stable
as $$
declare
  v_remaining int;
begin
  if p_room_type in ('garden-view', 'hill-view', 'deluxe') then
    return greatest(public.legacy_type_remaining(p_room_type, p_check_in, p_check_out, p_exclude_id), 0);
  end if;

  if public.room_type_capacity(p_room_type) <= 0 then
    return 0;
  end if;

  if not public.physical_room_available(p_room_type, p_check_in, p_check_out, p_exclude_id) then
    return 0;
  end if;

  return 1;
end;
$$;

create or replace function public.booking_inventory_available(
  p_check_in date,
  p_check_out date,
  p_payload jsonb,
  p_exclude_id text default null
)
returns boolean
language plpgsql
stable
as $$
declare
  r record;
  v_needed jsonb := '{}'::jsonb;
  v_key text;
  v_count int;
  v_remaining int;
  v_cap int;
begin
  if p_check_out <= p_check_in then
    return false;
  end if;

  for r in select * from public.booking_room_lines(p_payload) loop
    v_cap := public.room_type_capacity(r.room_type);
    if v_cap <= 0 then
      return false;
    end if;
    if r.adults < 1 or (r.adults + r.children) > v_cap then
      return false;
    end if;

    v_key := r.room_type;
    v_count := coalesce((v_needed->>v_key)::int, 0) + 1;
    v_needed := jsonb_set(v_needed, array[v_key], to_jsonb(v_count), true);
  end loop;

  for v_key, v_count in
    select key, (value)::int
    from jsonb_each_text(v_needed) as t(key, value)
  loop
    v_remaining := public.room_type_remaining_units(v_key, p_check_in, p_check_out, p_exclude_id);
    if v_remaining < v_count then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.lock_overlapping_bookings(
  p_check_in date,
  p_check_out date
)
returns void
language sql
as $$
  select 1
  from public.bookings b
  where b.status in ('pending', 'confirmed')
    and p_check_in < b.check_out
    and p_check_out > b.check_in
  for update;
$$;

-- Guest / public: insert pending only, with inventory check
create or replace function public.insert_booking_if_available(
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
  perform public.lock_overlapping_bookings(p_check_in, p_check_out);

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

-- Staff: insert or replace with inventory check (any status)
create or replace function public.upsert_booking_if_available(
  p_id text,
  p_payload jsonb,
  p_status text,
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
  if public.current_user_role() is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  perform public.lock_overlapping_bookings(p_check_in, p_check_out);

  if p_status in ('pending', 'confirmed')
     and not public.booking_inventory_available(p_check_in, p_check_out, p_payload, p_id) then
    return jsonb_build_object('ok', false, 'error', 'inventory_unavailable');
  end if;

  insert into public.bookings (
    id, payload, status, check_in, check_out, guest_email, guest_phone, created_at, updated_at
  )
  values (
    p_id,
    jsonb_set(p_payload, '{status}', to_jsonb(p_status), true),
    p_status,
    p_check_in,
    p_check_out,
    p_guest_email,
    p_guest_phone,
    coalesce((p_payload->>'createdAt')::timestamptz, now()),
    coalesce((p_payload->>'updatedAt')::timestamptz, now())
  )
  on conflict (id) do update set
    payload = excluded.payload,
    status = excluded.status,
    check_in = excluded.check_in,
    check_out = excluded.check_out,
    guest_email = excluded.guest_email,
    guest_phone = excluded.guest_phone,
    updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate_id');
end;
$$;

create or replace function public.update_booking_status_safe(
  p_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bookings%rowtype;
  v_payload jsonb;
begin
  if public.current_user_role() is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_row from public.bookings where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_payload := jsonb_set(v_row.payload, '{status}', to_jsonb(p_status), true);

  if p_status in ('pending', 'confirmed') then
    perform public.lock_overlapping_bookings(v_row.check_in, v_row.check_out);
    if not public.booking_inventory_available(v_row.check_in, v_row.check_out, v_payload, p_id) then
      return jsonb_build_object('ok', false, 'error', 'inventory_unavailable');
    end if;
  end if;

  update public.bookings
  set
    status = p_status,
    payload = v_payload,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'payload', v_payload);
end;
$$;

create or replace function public.checkout_past_confirmed_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.current_user_role() is null then
    return 0;
  end if;

  update public.bookings b
  set
    status = 'checked-out',
    payload = jsonb_set(b.payload, '{status}', '"checked-out"', true),
    updated_at = now()
  where b.status = 'confirmed'
    and b.check_out < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Force guest inserts through RPC (inventory + lock)
drop policy if exists "Anon insert pending bookings" on public.bookings;

revoke insert on public.bookings from anon;

grant execute on function public.insert_booking_if_available(text, jsonb, date, date, text, text) to anon, authenticated;
grant execute on function public.upsert_booking_if_available(text, jsonb, text, date, date, text, text) to authenticated;
grant execute on function public.update_booking_status_safe(text, text) to authenticated;
grant execute on function public.checkout_past_confirmed_bookings() to authenticated;
