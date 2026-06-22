-- Tighten bookings RLS: anon inserts pending only; staff (user_roles) read/update/insert

drop policy if exists "Public insert bookings" on public.bookings;

create policy "Anon insert pending bookings"
  on public.bookings for insert
  to anon
  with check (status = 'pending');

drop policy if exists "Authenticated read bookings" on public.bookings;
drop policy if exists "Staff read bookings" on public.bookings;
create policy "Staff read bookings"
  on public.bookings for select
  to authenticated
  using (public.current_user_role() is not null);

drop policy if exists "Authenticated update bookings" on public.bookings;
drop policy if exists "Staff update bookings" on public.bookings;
create policy "Staff update bookings"
  on public.bookings for update
  to authenticated
  using (public.current_user_role() is not null)
  with check (public.current_user_role() is not null);

drop policy if exists "Staff insert bookings" on public.bookings;
create policy "Staff insert bookings"
  on public.bookings for insert
  to authenticated
  with check (public.current_user_role() is not null);
