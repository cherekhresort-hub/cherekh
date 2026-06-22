-- Central staff activity log (all roles). Admins read; staff insert their own rows.

create table if not exists public.staff_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_role text not null check (actor_role in ('admin', 'manager', 'booking_officer')),
  category text not null check (
    category in ('booking', 'housekeeping', 'guest', 'staff', 'inquiry', 'settings', 'team', 'system')
  ),
  action text not null,
  title text not null,
  message text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_activity_log_created_at_idx
  on public.staff_activity_log (created_at desc);

create index if not exists staff_activity_log_actor_email_idx
  on public.staff_activity_log (lower(actor_email), created_at desc);

create index if not exists staff_activity_log_category_idx
  on public.staff_activity_log (category, created_at desc);

alter table public.staff_activity_log enable row level security;

drop policy if exists "Staff insert own activity" on public.staff_activity_log;
create policy "Staff insert own activity"
  on public.staff_activity_log for insert
  to authenticated
  with check (
    lower(actor_email) = lower((select public.current_auth_email()))
    and actor_role = (
      select role
      from public.user_roles
      where lower(email) = lower((select public.current_auth_email()))
      limit 1
    )
  );

drop policy if exists "Admins read activity log" on public.staff_activity_log;
create policy "Admins read activity log"
  on public.staff_activity_log for select
  to authenticated
  using ((select public.current_user_is_admin()));

grant select, insert on public.staff_activity_log to authenticated;
