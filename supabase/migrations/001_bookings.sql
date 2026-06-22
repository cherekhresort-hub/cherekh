-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Project: llbfrmecyozjlbhgggdx

create table if not exists public.bookings (
  id text primary key,
  payload jsonb not null,
  status text not null default 'pending',
  check_in date not null,
  check_out date not null,
  guest_email text,
  guest_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_dates_idx on public.bookings (check_in, check_out);
create index if not exists bookings_updated_idx on public.bookings (updated_at desc);

-- Availability helper: anon-safe RPC (replaces SECURITY DEFINER view in 020)
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

alter table public.bookings enable row level security;

drop policy if exists "Public insert bookings" on public.bookings;
create policy "Public insert bookings"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated read bookings" on public.bookings;
create policy "Authenticated read bookings"
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists "Authenticated update bookings" on public.bookings;
create policy "Authenticated update bookings"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated delete bookings" on public.bookings;
create policy "Authenticated delete bookings"
  on public.bookings for delete
  to authenticated
  using (true);

-- Anon reads availability via RPC only (no direct SELECT on bookings).
revoke all on public.bookings from anon;
revoke all on function public.list_booking_availability() from public;
grant execute on function public.list_booking_availability() to anon, authenticated;
grant select, insert, update, delete on public.bookings to authenticated;

-- Realtime (optional): enable replication for bookings in Dashboard → Database → Replication
