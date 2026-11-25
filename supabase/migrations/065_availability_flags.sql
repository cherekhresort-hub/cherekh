-- Soft-disable rooms (renovation / out of service) and menu items (not available today).

alter table public.restaurant_menu_items
  add column if not exists available boolean not null default true;

alter table public.room_rates
  add column if not exists available boolean not null default true;

-- Managers need to take rooms offline for renovation without waiting on an admin.
drop policy if exists "Admin insert room rates" on public.room_rates;
create policy "Staff insert room rates"
  on public.room_rates for insert
  to authenticated
  with check ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Admin update room rates" on public.room_rates;
drop policy if exists "Staff update room rates" on public.room_rates;
create policy "Staff update room rates"
  on public.room_rates for update
  to authenticated
  using ((select public.current_user_is_admin_or_manager()))
  with check ((select public.current_user_is_admin_or_manager()));
