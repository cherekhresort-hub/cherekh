-- Housekeeping workflow: staff-linked assignment, cleaning history, checkout
-- marks rooms dirty, realtime board updates.
-- Run after 063_staff_termination.sql

-- 1. Assignment by staff record (assigned_to stays as the name snapshot).
alter table public.housekeeping_tasks
  add column if not exists assigned_staff_id text
    references public.staff_members (id) on delete set null;

-- 2. Cleaning history. Written only by triggers; admins and managers can read.
create table if not exists public.housekeeping_log (
  id bigint generated always as identity primary key,
  task_id text not null,
  room_id text not null,
  room_number text not null,
  event text not null check (event in ('status', 'assigned')),
  from_status text,
  to_status text,
  assigned_staff_id text,
  assigned_to text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer,
  reason text,
  booking_id text,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists housekeeping_log_created_idx
  on public.housekeeping_log (created_at desc);
create index if not exists housekeeping_log_room_idx
  on public.housekeeping_log (room_id, created_at desc);

alter table public.housekeeping_log enable row level security;

drop policy if exists "Admin and manager read housekeeping log" on public.housekeeping_log;
create policy "Admin and manager read housekeeping log"
  on public.housekeeping_log for select
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'));

revoke insert, update, delete on public.housekeeping_log from anon, authenticated;
grant select on public.housekeeping_log to authenticated;

create or replace function private.housekeeping_log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
  v_reason text := nullif(current_setting('cherekh.housekeeping_reason', true), '');
  v_booking text := nullif(current_setting('cherekh.housekeeping_booking', true), '');
  v_duration integer;
begin
  if new.status is distinct from old.status then
    if new.status = 'ready' and new.started_at is not null and new.completed_at is not null
       and new.completed_at >= new.started_at then
      v_duration := round(extract(epoch from (new.completed_at - new.started_at)) / 60);
    end if;

    insert into public.housekeeping_log (
      task_id, room_id, room_number, event, from_status, to_status,
      assigned_staff_id, assigned_to, started_at, completed_at, duration_minutes,
      reason, booking_id, actor_email
    ) values (
      new.id, new.room_id, new.room_number, 'status', old.status, new.status,
      new.assigned_staff_id, new.assigned_to, new.started_at, new.completed_at, v_duration,
      v_reason, v_booking, v_actor
    );
  end if;

  if new.assigned_staff_id is distinct from old.assigned_staff_id
     or coalesce(new.assigned_to, '') is distinct from coalesce(old.assigned_to, '') then
    insert into public.housekeeping_log (
      task_id, room_id, room_number, event, from_status, to_status,
      assigned_staff_id, assigned_to, reason, booking_id, actor_email
    ) values (
      new.id, new.room_id, new.room_number, 'assigned', old.status, new.status,
      new.assigned_staff_id, new.assigned_to, v_reason, v_booking, v_actor
    );
  end if;

  return new;
end;
$$;

revoke all on function private.housekeeping_log_change() from public, anon, authenticated;

drop trigger if exists housekeeping_tasks_log_change on public.housekeeping_tasks;
create trigger housekeeping_tasks_log_change
  after update on public.housekeeping_tasks
  for each row execute function private.housekeeping_log_change();

-- 3. Checking a guest out marks the booked rooms dirty. Rooms already cleaned
-- after the guest left (e.g. a late auto-checkout) and rooms being cleaned
-- right now are left alone.
create or replace function private.housekeeping_on_checkout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rooms jsonb;
  v_departed timestamptz;
begin
  if new.status is distinct from 'checked-out' or old.status is not distinct from 'checked-out' then
    return new;
  end if;

  v_rooms := case
    when jsonb_typeof(new.payload -> 'rooms') = 'array' and jsonb_array_length(new.payload -> 'rooms') > 0
      then new.payload -> 'rooms'
    else jsonb_build_array(jsonb_build_object('roomType', new.payload ->> 'roomType'))
  end;

  v_departed := least(now(), (new.check_out + time '12:00') at time zone 'Asia/Dhaka');

  perform set_config('cherekh.housekeeping_reason', 'checkout', true);
  perform set_config('cherekh.housekeeping_booking', new.id, true);

  update public.housekeeping_tasks t
     set status = 'dirty',
         started_at = null,
         completed_at = null,
         updated_at = now()
   where t.room_id in (
           select distinct r ->> 'roomType'
             from jsonb_array_elements(v_rooms) r
            where coalesce(r ->> 'roomType', '') <> ''
         )
     and t.status = 'ready'
     and (t.completed_at is null or t.completed_at < v_departed);

  perform set_config('cherekh.housekeeping_reason', '', true);
  perform set_config('cherekh.housekeeping_booking', '', true);

  return new;
end;
$$;

revoke all on function private.housekeeping_on_checkout() from public, anon, authenticated;

drop trigger if exists bookings_housekeeping_on_checkout on public.bookings;
create trigger bookings_housekeeping_on_checkout
  after update of status on public.bookings
  for each row execute function private.housekeeping_on_checkout();

-- 4. Live board updates on every signed-in admin/manager device (delivery
-- follows the housekeeping_tasks select policy).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'housekeeping_tasks'
     )
  then
    alter publication supabase_realtime add table public.housekeeping_tasks;
  end if;
end
$$;
