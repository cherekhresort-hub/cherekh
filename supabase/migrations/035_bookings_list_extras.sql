-- Include food / other extras on the slim admin list so outstanding stays correct.

drop view if exists public.bookings_list;

create view public.bookings_list
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
  ), 0) as extras_total
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
