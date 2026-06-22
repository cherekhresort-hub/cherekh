-- Per-admin read state for staff activity log entries.

create table if not exists public.staff_activity_reads (
  activity_id uuid not null references public.staff_activity_log(id) on delete cascade,
  admin_email text not null,
  read_at timestamptz not null default now(),
  primary key (activity_id, admin_email)
);

create index if not exists staff_activity_reads_admin_email_idx
  on public.staff_activity_reads (lower(admin_email), read_at desc);

alter table public.staff_activity_reads enable row level security;

drop policy if exists "Admins read own activity reads" on public.staff_activity_reads;
create policy "Admins read own activity reads"
  on public.staff_activity_reads for select
  to authenticated
  using (
    (select public.current_user_is_admin())
    and lower(admin_email) = lower((select public.current_auth_email()))
  );

drop policy if exists "Admins insert own activity reads" on public.staff_activity_reads;
create policy "Admins insert own activity reads"
  on public.staff_activity_reads for insert
  to authenticated
  with check (
    (select public.current_user_is_admin())
    and lower(admin_email) = lower((select public.current_auth_email()))
  );

grant select, insert on public.staff_activity_reads to authenticated;
