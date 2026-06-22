-- Housekeeping kanban tasks (staff editable)

create table if not exists public.housekeeping_tasks (
  id text primary key,
  room_id text not null,
  room_number text not null,
  assigned_to text,
  status text not null check (status in ('dirty', 'cleaning', 'ready')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  estimated_minutes integer not null default 30 check (estimated_minutes >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index if not exists housekeeping_tasks_room_id_idx
  on public.housekeeping_tasks (room_id);

alter table public.housekeeping_tasks enable row level security;

drop policy if exists "Staff read housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff read housekeeping tasks"
  on public.housekeeping_tasks for select
  to authenticated
  using (public.current_user_role() is not null);

drop policy if exists "Staff insert housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff insert housekeeping tasks"
  on public.housekeeping_tasks for insert
  to authenticated
  with check (public.current_user_role() is not null);

drop policy if exists "Staff update housekeeping tasks" on public.housekeeping_tasks;
create policy "Staff update housekeeping tasks"
  on public.housekeeping_tasks for update
  to authenticated
  using (public.current_user_role() is not null)
  with check (public.current_user_role() is not null);

grant select, insert, update on public.housekeeping_tasks to authenticated;
