-- Admin / manager roles for the admin dashboard
-- Run after 001_bookings.sql in Supabase SQL Editor

create table if not exists public.user_roles (
  email text primary key,
  role text not null check (role in ('admin', 'manager')),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- Seed accounts (passwords are set in Authentication → Users)
insert into public.user_roles (email, role)
values
  ('malthas.dev01@gmail.com', 'admin'),
  ('cherekhresort@gmail.com', 'manager')
on conflict (email) do update
  set role = excluded.role,
      updated_at = now();     

-- Link auth.users id when someone signs in (optional, helps auditing)
create or replace function public.sync_user_role_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_roles
  set user_id = new.id,
      updated_at = now()
  where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_role on auth.users;
create trigger on_auth_user_created_sync_role
  after insert on auth.users
  for each row
  execute function public.sync_user_role_id();

-- Resolve email from JWT (initplan-safe; not used directly in RLS policies)
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

-- Resolve role from JWT email
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

alter table public.user_roles enable row level security;

drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role"
  on public.user_roles for select
  to authenticated
  using (lower(email) = lower((select public.current_auth_email())));

grant select on public.user_roles to authenticated;

-- Replace open delete policy: only admins may delete bookings
drop policy if exists "Authenticated delete bookings" on public.bookings;

drop policy if exists "Admin delete bookings" on public.bookings;
create policy "Admin delete bookings"
  on public.bookings for delete
  to authenticated
  using ((select public.current_user_is_admin()));
