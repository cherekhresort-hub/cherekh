-- Unified cash ledger: one row per actual money movement.
-- Run after 044_finance_expenses.sql
--
-- Booking receipts are NOT copied here; reporting reads them from booking
-- payment transactions and maps the payment method to fin_accounts.default_methods.
-- Corrections are reversing entries (reversal_of), never edits or deletes.

create table if not exists public.fin_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  account_id text not null references public.fin_accounts (id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14, 2) not null check (amount > 0),
  kind text not null check (kind in (
    'expense_payment',       -- out: company pays supplier for an expense
    'expense_refund',        -- in:  supplier refunds part of a paid expense
    'reimbursement',         -- out: company repays employee for an employee-paid expense
    'deposit_refund',        -- in:  refundable deposit / advance returned
    'owner_contribution',    -- in:  owner capital
    'equity_receipt',        -- in:  external equity
    'loan_receipt',          -- in:  loan proceeds (liability, never revenue)
    'grant_receipt',         -- in:  grant / restricted funding
    'other_funding_receipt', -- in:  other funding arrangement
    'capital_withdrawal',    -- out: owner / investor withdraws capital
    'loan_principal',        -- out: principal repayment (reduces liability)
    'loan_interest',         -- out: interest (financing cost)
    'investor_distribution', -- out: distribution / profit share
    'transfer_out',          -- out: between own accounts (cash-neutral overall)
    'transfer_in',           -- in:  between own accounts
    'adjustment'             -- in/out: reconciliation correction (admin)
  )),
  method text,
  reference text,
  counterparty text,
  expense_id uuid references public.fin_expenses (id) on delete restrict,
  -- FK added in 046 once fin_investments exists.
  investment_id uuid,
  transfer_group_id uuid,
  reversal_of uuid references public.fin_ledger_entries (id) on delete restrict,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists fin_ledger_entries_date_idx on public.fin_ledger_entries (entry_date desc);
create index if not exists fin_ledger_entries_account_idx on public.fin_ledger_entries (account_id);
create index if not exists fin_ledger_entries_expense_idx on public.fin_ledger_entries (expense_id);
create index if not exists fin_ledger_entries_investment_idx on public.fin_ledger_entries (investment_id);
create unique index if not exists fin_ledger_entries_single_reversal_idx
  on public.fin_ledger_entries (reversal_of) where reversal_of is not null;

alter table public.fin_deposit_settlements
  drop constraint if exists fin_deposit_settlements_ledger_fk;
alter table public.fin_deposit_settlements
  add constraint fin_deposit_settlements_ledger_fk
  foreign key (ledger_entry_id) references public.fin_ledger_entries (id) on delete restrict;

drop trigger if exists fin_ledger_entries_audit on public.fin_ledger_entries;
create trigger fin_ledger_entries_audit
  after insert or update or delete on public.fin_ledger_entries
  for each row execute function private.fin_audit_trigger();

alter table public.fin_ledger_entries enable row level security;

drop policy if exists "Admins read ledger" on public.fin_ledger_entries;
create policy "Admins read ledger"
  on public.fin_ledger_entries for select to authenticated
  using ((select public.current_user_role()) = 'admin');

-- Managers see only expense-linked movements (payments, refunds, reimbursements,
-- deposit refunds). Investment, loan, transfer and adjustment rows stay admin-only.
drop policy if exists "Managers read expense ledger" on public.fin_ledger_entries;
create policy "Managers read expense ledger"
  on public.fin_ledger_entries for select to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    and expense_id is not null
    and kind in ('expense_payment', 'expense_refund', 'reimbursement', 'deposit_refund')
  );

revoke all on public.fin_ledger_entries from anon, authenticated;
grant select on public.fin_ledger_entries to authenticated;
