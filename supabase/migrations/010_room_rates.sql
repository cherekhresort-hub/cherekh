-- Public room rates (admin-editable; read by website visitors)

create table if not exists public.room_rates (
  room_id text primary key,
  price integer not null check (price >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists room_rates_updated_at_idx on public.room_rates (updated_at desc);

alter table public.room_rates enable row level security;

drop policy if exists "Public read room rates" on public.room_rates;
create policy "Public read room rates"
  on public.room_rates for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin insert room rates" on public.room_rates;
create policy "Admin insert room rates"
  on public.room_rates for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "Admin update room rates" on public.room_rates;
create policy "Admin update room rates"
  on public.room_rates for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select on public.room_rates to anon, authenticated;
