-- Expenses & purchases: documents, line items, asset register, deposit settlements.
-- Run after 043_finance_seed_categories.sql
--
-- Expenses are documents. Money movements against them live in
-- fin_ledger_entries (045). All writes go through RPCs (048); there are no
-- insert/update/delete policies on these tables.

create sequence if not exists public.fin_expense_seq;
create sequence if not exists public.fin_asset_seq;

create table if not exists public.fin_expenses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  txn_date date not null,
  invoice_date date,
  due_date date,
  supplier_id uuid references public.fin_suppliers (id) on delete restrict,
  payee_name text,
  department_id text references public.fin_departments (id) on delete restrict,
  project_id uuid references public.fin_projects (id) on delete restrict,
  -- FK added in 046 once fin_allocations exists.
  allocation_id uuid,
  phase text not null default 'operating'
    check (phase in ('pre_opening', 'operating', 'expansion')),
  description text,
  currency text not null default 'BDT',
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  tax numeric(14, 2) not null default 0 check (tax >= 0),
  additional_charges numeric(14, 2) not null default 0 check (additional_charges >= 0),
  total numeric(14, 2) not null check (total >= 0),
  paid_by_type text not null default 'company'
    check (paid_by_type in ('company', 'employee')),
  employee_staff_id text references public.staff_members (id) on delete set null,
  employee_name text,
  purchased_by text,
  requested_by text,
  approval_status text not null default 'not_required'
    check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  approved_by text,
  approved_at timestamptz,
  approval_note text,
  tags text[] not null default '{}',
  notes text,
  status text not null default 'active' check (status in ('active', 'void')),
  void_reason text,
  voided_by text,
  voided_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_expenses_total_reconciles
    check (abs(total - (subtotal - discount + tax + additional_charges)) < 0.01),
  constraint fin_expenses_employee_named
    check (paid_by_type = 'company' or coalesce(employee_staff_id, employee_name) is not null),
  constraint fin_expenses_void_reason
    check (status = 'active' or coalesce(void_reason, '') <> '')
);

create index if not exists fin_expenses_txn_date_idx on public.fin_expenses (txn_date desc);
create index if not exists fin_expenses_supplier_idx on public.fin_expenses (supplier_id);
create index if not exists fin_expenses_allocation_idx on public.fin_expenses (allocation_id);

create table if not exists public.fin_expense_lines (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.fin_expenses (id) on delete restrict,
  line_no int not null,
  description text not null,
  category_id text not null references public.fin_categories (id) on delete restrict,
  -- Snapshot at posting time so later category edits don't rewrite history.
  classification text not null
    check (classification in (
      'operating_expense', 'inventory', 'capital_asset',
      'deposit_advance', 'financing_cost', 'other'
    )),
  quantity numeric(14, 3) not null default 1 check (quantity > 0),
  unit text,
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  constraint fin_expense_lines_total check (abs(line_total - round(quantity * unit_price, 2)) < 0.01),
  unique (expense_id, line_no)
);

create index if not exists fin_expense_lines_expense_idx on public.fin_expense_lines (expense_id);
create index if not exists fin_expense_lines_category_idx on public.fin_expense_lines (category_id);

create table if not exists public.fin_assets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category_id text references public.fin_categories (id) on delete restrict,
  expense_id uuid references public.fin_expenses (id) on delete restrict,
  expense_line_id uuid references public.fin_expense_lines (id) on delete restrict,
  department_id text references public.fin_departments (id) on delete restrict,
  supplier_id uuid references public.fin_suppliers (id) on delete restrict,
  purchase_date date not null,
  quantity numeric(14, 3) not null default 1,
  cost numeric(14, 2) not null check (cost >= 0),
  location text,
  serial_number text,
  warranty_until date,
  -- Depreciation only when the user enters a useful life.
  useful_life_months int check (useful_life_months is null or useful_life_months > 0),
  salvage_value numeric(14, 2) not null default 0 check (salvage_value >= 0),
  status text not null default 'active'
    check (status in ('active', 'disposed', 'written_off', 'void')),
  disposal_date date,
  disposal_note text,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fin_assets_expense_idx on public.fin_assets (expense_id);

create table if not exists public.fin_deposit_settlements (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.fin_expenses (id) on delete restrict,
  settlement_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  kind text not null check (kind in ('refund_received', 'applied', 'written_off')),
  -- refund_received: cash back (ledger entry in 045)
  -- applied: offset against another expense (non-cash payment of that expense)
  -- written_off: becomes an operating expense on settlement_date
  ledger_entry_id uuid,
  applied_expense_id uuid references public.fin_expenses (id) on delete restrict,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint fin_deposit_settlements_applied_target
    check (kind <> 'applied' or applied_expense_id is not null)
);

create index if not exists fin_deposit_settlements_expense_idx on public.fin_deposit_settlements (expense_id);
create index if not exists fin_deposit_settlements_applied_idx on public.fin_deposit_settlements (applied_expense_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['fin_expenses', 'fin_expense_lines', 'fin_assets', 'fin_deposit_settlements']
  loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
         for each row execute function private.fin_audit_trigger()', t, t);
  end loop;
  foreach t in array array['fin_expenses', 'fin_assets']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function private.fin_touch_updated_at()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: admin + manager read. Writes only via RPCs (048).
-- Asset metadata (location, serial, useful life) is editable by admins.
-- ---------------------------------------------------------------------------

alter table public.fin_expenses enable row level security;
alter table public.fin_expense_lines enable row level security;
alter table public.fin_assets enable row level security;
alter table public.fin_deposit_settlements enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['fin_expenses', 'fin_expense_lines', 'fin_assets', 'fin_deposit_settlements']
  loop
    execute format('drop policy if exists "Finance staff read %s" on public.%I', t, t);
    execute format(
      'create policy "Finance staff read %s" on public.%I for select to authenticated
         using ((select public.current_user_role()) in (''admin'', ''manager''))', t, t);
  end loop;
end;
$$;

drop policy if exists "Admins update fin_assets" on public.fin_assets;
create policy "Admins update fin_assets"
  on public.fin_assets for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

revoke all on
  public.fin_expenses, public.fin_expense_lines, public.fin_assets, public.fin_deposit_settlements
  from anon, authenticated;
revoke all on sequence public.fin_expense_seq, public.fin_asset_seq from anon, authenticated;
grant select on
  public.fin_expenses, public.fin_expense_lines, public.fin_assets, public.fin_deposit_settlements
  to authenticated;
grant update (name, location, serial_number, warranty_until, useful_life_months,
              salvage_value, status, disposal_date, disposal_note, notes, department_id)
  on public.fin_assets to authenticated;
