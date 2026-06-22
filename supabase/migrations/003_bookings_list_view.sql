-- Slim admin list reads (no full payload over the wire)
-- Run in Supabase SQL Editor after 001 and 002

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
  b.payload->'payment'->'discount' as payment_discount
from public.bookings b;

grant select on public.bookings_list to authenticated;
