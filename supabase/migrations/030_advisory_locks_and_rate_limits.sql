-- Advisory locks for empty-calendar booking races + server-side submission rate limits.
-- Run after 029_staff_activity_log_admin_delete.sql

-- ---------------------------------------------------------------------------
-- Normalization helpers (immutable for index-friendly comparisons)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_guest_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create or replace function public.normalize_guest_phone(p_phone text)
returns text
language sql
immutable
as $$
  select regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g');
$$;

-- ---------------------------------------------------------------------------
-- Rate limits (server-side; complements client localStorage limits)
-- ---------------------------------------------------------------------------

create or replace function public.booking_submission_rate_exceeded(
  p_guest_email text,
  p_guest_phone text,
  p_max_per_hour int default 30
)
returns boolean
language sql
stable
set search_path = public
as $$
  select (
    select count(*)::int
    from public.bookings b
    where b.created_at > now() - interval '1 hour'
      and (
        (
          public.normalize_guest_email(b.guest_email) <> ''
          and public.normalize_guest_email(b.guest_email) = public.normalize_guest_email(p_guest_email)
        )
        or (
          public.normalize_guest_phone(b.guest_phone) <> ''
          and public.normalize_guest_phone(b.guest_phone) = public.normalize_guest_phone(p_guest_phone)
        )
      )
  ) >= greatest(p_max_per_hour, 1);
$$;

create or replace function public.contact_inquiry_rate_exceeded(
  p_email text,
  p_phone text,
  p_max_per_hour int default 10
)
returns boolean
language sql
stable
set search_path = public
as $$
  select (
    select count(*)::int
    from public.contact_inquiries c
    where c.created_at > now() - interval '1 hour'
      and (
        (
          public.normalize_guest_email(c.email) <> ''
          and public.normalize_guest_email(c.email) = public.normalize_guest_email(p_email)
        )
        or (
          public.normalize_guest_phone(c.phone) <> ''
          and public.normalize_guest_phone(c.phone) = public.normalize_guest_phone(p_phone)
        )
      )
  ) >= greatest(p_max_per_hour, 1);
$$;

-- ---------------------------------------------------------------------------
-- Advisory locks: serialize first claim on empty inventory slots
-- ---------------------------------------------------------------------------

create or replace function public.lock_booking_inventory_slots(
  p_check_in date,
  p_check_out date,
  p_payload jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  r record;
  v_date date;
  v_lock_key bigint;
  v_event_dates jsonb;
begin
  perform public.lock_overlapping_bookings(p_check_in, p_check_out);

  v_event_dates := p_payload->'eventDates';

  for r in
    select distinct room_type
    from public.booking_room_lines(p_payload)
  loop
    if r.room_type = 'conference'
      and jsonb_typeof(v_event_dates) = 'array'
      and jsonb_array_length(v_event_dates) > 0 then
      for v_date in
        select (d.val)::date
        from jsonb_array_elements_text(v_event_dates) as d(val)
      loop
        v_lock_key := hashtextextended('cherekh:conference:' || v_date::text, 0);
        perform pg_advisory_xact_lock(v_lock_key);
      end loop;
    else
      v_lock_key := hashtextextended(
        'cherekh:room:' || r.room_type || ':' || p_check_in::text || ':' || p_check_out::text,
        0
      );
      perform pg_advisory_xact_lock(v_lock_key);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guest booking insert (rate limit + advisory locks + inventory)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Staff upsert (advisory locks; no public rate limit)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Contact inquiries: RPC-only insert with server rate limit
-- ---------------------------------------------------------------------------

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

drop policy if exists "Anyone insert contact inquiries" on public.contact_inquiries;

revoke insert on public.contact_inquiries from anon, authenticated;

revoke all on function public.normalize_guest_email(text) from public;
revoke all on function public.normalize_guest_phone(text) from public;
revoke all on function public.booking_submission_rate_exceeded(text, text, int) from public;
revoke all on function public.contact_inquiry_rate_exceeded(text, text, int) from public;
revoke all on function public.lock_booking_inventory_slots(date, date, jsonb) from public;

revoke all on function public.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) from anon, authenticated, public;
grant execute on function public.insert_contact_inquiry_if_allowed(
  text, text, text, date, date, text, text, text
) to anon, authenticated;
