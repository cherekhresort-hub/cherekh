-- Raise public booking rate limit to 30/hour (contact form stays 10/hour).
-- Run if you already applied 030_advisory_locks_and_rate_limits.sql with the old limit of 5.

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
