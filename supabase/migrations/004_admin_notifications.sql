-- Manager → admin activity notifications
-- Run after 002_user_roles.sql in Supabase SQL Editor

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_role text not null default 'manager' check (actor_role = 'manager'),
  category text not null check (category in ('booking', 'housekeeping', 'guest', 'staff', 'system')),
  action text not null,
  title text not null,
  message text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (read, created_at desc)
  where read = false;

alter table public.admin_notifications enable row level security;

drop policy if exists "Managers insert notifications" on public.admin_notifications;
create policy "Managers insert notifications"
  on public.admin_notifications for insert
  to authenticated
  with check (public.current_user_role() = 'manager');

drop policy if exists "Admins read notifications" on public.admin_notifications;
create policy "Admins read notifications"
  on public.admin_notifications for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "Admins update notifications" on public.admin_notifications;
create policy "Admins update notifications"
  on public.admin_notifications for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select, insert, update on public.admin_notifications to authenticated;
