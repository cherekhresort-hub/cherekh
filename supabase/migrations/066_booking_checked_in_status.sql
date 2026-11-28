-- Add checked-in as a stay status between confirmed and checked-out.
-- Inventory blockers: pending, confirmed, checked-in.
-- Auto-checkout covers both confirmed and checked-in past stays.

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
  where b.status in ('pending', 'confirmed', 'checked-in')
    and p_check_in < b.check_out
    and p_check_out > b.check_in
    and (p_exclude_id is null or b.id <> p_exclude_id)
    and public.booking_line_matches_pool(line->>'roomType', p_pool_rooms);
$$;

create or replace function public.conference_bookings_on_date(
  p_date date,
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
  where b.status in ('pending', 'confirmed', 'checked-in')
    and (p_exclude_id is null or b.id <> p_exclude_id)
    and line->>'roomType' = 'conference'
    and public.booking_blocks_conference_date(b.payload, b.check_in, b.check_out, p_date);
$$;

create or replace function public.direct_bookings_on_room(
  p_room_id text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language plpgsql
stable
as $$
declare
  v_day date;
  v_count int := 0;
  v_day_count int;
begin
  if p_room_id = 'conference' then
    v_day := p_check_in;
    while v_day < p_check_out loop
      v_day_count := public.conference_bookings_on_date(v_day, p_exclude_id);
      v_count := greatest(v_count, v_day_count);
      v_day := v_day + 1;
    end loop;
    return v_count;
  end if;

  return (
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
    where b.status in ('pending', 'confirmed', 'checked-in')
      and p_check_in < b.check_out
      and p_check_out > b.check_in
      and (p_exclude_id is null or b.id <> p_exclude_id)
      and line->>'roomType' = p_room_id
  );
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
  where b.status in ('pending', 'confirmed', 'checked-in')
    and p_check_in < b.check_out
    and p_check_out > b.check_in
  for update;
$$;

create or replace function private.upsert_booking_if_available(
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

  perform public.lock_booking_inventory_slots(p_check_in, p_check_out, p_payload);

  if p_status in ('pending', 'confirmed', 'checked-in')
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

create or replace function private.update_booking_status_safe(
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

  if p_status not in ('pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select * into v_row from public.bookings where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_payload := jsonb_set(v_row.payload, '{status}', to_jsonb(p_status), true);

  if p_status in ('pending', 'confirmed', 'checked-in') then
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

  return jsonb_build_object('ok', true, 'payload', private.mask_booking_payload(v_payload));
end;
$$;

create or replace function private.checkout_past_confirmed_bookings()
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
  where b.status in ('confirmed', 'checked-in')
    and b.check_out < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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

  -- Automatic check-out of past stays runs for any signed-in staff.
  if old.status in ('confirmed', 'checked-in')
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
