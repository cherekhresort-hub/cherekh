-- Contact inquiries from website form
-- Run after 002_user_roles.sql in Supabase SQL Editor

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  check_in date not null,
  check_out date not null,
  guests text not null,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_inquiries_date_order check (check_out > check_in)
);

create index if not exists contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);

create index if not exists contact_inquiries_status_idx
  on public.contact_inquiries (status, created_at desc);

create or replace function public.touch_contact_inquiries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contact_inquiries_updated_at on public.contact_inquiries;
create trigger trg_contact_inquiries_updated_at
  before update on public.contact_inquiries
  for each row execute function public.touch_contact_inquiries_updated_at();

alter table public.contact_inquiries enable row level security;

drop policy if exists "Anyone insert contact inquiries" on public.contact_inquiries;
create policy "Anyone insert contact inquiries"
  on public.contact_inquiries for insert
  to anon, authenticated
  with check (source = 'website');

drop policy if exists "Admins and managers read contact inquiries" on public.contact_inquiries;
create policy "Admins and managers read contact inquiries"
  on public.contact_inquiries for select
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'));

drop policy if exists "Admins and managers update contact inquiries" on public.contact_inquiries;
create policy "Admins and managers update contact inquiries"
  on public.contact_inquiries for update
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

grant insert on public.contact_inquiries to anon, authenticated;
grant select, update on public.contact_inquiries to authenticated;
