-- Published site settings (contact, check-in/out) — admin editable, public readable

create table if not exists public.site_settings (
  id text primary key default 'default',
  resort_name text not null default 'Cherekh Center',
  tagline text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  check_in_time text not null default '14:00',
  check_out_time text not null default '11:00',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 'default')
);

alter table public.site_settings enable row level security;

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin insert site settings" on public.site_settings;
create policy "Admin insert site settings"
  on public.site_settings for insert
  to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "Admin update site settings" on public.site_settings;
create policy "Admin update site settings"
  on public.site_settings for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select on public.site_settings to anon, authenticated;
