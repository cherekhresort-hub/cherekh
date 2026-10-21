-- Record who created each booking: staff (email + role, set by the admin panel)
-- or the public website. Anonymous inserts are always stamped "website" so a
-- guest cannot claim a staff creator.

create or replace view public.bookings_list
with (security_invoker = true)
as
select
  b.id,
  b.status,
  b.check_in,
  b.check_out,
  b.guest_email,
  b.guest_phone,
  b.created_at,
  b.updated_at,
  coalesce(b.payload->>'name', '') as guest_name,
  coalesce(b.payload->>'roomName', '') as room_name,
  coalesce(b.payload->>'roomType', '') as room_type,
  coalesce((b.payload->>'adults')::int, 0) as adults,
  coalesce((b.payload->>'children')::int, 0) as children,
  coalesce((b.payload->>'totalGuests')::int, 0) as total_guests,
  coalesce(b.payload->'rooms', '[]'::jsonb) as rooms,
  coalesce(b.payload->>'specialRequests', '') as special_requests,
  coalesce((b.payload#>>'{payment,amount}')::numeric, 0) as payment_amount,
  coalesce(b.payload#>>'{payment,status}', 'pending') as payment_status,
  b.payload->'payment'->'discount' as payment_discount,
  coalesce((
    select sum(
      case
        when coalesce(t->>'type', 'payment') in ('payment', 'adjustment')
          then coalesce((t->>'amount')::numeric, 0)
        when t->>'type' = 'refund'
          then -abs(coalesce((t->>'amount')::numeric, 0))
        else 0
      end
    )
    from jsonb_array_elements(
      coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
    ) as t
  ), 0) as payment_net,
  coalesce(jsonb_array_length(
    coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
  ), 0) as payment_tx_count,
  last_tx.amount as payment_last_amount,
  last_tx.type as payment_last_type,
  last_tx.method as payment_last_method,
  last_tx.recorded_at as payment_last_at,
  coalesce((
    select sum(coalesce((e->>'amount')::numeric, 0))
    from jsonb_array_elements(coalesce(b.payload->'extras', '[]'::jsonb)) as e
  ), 0) as extras_total,
  b.payload->'bookedBy' as booked_by
from public.bookings b
left join lateral (
  select
    coalesce((t->>'amount')::numeric, 0) as amount,
    coalesce(t->>'type', 'payment') as type,
    nullif(t->>'method', '') as method,
    nullif(t->>'recordedAt', '') as recorded_at
  from jsonb_array_elements(
    coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
  ) as t
  order by coalesce(t->>'recordedAt', '') desc
  limit 1
) last_tx on true;

grant select on public.bookings_list to authenticated;

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
    jsonb_set(
      jsonb_set(p_payload, '{status}', '"pending"', true),
      '{bookedBy}',
      '{"type": "website"}'::jsonb,
      true
    ),
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
