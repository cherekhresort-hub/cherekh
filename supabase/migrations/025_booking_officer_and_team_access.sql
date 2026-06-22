-- booking_officer role + tighten RLS so booking officers cannot access housekeeping/staff

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'manager', 'booking_officer'));

create or replace function public.current_user_is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select public.current_user_role()) in ('admin', 'manager');
$$;

revoke all on function public.current_user_is_admin_or_manager() from anon, authenticated, public;
grant execute on function public.current_user_is_admin_or_manager() to authenticated;

-- contact_inquiries: booking officers can read and update (delete remains admin-only)
drop policy if exists "Admins and managers read contact inquiries" on public.contact_inquiries;
drop policy if exists "Staff read contact inquiries" on public.contact_inquiries;
create policy "Staff read contact inquiries"
  on public.contact_inquiries for select
  to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager', 'booking_officer'));

drop policy if exists "Admins and managers update contact inquiries" on public.contact_inquiries;
drop policy if exists "Staff update contact inquiries" on public.contact_inquiries;
create policy "Staff update contact inquiries"
  on public.contact_inquiries for update
  to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager', 'booking_officer'))
  with check ((select public.current_user_role()) in ('admin', 'manager', 'booking_officer'));

-- housekeeping_tasks: admin and manager only
drop policy if exists "Staff read housekeeping tasks" on public.housekeeping_tasks;
create policy "Admin and manager read housekeeping tasks"
  on public.housekeeping_tasks for select
  to authenticated
  using ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff insert housekeeping tasks" on public.housekeeping_tasks;
create policy "Admin and manager insert housekeeping tasks"
  on public.housekeeping_tasks for insert
  to authenticated
  with check ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff update housekeeping tasks" on public.housekeeping_tasks;
create policy "Admin and manager update housekeeping tasks"
  on public.housekeeping_tasks for update
  to authenticated
  using ((select public.current_user_is_admin_or_manager()))
  with check ((select public.current_user_is_admin_or_manager()));

-- staff_members: admin and manager only
drop policy if exists "Staff read staff members" on public.staff_members;
create policy "Admin and manager read staff members"
  on public.staff_members for select
  to authenticated
  using ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff insert staff members" on public.staff_members;
create policy "Admin and manager insert staff members"
  on public.staff_members for insert
  to authenticated
  with check ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff update staff members" on public.staff_members;
create policy "Admin and manager update staff members"
  on public.staff_members for update
  to authenticated
  using ((select public.current_user_is_admin_or_manager()))
  with check ((select public.current_user_is_admin_or_manager()));
