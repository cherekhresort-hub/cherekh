-- Finance core: departments, categories, suppliers, accounts, projects, audit log.
-- Run after 041_final_restaurant_menu.sql
--
-- Access model (see docs/FINANCE.md):
--   admin           full access
--   manager         expenses only (read reference data, manage suppliers)
--   booking_officer none
-- Posted financial records are never hard-deleted (no delete policies).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Role helper
-- ---------------------------------------------------------------------------

create or replace function public.current_user_can_finance()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select public.current_user_role()) in ('admin', 'manager');
$$;

revoke all on function public.current_user_can_finance() from anon, authenticated, public;
grant execute on function public.current_user_can_finance() to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log (written only by trigger)
-- ---------------------------------------------------------------------------

create table if not exists public.fin_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_email text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fin_audit_log_record_idx on public.fin_audit_log (table_name, record_id);
create index if not exists fin_audit_log_created_idx on public.fin_audit_log (created_at desc);

alter table public.fin_audit_log enable row level security;

drop policy if exists "Admins read finance audit log" on public.fin_audit_log;
create policy "Admins read finance audit log"
  on public.fin_audit_log for select to authenticated
  using ((select public.current_user_role()) = 'admin');

create or replace function private.fin_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.fin_audit_log (table_name, record_id, action, actor_email, old_data, new_data)
  values (
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id'),
    tg_op,
    nullif(coalesce((select auth.jwt()) ->> 'email', ''), ''),
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.fin_audit_trigger() from public, anon, authenticated;

create or replace function private.fin_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.fin_touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------

create table if not exists public.fin_departments (
  id text primary key,
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories (top level A-Z + subcategories via parent_id)
-- ---------------------------------------------------------------------------

create table if not exists public.fin_categories (
  id text primary key,
  parent_id text references public.fin_categories (id) on delete restrict,
  code text,
  name text not null,
  classification text not null default 'operating_expense'
    check (classification in (
      'operating_expense', 'inventory', 'capital_asset',
      'deposit_advance', 'financing_cost', 'other'
    )),
  department_id text references public.fin_departments (id) on delete set null,
  requires_approval boolean not null default false,
  approval_threshold numeric(14, 2) check (approval_threshold is null or approval_threshold >= 0),
  requires_description boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fin_categories_parent_idx on public.fin_categories (parent_id);

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------

create table if not exists public.fin_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fin_suppliers_name_idx on public.fin_suppliers (lower(name));

-- ---------------------------------------------------------------------------
-- Money accounts (cash drawer, bank, mobile wallets)
-- ---------------------------------------------------------------------------

create table if not exists public.fin_accounts (
  id text primary key,
  name text not null,
  account_type text not null default 'cash'
    check (account_type in ('cash', 'bank', 'mobile_wallet', 'other')),
  institution text,
  account_last4 text,
  opening_balance numeric(14, 2) not null default 0,
  opening_date date,
  -- Booking payment methods whose receipts land in this account.
  default_methods text[] not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projects (fund allocation / cost tracking targets)
-- ---------------------------------------------------------------------------

create table if not exists public.fin_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id text references public.fin_departments (id) on delete set null,
  description text,
  budget numeric(14, 2) check (budget is null or budget >= 0),
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['fin_departments', 'fin_categories', 'fin_suppliers', 'fin_accounts', 'fin_projects']
  loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
         for each row execute function private.fin_audit_trigger()', t, t);
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function private.fin_touch_updated_at()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.fin_departments enable row level security;
alter table public.fin_categories enable row level security;
alter table public.fin_suppliers enable row level security;
alter table public.fin_accounts enable row level security;
alter table public.fin_projects enable row level security;

-- Reference data: admin + manager read, admin writes.
do $$
declare
  t text;
begin
  foreach t in array array['fin_departments', 'fin_categories', 'fin_accounts', 'fin_projects']
  loop
    execute format('drop policy if exists "Finance staff read %s" on public.%I', t, t);
    execute format(
      'create policy "Finance staff read %s" on public.%I for select to authenticated
         using ((select public.current_user_role()) in (''admin'', ''manager''))', t, t);
    execute format('drop policy if exists "Admins insert %s" on public.%I', t, t);
    execute format(
      'create policy "Admins insert %s" on public.%I for insert to authenticated
         with check ((select public.current_user_role()) = ''admin'')', t, t);
    execute format('drop policy if exists "Admins update %s" on public.%I', t, t);
    execute format(
      'create policy "Admins update %s" on public.%I for update to authenticated
         using ((select public.current_user_role()) = ''admin'')
         with check ((select public.current_user_role()) = ''admin'')', t, t);
  end loop;
end;
$$;

-- Suppliers: admin + manager read/insert/update.
drop policy if exists "Finance staff read suppliers" on public.fin_suppliers;
create policy "Finance staff read suppliers"
  on public.fin_suppliers for select to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'));

drop policy if exists "Finance staff insert suppliers" on public.fin_suppliers;
create policy "Finance staff insert suppliers"
  on public.fin_suppliers for insert to authenticated
  with check ((select public.current_user_role()) in ('admin', 'manager'));

drop policy if exists "Finance staff update suppliers" on public.fin_suppliers;
create policy "Finance staff update suppliers"
  on public.fin_suppliers for update to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'))
  with check ((select public.current_user_role()) in ('admin', 'manager'));

revoke all on
  public.fin_departments, public.fin_categories, public.fin_suppliers,
  public.fin_accounts, public.fin_projects, public.fin_audit_log
  from anon, authenticated;
grant select, insert, update on
  public.fin_departments, public.fin_categories, public.fin_suppliers,
  public.fin_accounts, public.fin_projects
  to authenticated;
grant select on public.fin_audit_log to authenticated;
