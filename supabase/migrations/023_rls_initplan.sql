-- Performance advisor: wrap auth/role calls in RLS with (select ...) for initplan caching
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt()) ->> 'email', '');
$$;

revoke all on function public.current_auth_email() from anon, authenticated, public;
grant execute on function public.current_auth_email() to authenticated;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where lower(email) = lower((select public.current_auth_email()))
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select public.current_user_role()) = 'admin';
$$;

-- user_roles
drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role"
  on public.user_roles for select
  to authenticated
  using (lower(email) = lower((select public.current_auth_email())));

-- bookings
drop policy if exists "Admin delete bookings" on public.bookings;
create policy "Admin delete bookings"
  on public.bookings for delete
  to authenticated
  using ((select public.current_user_is_admin()));

drop policy if exists "Staff read bookings" on public.bookings;
create policy "Staff read bookings"
  on public.bookings for select
  to authenticated
  using ((select public.current_user_role()) is not null);

drop policy if exists "Staff update bookings" on public.bookings;
create policy "Staff update bookings"
  on public.bookings for update
  to authenticated
  using ((select public.current_user_role()) is not null)
  with check ((select public.current_user_role()) is not null);

drop policy if exists "Staff insert bookings" on public.bookings;
create policy "Staff insert bookings"
  on public.bookings for insert
  to authenticated
  with check ((select public.current_user_role()) is not null);

-- admin_notifications
drop policy if exists "Managers insert notifications" on public.admin_notifications;
create policy "Managers insert notifications"
  on public.admin_notifications for insert
  to authenticated
  with check ((select public.current_user_role()) = 'manager');

drop policy if exists "Admins read notifications" on public.admin_notifications;
create policy "Admins read notifications"
  on public.admin_notifications for select
  to authenticated
  using ((select public.current_user_is_admin()));

drop policy if exists "Admins update notifications" on public.admin_notifications;
create policy "Admins update notifications"
  on public.admin_notifications for update
  to authenticated
  using ((select public.current_user_is_admin()))
  with check ((select public.current_user_is_admin()));

-- contact_inquiries
drop policy if exists "Admins and managers read contact inquiries" on public.contact_inquiries;
create policy "Admins and managers read contact inquiries"
  on public.contact_inquiries for select
  to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'));

drop policy if exists "Admins and managers update contact inquiries" on public.contact_inquiries;
create policy "Admins and managers update contact inquiries"
  on public.contact_inquiries for update
  to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'))
  with check ((select public.current_user_role()) in ('admin', 'manager'));

drop policy if exists "Admins delete contact inquiries" on public.contact_inquiries;
create policy "Admins delete contact inquiries"
  on public.contact_inquiries for delete
  to authenticated
  using ((select public.current_user_is_admin()));

-- room_rates
drop policy if exists "Admin insert room rates" on public.room_rates;
create policy "Admin insert room rates"
  on public.room_rates for insert
  to authenticated
  with check ((select public.current_user_is_admin()));

drop policy if exists "Admin update room rates" on public.room_rates;
create policy "Admin update room rates"
  on public.room_rates for update
  to authenticated
  using ((select public.current_user_is_admin()))
  with check ((select public.current_user_is_admin()));

-- site_settings
drop policy if exists "Admin insert site settings" on public.site_settings;
create policy "Admin insert site settings"
  on public.site_settings for insert
  to authenticated
  with check ((select public.current_user_is_admin()));

drop policy if exists "Admin update site settings" on public.site_settings;
create policy "Admin update site settings"
  on public.site_settings for update
  to authenticated
  using ((select public.current_user_is_admin()))
  with check ((select public.current_user_is_admin()));

-- housekeeping_tasks
drop policy if exists "Staff read housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff read housekeeping tasks"
  on public.housekeeping_tasks for select
  to authenticated
  using ((select public.current_user_role()) is not null);

drop policy if exists "Staff insert housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff insert housekeeping tasks"
  on public.housekeeping_tasks for insert
  to authenticated
  with check ((select public.current_user_role()) is not null);

drop policy if exists "Staff update housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff update housekeeping tasks"
  on public.housekeeping_tasks for update
  to authenticated
  using ((select public.current_user_role()) is not null)
  with check ((select public.current_user_role()) is not null);

-- staff_members
drop policy if exists "Staff read staff members" on public.staff_members;
create policy "Staff read staff members"
  on public.staff_members for select
  to authenticated
  using ((select public.current_user_role()) is not null);

drop policy if exists "Staff insert staff members" on public.staff_members;
create policy "Staff insert staff members"
  on public.staff_members for insert
  to authenticated
  with check ((select public.current_user_role()) is not null);

drop policy if exists "Staff update staff members" on public.staff_members;
create policy "Staff update staff members"
  on public.staff_members for update
  to authenticated
  using ((select public.current_user_role()) is not null)
  with check ((select public.current_user_role()) is not null);

drop policy if exists "Admin delete staff members" on public.staff_members;
create policy "Admin delete staff members"
  on public.staff_members for delete
  to authenticated
  using ((select public.current_user_is_admin()));
