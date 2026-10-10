-- Investments: investors, funding agreements, loan schedules, fund allocations.
-- Run after 045_finance_ledger.sql
--
-- Admin only. Funding received is recorded as ledger entries linked to the
-- agreement (investment_id); allocations are plans, not cash movements.

create sequence if not exists public.fin_investment_seq;

create table if not exists public.fin_investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  investor_type text not null default 'individual'
    check (investor_type in ('owner', 'individual', 'company', 'bank', 'government', 'ngo', 'other')),
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

create table if not exists public.fin_investments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  investor_id uuid not null references public.fin_investors (id) on delete restrict,
  name text not null,
  funding_type text not null check (funding_type in (
    'owner_capital', 'external_equity', 'shareholder_loan', 'business_loan',
    'grant', 'restricted_project', 'equipment_financing', 'other'
  )),
  agreement_date date,
  agreement_reference text,
  amount_committed numeric(14, 2) not null default 0 check (amount_committed >= 0),
  currency text not null default 'BDT',
  -- Equity-only fields
  ownership_pct numeric(6, 3) check (ownership_pct is null or (ownership_pct >= 0 and ownership_pct <= 100)),
  share_units text,
  -- Loan-only fields
  interest_rate numeric(7, 3) check (interest_rate is null or interest_rate >= 0),
  interest_terms text,
  repayment_terms text,
  repayment_frequency text,
  maturity_date date,
  -- General terms
  distribution_terms text,
  conditions text,
  restrictions text,
  approval_status text not null default 'approved'
    check (approval_status in ('draft', 'approved', 'rejected')),
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fin_investments_investor_idx on public.fin_investments (investor_id);

create table if not exists public.fin_loan_schedule (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.fin_investments (id) on delete restrict,
  due_date date not null,
  principal_due numeric(14, 2) not null default 0 check (principal_due >= 0),
  interest_due numeric(14, 2) not null default 0 check (interest_due >= 0),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists fin_loan_schedule_investment_idx on public.fin_loan_schedule (investment_id, due_date);

create table if not exists public.fin_allocations (
  id uuid primary key default gen_random_uuid(),
  -- null = general (pooled) funds
  investment_id uuid references public.fin_investments (id) on delete restrict,
  project_id uuid references public.fin_projects (id) on delete restrict,
  department_id text references public.fin_departments (id) on delete restrict,
  purpose text not null,
  amount numeric(14, 2) not null check (amount > 0),
  allocation_date date not null,
  approved_by text,
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  exception_approved boolean not null default false,
  exception_reason text,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_allocations_exception_reason
    check (not exception_approved or coalesce(exception_reason, '') <> '')
);

create index if not exists fin_allocations_investment_idx on public.fin_allocations (investment_id);

alter table public.fin_expenses drop constraint if exists fin_expenses_allocation_fk;
alter table public.fin_expenses
  add constraint fin_expenses_allocation_fk
  foreign key (allocation_id) references public.fin_allocations (id) on delete restrict;

alter table public.fin_ledger_entries drop constraint if exists fin_ledger_entries_investment_fk;
alter table public.fin_ledger_entries
  add constraint fin_ledger_entries_investment_fk
  foreign key (investment_id) references public.fin_investments (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['fin_investors', 'fin_investments', 'fin_loan_schedule', 'fin_allocations']
  loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
         for each row execute function private.fin_audit_trigger()', t, t);
  end loop;
  foreach t in array array['fin_investors', 'fin_investments', 'fin_allocations']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function private.fin_touch_updated_at()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: admin only. Allocations are created via fin_create_allocation (limit
-- check); admins may update status/notes directly.
-- ---------------------------------------------------------------------------

alter table public.fin_investors enable row level security;
alter table public.fin_investments enable row level security;
alter table public.fin_loan_schedule enable row level security;
alter table public.fin_allocations enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['fin_investors', 'fin_investments', 'fin_loan_schedule', 'fin_allocations']
  loop
    execute format('drop policy if exists "Admins read %s" on public.%I', t, t);
    execute format(
      'create policy "Admins read %s" on public.%I for select to authenticated
         using ((select public.current_user_role()) = ''admin'')', t, t);
    execute format('drop policy if exists "Admins update %s" on public.%I', t, t);
    execute format(
      'create policy "Admins update %s" on public.%I for update to authenticated
         using ((select public.current_user_role()) = ''admin'')
         with check ((select public.current_user_role()) = ''admin'')', t, t);
  end loop;
  foreach t in array array['fin_investors', 'fin_investments', 'fin_loan_schedule']
  loop
    execute format('drop policy if exists "Admins insert %s" on public.%I', t, t);
    execute format(
      'create policy "Admins insert %s" on public.%I for insert to authenticated
         with check ((select public.current_user_role()) = ''admin'')', t, t);
  end loop;
end;
$$;

-- Loan schedule rows are planning data; admins may remove mistaken rows.
drop policy if exists "Admins delete fin_loan_schedule" on public.fin_loan_schedule;
create policy "Admins delete fin_loan_schedule"
  on public.fin_loan_schedule for delete to authenticated
  using ((select public.current_user_role()) = 'admin');

revoke all on
  public.fin_investors, public.fin_investments, public.fin_loan_schedule, public.fin_allocations
  from anon, authenticated;
revoke all on sequence public.fin_investment_seq from anon, authenticated;

grant select, insert, update on public.fin_investors to authenticated;
grant select, insert, update, delete on public.fin_loan_schedule to authenticated;
grant select on public.fin_investments, public.fin_allocations to authenticated;
-- Investment codes come from the sequence, so inserts go through fin_create_investment.
grant update (name, agreement_date, agreement_reference, amount_committed, ownership_pct, share_units,
              interest_rate, interest_terms, repayment_terms, repayment_frequency, maturity_date,
              distribution_terms, conditions, restrictions, approval_status, status, notes)
  on public.fin_investments to authenticated;
grant update (status, notes, approved_by) on public.fin_allocations to authenticated;
