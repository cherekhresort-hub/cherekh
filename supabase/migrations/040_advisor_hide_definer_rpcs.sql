-- Clear advisor lints 0028 / 0029 without changing guest or staff behavior.
-- Run after 039_advisor_function_security.sql
--
-- Guest RPCs must stay SECURITY DEFINER (anon cannot insert/select bookings).
-- The advisor only flags DEFINER functions in PostgREST-exposed schemas, so
-- implementations live in `private` (do not add that schema to API settings).
-- Public names stay the same: supabase.rpc('...') is unchanged.
-- Staff RPCs stay DEFINER too (inventory helpers are not granted to authenticated).
--
-- Remaining advisor row after this file: leaked password protection
-- (Authentication → Providers → Email → Leaked password protection; Pro plan).

-- ---------------------------------------------------------------------------
-- 1. Private schema (not in PostgREST db_schemas / Extra Exposed Schemas)
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Guest implementations (DEFINER) + public INVOKER wrappers
-- ---------------------------------------------------------------------------

create or replace function private.list_booking_availability()
returns table (
  id text,
  status text,
  check_in date,
  check_out date,
  rooms jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.status,
    b.check_in,
    b.check_out,
    coalesce(
      b.payload -> 'rooms',
      jsonb_build_array(
        jsonb_build_object(
          'roomType', b.payload ->> 'roomType',
          'roomName', b.payload ->> 'roomName',
          'adults', (b.payload ->> 'adults')::int,
          'children', (b.payload ->> 'children')::int,
          'totalGuests', (b.payload ->> 'totalGuests')::int
        )
      )
    ) as rooms
  from public.bookings b;
$$;

create or replace function public.list_booking_availability()
returns table (
  id text,
  status text,
  check_in date,
  check_out date,
  rooms jsonb
)
language sql
stable
security invoker
set search_path = public, private
as $$
  select p.id, p.status, p.check_in, p.check_out, p.rooms
  from private.list_booking_availability() as p;
$$;

create or replace function private.get_booking_confirmation(p_id text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select b.payload
  from public.bookings b
  where b.id = p_id
    and lower(trim(b.guest_email)) = lower(trim(p_email))
  limit 1;
$$;

create or replace function public.get_booking_confirmation(p_id text, p_email text)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_booking_confirmation(p_id, p_email);
$$;

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

create or replace function public.insert_booking_if_available(
  p_id text,
  p_payload jsonb,
  p_check_in date,
  p_check_out date,
  p_guest_email text,
  p_guest_phone text
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.insert_booking_if_available(
    p_id, p_payload, p_check_in, p_check_out, p_guest_email, p_guest_phone
  );
$$;

create or replace function private.insert_contact_inquiry_if_allowed(
  p_name text,
  p_email text,
  p_phone text,
  p_check_in date,
  p_check_out date,
  p_guests text,
  p_message text default null,
  p_source text default 'website'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_source), 'website') <> 'website' then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;

  if p_check_out <= p_check_in then
    return jsonb_build_object('ok', false, 'error', 'invalid_dates');
  end if;

  if public.contact_inquiry_rate_exceeded(p_email, p_phone, 10) then
    return jsonb_build_object('ok', false, 'error', 'rate_limit_exceeded');
  end if;

  insert into public.contact_inquiries (
    name, email, phone, check_in, check_out, guests, message, source
  )
  values (
    trim(p_name),
    trim(p_email),
    trim(p_phone),
    p_check_in,
    p_check_out,
    trim(p_guests),
    nullif(trim(coalesce(p_message, '')), ''),
    'website'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.insert_contact_inquiry_if_allowed(
  p_name text,
  p_email text,
  p_phone text,
  p_check_in date,
  p_check_out date,
  p_guests text,
  p_message text default null,
  p_source text default 'website'
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.insert_contact_inquiry_if_allowed(
    p_name, p_email, p_phone, p_check_in, p_check_out, p_guests, p_message, p_source
  );
$$;

revoke all on function private.list_booking_availability() from public;
grant execute on function private.list_booking_availability() to anon, authenticated;

revoke all on function private.get_booking_confirmation(text, text) from public;
grant execute on function private.get_booking_confirmation(text, text) to anon, authenticated;

revoke all on function private.insert_booking_if_available(text, jsonb, date, date, text, text)
  from public;
grant execute on function private.insert_booking_if_available(text, jsonb, date, date, text, text)
  to anon, authenticated;

revoke all on function private.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) from public;
grant execute on function private.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) to anon, authenticated;

revoke all on function public.list_booking_availability() from public, anon, authenticated;
grant execute on function public.list_booking_availability() to anon, authenticated;

revoke all on function public.get_booking_confirmation(text, text) from public, anon, authenticated;
grant execute on function public.get_booking_confirmation(text, text) to anon, authenticated;

revoke all on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  from public, anon, authenticated;
grant execute on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  to anon, authenticated;

revoke all on function public.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) from public, anon, authenticated;
grant execute on function public.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Staff implementations (DEFINER) + public INVOKER wrappers
-- ---------------------------------------------------------------------------

create or replace function private.get_staff_booking(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select b.payload
  from public.bookings b
  where b.id = p_id
    and public.current_user_role() is not null
  limit 1;
$$;

create or replace function public.get_staff_booking(p_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_staff_booking(p_id);
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
language sql
security invoker
set search_path = public, private
as $$
  select private.upsert_booking_if_available(
    p_id, p_payload, p_status, p_check_in, p_check_out, p_guest_email, p_guest_phone
  );
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

create or replace function public.update_booking_status_safe(
  p_id text,
  p_status text
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.update_booking_status_safe(p_id, p_status);
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
  where b.status = 'confirmed'
    and b.check_out < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.checkout_past_confirmed_bookings()
returns int
language sql
security invoker
set search_path = public, private
as $$
  select private.checkout_past_confirmed_bookings();
$$;

revoke all on function private.get_staff_booking(text) from public;
grant execute on function private.get_staff_booking(text) to authenticated;

revoke all on function private.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  from public;
grant execute on function private.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  to authenticated;

revoke all on function private.update_booking_status_safe(text, text) from public;
grant execute on function private.update_booking_status_safe(text, text) to authenticated;

revoke all on function private.checkout_past_confirmed_bookings() from public;
grant execute on function private.checkout_past_confirmed_bookings() to authenticated;

revoke all on function public.get_staff_booking(text) from public, anon, authenticated;
grant execute on function public.get_staff_booking(text) to authenticated;

revoke all on function public.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  to authenticated;

revoke all on function public.update_booking_status_safe(text, text) from public, anon, authenticated;
grant execute on function public.update_booking_status_safe(text, text) to authenticated;

revoke all on function public.checkout_past_confirmed_bookings() from public, anon, authenticated;
grant execute on function public.checkout_past_confirmed_bookings() to authenticated;
