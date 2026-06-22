-- Supabase security advisor: remove SECURITY DEFINER views
-- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- 1) Admin list: caller's RLS on public.bookings (staff via user_roles)
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
  b.payload->'payment'->'discount' as payment_discount
from public.bookings b;

grant select on public.bookings_list to authenticated;

-- 2) Public availability: replace definer view with a narrow RPC (no guest PII)
drop view if exists public.booking_availability;

create or replace function public.list_booking_availability()
returns table (
  id text,
  status text,
  check_in date,
  check_out date,
  rooms jsonb
)
language sql
security definer
set search_path = public
stable
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

revoke all on function public.list_booking_availability() from public;
grant execute on function public.list_booking_availability() to anon, authenticated;
