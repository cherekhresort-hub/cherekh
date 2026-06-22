-- Staff roster (admin + manager editable; delete admin-only)

create table if not exists public.staff_members (
  id text primary key,
  name text not null,
  role text not null,
  phone text not null default '',
  email text,
  shift text not null,
  status text not null,
  avatar_color text not null default '#1E4D2B',
  updated_at timestamptz not null default now(),
  constraint staff_members_shift_check
    check (shift in ('morning', 'afternoon', 'night', 'off')),
  constraint staff_members_status_check
    check (status in ('on-duty', 'on-break', 'off-duty'))
);

create index if not exists staff_members_name_idx on public.staff_members (name);

alter table public.staff_members enable row level security;

drop policy if exists "Staff read staff members" on public.staff_members;
create policy "Staff read staff members"
  on public.staff_members for select
  to authenticated
  using (public.current_user_role() is not null);

drop policy if exists "Staff insert staff members" on public.staff_members;
create policy "Staff insert staff members"
  on public.staff_members for insert
  to authenticated
  with check (public.current_user_role() is not null);

drop policy if exists "Staff update staff members" on public.staff_members;
create policy "Staff update staff members"
  on public.staff_members for update
  to authenticated
  using (public.current_user_role() is not null)
  with check (public.current_user_role() is not null);

drop policy if exists "Admin delete staff members" on public.staff_members;
create policy "Admin delete staff members"
  on public.staff_members for delete
  to authenticated
  using (public.current_user_is_admin());

grant select, insert, update, delete on public.staff_members to authenticated;
