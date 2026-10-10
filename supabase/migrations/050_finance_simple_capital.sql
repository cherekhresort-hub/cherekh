-- Simple capital: replace investors / agreements / loans / allocations with one
-- "Main fund" account and plain investment-in / withdrawal entries.
-- Run after 049_activity_finance_category.sql
--
-- The management company operates Cherekh Center; all revenue and expenses are
-- Cherekh Center's. Money the company puts in is an owner_contribution
-- ("Investment added"), money taken back is a capital_withdrawal ("Investment
-- withdrawn"). Rent paid to the property owners is an ordinary expense
-- (category A, Property Rent and Occupancy).
--
-- Also removes the management-lease objects (fin_leases, lease_rent, lease_id)
-- from the earlier lease migration, when that migration was applied.
--
-- The migration stops without changing anything if any money or documents are
-- attached to investments, allocations or leases. Investor profiles and leases
-- with no money recorded are deleted row by row first, so fin_audit_log keeps
-- a full copy of each one.

-- ---------------------------------------------------------------------------
-- Guard, then delete profile-only rows
-- ---------------------------------------------------------------------------

do $$
declare
  v_has_leases boolean := to_regclass('public.fin_leases') is not null;
  v_has_lease_col boolean := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fin_ledger_entries' and column_name = 'lease_id'
  );
  v_found boolean;
  v_deleted int;
begin
  if exists (select 1 from public.fin_investments) then
    raise exception 'Migration 050 stopped without changing anything: funding agreements exist in fin_investments.';
  end if;
  if exists (select 1 from public.fin_loan_schedule) then
    raise exception 'Migration 050 stopped without changing anything: loan schedule rows exist in fin_loan_schedule.';
  end if;
  if exists (select 1 from public.fin_allocations)
     or exists (select 1 from public.fin_expenses where allocation_id is not null) then
    raise exception 'Migration 050 stopped without changing anything: fund allocations exist.';
  end if;
  if exists (
    select 1 from public.fin_ledger_entries
    where investment_id is not null
       or kind in ('equity_receipt', 'loan_receipt', 'grant_receipt', 'other_funding_receipt',
                   'loan_principal', 'loan_interest', 'investor_distribution', 'lease_rent')
  ) then
    raise exception 'Migration 050 stopped without changing anything: funding, loan or lease rent ledger entries exist.';
  end if;
  if v_has_lease_col then
    execute 'select exists (select 1 from public.fin_ledger_entries where lease_id is not null)' into v_found;
    if v_found then
      raise exception 'Migration 050 stopped without changing anything: ledger entries are linked to a lease.';
    end if;
  end if;
  if exists (
    select 1 from public.fin_attachments
    where owner_type in ('investment', 'investor', 'allocation', 'lease')
  ) then
    raise exception 'Migration 050 stopped without changing anything: documents are attached to investors, investments, allocations or leases.';
  end if;

  if v_has_leases then
    execute 'delete from public.fin_leases';
    get diagnostics v_deleted = row_count;
    raise notice 'Deleted % lease(s) with no rent recorded (copies kept in fin_audit_log).', v_deleted;
  end if;
  delete from public.fin_investors;
  get diagnostics v_deleted = row_count;
  raise notice 'Deleted % investor profile(s) (copies kept in fin_audit_log).', v_deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Old RPCs
-- ---------------------------------------------------------------------------

drop function if exists public.fin_create_lease(jsonb);
drop function if exists public.fin_update_lease(uuid, jsonb);
drop function if exists public.fin_record_lease_rent(jsonb);
drop function if exists private.fin_create_lease(jsonb);
drop function if exists private.fin_update_lease(uuid, jsonb);
drop function if exists private.fin_record_lease_rent(jsonb);
drop function if exists private.fin_lease_check_overlap(uuid, date, date);
drop function if exists public.fin_create_investment(jsonb);
drop function if exists public.fin_record_investment_txn(jsonb);
drop function if exists public.fin_create_allocation(jsonb);
drop function if exists private.fin_create_investment(jsonb);
drop function if exists private.fin_record_investment_txn(jsonb);
drop function if exists private.fin_create_allocation(jsonb);
drop function if exists private.fin_investment_sum(uuid, text[]);

-- ---------------------------------------------------------------------------
-- Columns, tables, sequence
-- ---------------------------------------------------------------------------

alter table public.fin_expenses drop constraint if exists fin_expenses_allocation_fk;
alter table public.fin_ledger_entries drop constraint if exists fin_ledger_entries_investment_fk;
alter table public.fin_expenses drop column if exists allocation_id;
alter table public.fin_ledger_entries drop column if exists investment_id;
alter table public.fin_ledger_entries drop column if exists lease_id;

drop table if exists public.fin_leases;
drop sequence if exists public.fin_lease_seq;
drop table if exists public.fin_allocations;
drop table if exists public.fin_loan_schedule;
drop table if exists public.fin_investments;
drop table if exists public.fin_investors;
drop sequence if exists public.fin_investment_seq;

alter table public.fin_ledger_entries drop constraint if exists fin_ledger_entries_kind_check;
alter table public.fin_ledger_entries
  add constraint fin_ledger_entries_kind_check check (kind in (
    'expense_payment',     -- out: company pays supplier for an expense
    'expense_refund',      -- in:  supplier refunds part of a paid expense
    'reimbursement',       -- out: company repays employee for an employee-paid expense
    'deposit_refund',      -- in:  refundable deposit / advance returned
    'owner_contribution',  -- in:  investment added
    'capital_withdrawal',  -- out: investment withdrawn
    'transfer_out',        -- out: between own accounts (cash-neutral overall)
    'transfer_in',         -- in:  between own accounts
    'adjustment'           -- in/out: reconciliation correction (admin)
  ));

alter table public.fin_attachments drop constraint if exists fin_attachments_owner_type_check;
alter table public.fin_attachments
  add constraint fin_attachments_owner_type_check check (owner_type in ('expense', 'asset'));

-- ---------------------------------------------------------------------------
-- Main fund account
-- ---------------------------------------------------------------------------

insert into public.fin_accounts (id, name, account_type, default_methods, sort_order)
values ('acc-main', 'Main fund', 'other', '{}', 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers and RPCs redefined without investment / allocation columns
-- ---------------------------------------------------------------------------

create or replace function private.fin_kind_sign(p_kind text, p_direction text)
returns int
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_kind in ('expense_refund', 'deposit_refund', 'owner_contribution', 'transfer_in')
      then case when p_direction = 'in' then 1 else -1 end
    else case when p_direction = 'out' then 1 else -1 end
  end;
$$;

create or replace function private.fin_create_expense(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_actor text := private.fin_actor();
  v_id uuid := gen_random_uuid();
  v_code text;
  v_txn_date date := coalesce(nullif(p ->> 'txn_date', '')::date, (now() at time zone 'Asia/Dhaka')::date);
  v_lines jsonb := coalesce(p -> 'lines', '[]'::jsonb);
  v_line jsonb;
  v_idx int := 0;
  v_cat public.fin_categories;
  v_qty numeric;
  v_price numeric;
  v_line_total numeric;
  v_class text;
  v_subtotal numeric := 0;
  v_discount numeric := round(coalesce(nullif(p ->> 'discount', '')::numeric, 0), 2);
  v_tax numeric := round(coalesce(nullif(p ->> 'tax', '')::numeric, 0), 2);
  v_charges numeric := round(coalesce(nullif(p ->> 'additional_charges', '')::numeric, 0), 2);
  v_total numeric;
  v_paid_by text := coalesce(p ->> 'paid_by_type', 'company');
  v_needs_approval boolean := false;
  v_needs_description boolean := false;
  v_approval text;
  v_line_id uuid;
  v_pay jsonb := p -> 'payment';
  v_pay_amount numeric;
  v_asset_count int := 0;
begin
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'Expense title is required';
  end if;
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'Add at least one line item';
  end if;
  if v_discount < 0 or v_tax < 0 or v_charges < 0 then
    raise exception 'Discount, tax and charges cannot be negative';
  end if;
  if v_paid_by not in ('company', 'employee') then
    raise exception 'Invalid paid-by type';
  end if;
  if v_paid_by = 'employee'
     and coalesce(nullif(p ->> 'employee_staff_id', ''), nullif(trim(p ->> 'employee_name'), '')) is null then
    raise exception 'Choose the employee who paid';
  end if;

  -- First pass: validate lines and compute subtotal.
  for v_line in select * from jsonb_array_elements(v_lines) loop
    select * into v_cat from public.fin_categories where id = v_line ->> 'category_id';
    if not found then
      raise exception 'Unknown category on line %', v_idx + 1;
    end if;
    if not v_cat.active then
      raise exception 'Category "%" is inactive', v_cat.name;
    end if;
    v_qty := coalesce(nullif(v_line ->> 'quantity', '')::numeric, 1);
    v_price := coalesce(nullif(v_line ->> 'unit_price', '')::numeric, 0);
    if v_qty <= 0 or v_price < 0 then
      raise exception 'Line % needs a positive quantity and a non-negative price', v_idx + 1;
    end if;
    v_subtotal := v_subtotal + round(v_qty * v_price, 2);

    if v_cat.requires_description or exists (
      select 1 from public.fin_categories pc where pc.id = v_cat.parent_id and pc.requires_description
    ) then
      v_needs_description := true;
    end if;
    v_idx := v_idx + 1;
  end loop;

  v_total := round(v_subtotal - v_discount + v_tax + v_charges, 2);
  if v_total < 0 then
    raise exception 'Discount cannot exceed the subtotal plus charges';
  end if;
  if v_needs_description and coalesce(trim(p ->> 'description'), '') = '' then
    raise exception 'A description is required for "Other / Uncategorized" expenses';
  end if;

  -- Approval: any line whose category (or parent) requires approval at this total.
  select exists (
    select 1
    from jsonb_array_elements(v_lines) l
    join public.fin_categories c on c.id = l ->> 'category_id'
    left join public.fin_categories pc on pc.id = c.parent_id
    where (c.requires_approval and (c.approval_threshold is null or v_total >= c.approval_threshold))
       or (pc.requires_approval and (pc.approval_threshold is null or v_total >= pc.approval_threshold))
  ) into v_needs_approval;

  v_approval := case
    when not v_needs_approval then 'not_required'
    when v_role = 'admin' then 'approved'
    else 'pending'
  end;

  v_code := 'EXP-' || to_char(v_txn_date, 'YYYY') || '-' || lpad(nextval('public.fin_expense_seq')::text, 4, '0');

  insert into public.fin_expenses (
    id, code, title, txn_date, invoice_date, due_date, supplier_id, payee_name,
    department_id, project_id, phase, description, currency,
    subtotal, discount, tax, additional_charges, total,
    paid_by_type, employee_staff_id, employee_name, purchased_by, requested_by,
    approval_status, approved_by, approved_at, tags, notes, created_by
  ) values (
    v_id, v_code, trim(p ->> 'title'), v_txn_date,
    nullif(p ->> 'invoice_date', '')::date, nullif(p ->> 'due_date', '')::date,
    nullif(p ->> 'supplier_id', '')::uuid, nullif(trim(p ->> 'payee_name'), ''),
    nullif(p ->> 'department_id', ''), nullif(p ->> 'project_id', '')::uuid,
    coalesce(p ->> 'phase', 'operating'), nullif(trim(p ->> 'description'), ''),
    coalesce(p ->> 'currency', 'BDT'),
    v_subtotal, v_discount, v_tax, v_charges, v_total,
    v_paid_by, nullif(p ->> 'employee_staff_id', ''), nullif(trim(p ->> 'employee_name'), ''),
    nullif(trim(p ->> 'purchased_by'), ''), nullif(trim(p ->> 'requested_by'), ''),
    v_approval,
    case when v_approval = 'approved' then v_actor end,
    case when v_approval = 'approved' then now() end,
    coalesce(array(select jsonb_array_elements_text(coalesce(p -> 'tags', '[]'::jsonb))), '{}'),
    nullif(trim(p ->> 'notes'), ''), v_actor
  );

  -- Second pass: insert lines (+ asset rows for capital items).
  v_idx := 0;
  for v_line in select * from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;
    select * into v_cat from public.fin_categories where id = v_line ->> 'category_id';
    v_qty := coalesce(nullif(v_line ->> 'quantity', '')::numeric, 1);
    v_price := round(coalesce(nullif(v_line ->> 'unit_price', '')::numeric, 0), 2);
    v_line_total := round(v_qty * v_price, 2);
    v_class := case
      when v_role = 'admin' and (v_line ->> 'classification') is not null then v_line ->> 'classification'
      else v_cat.classification
    end;

    insert into public.fin_expense_lines (
      expense_id, line_no, description, category_id, classification, quantity, unit, unit_price, line_total
    ) values (
      v_id, v_idx, coalesce(nullif(trim(v_line ->> 'description'), ''), v_cat.name),
      v_cat.id, v_class, v_qty, nullif(trim(v_line ->> 'unit'), ''), v_price, v_line_total
    ) returning id into v_line_id;

    if v_class = 'capital_asset' and coalesce(nullif(v_line ->> 'create_asset', '')::boolean, true) then
      insert into public.fin_assets (
        code, name, category_id, expense_id, expense_line_id, department_id, supplier_id,
        purchase_date, quantity, cost, useful_life_months, created_by
      ) values (
        'AST-' || lpad(nextval('public.fin_asset_seq')::text, 4, '0'),
        coalesce(nullif(trim(v_line ->> 'asset_name'), ''), nullif(trim(v_line ->> 'description'), ''), v_cat.name),
        v_cat.id, v_id, v_line_id, nullif(p ->> 'department_id', ''), nullif(p ->> 'supplier_id', '')::uuid,
        v_txn_date, v_qty,
        case when v_subtotal > 0 then round(v_line_total * v_total / v_subtotal, 2) else 0 end,
        nullif(v_line ->> 'useful_life_months', '')::int,
        v_actor
      );
      v_asset_count := v_asset_count + 1;
    end if;
  end loop;

  -- Optional payment made at the time of entry (company-paid only).
  if v_pay is not null and coalesce(nullif(v_pay ->> 'amount', '')::numeric, 0) > 0 then
    if v_paid_by = 'employee' then
      raise exception 'Employee-paid expenses are settled with reimbursements';
    end if;
    v_pay_amount := round(nullif(v_pay ->> 'amount', '')::numeric, 2);
    if v_pay_amount > v_total then
      raise exception 'Payment (%) exceeds the expense total (%)', v_pay_amount, v_total;
    end if;
    perform private.fin_require_account(v_pay ->> 'account_id');
    insert into public.fin_ledger_entries (
      entry_date, account_id, direction, amount, kind, method, reference, counterparty,
      expense_id, notes, created_by
    ) values (
      coalesce(nullif(v_pay ->> 'date', '')::date, v_txn_date), v_pay ->> 'account_id', 'out', v_pay_amount,
      'expense_payment', nullif(v_pay ->> 'method', ''), nullif(trim(v_pay ->> 'reference'), ''),
      coalesce(nullif(trim(p ->> 'payee_name'), ''), (select name from public.fin_suppliers where id = nullif(p ->> 'supplier_id', '')::uuid)),
      v_id, nullif(trim(v_pay ->> 'notes'), ''), v_actor
    );
  end if;

  return jsonb_build_object('id', v_id, 'code', v_code, 'approval_status', v_approval, 'assets_created', v_asset_count);
end;
$$;

create or replace function private.fin_update_expense_details(p_expense_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_exp public.fin_expenses;
begin
  select * into v_exp from public.fin_expenses where id = p_expense_id for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Void expenses cannot be edited'; end if;
  if p ? 'title' and coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'Expense title is required';
  end if;

  update public.fin_expenses set
    title = case when p ? 'title' then trim(p ->> 'title') else title end,
    description = case when p ? 'description' then nullif(trim(p ->> 'description'), '') else description end,
    notes = case when p ? 'notes' then nullif(trim(p ->> 'notes'), '') else notes end,
    invoice_date = case when p ? 'invoice_date' then nullif(p ->> 'invoice_date', '')::date else invoice_date end,
    due_date = case when p ? 'due_date' then nullif(p ->> 'due_date', '')::date else due_date end,
    supplier_id = case when p ? 'supplier_id' then nullif(p ->> 'supplier_id', '')::uuid else supplier_id end,
    payee_name = case when p ? 'payee_name' then nullif(trim(p ->> 'payee_name'), '') else payee_name end,
    department_id = case when p ? 'department_id' then nullif(p ->> 'department_id', '') else department_id end,
    project_id = case when p ? 'project_id' then nullif(p ->> 'project_id', '')::uuid else project_id end,
    phase = case when p ? 'phase' then p ->> 'phase' else phase end,
    purchased_by = case when p ? 'purchased_by' then nullif(trim(p ->> 'purchased_by'), '') else purchased_by end,
    requested_by = case when p ? 'requested_by' then nullif(trim(p ->> 'requested_by'), '') else requested_by end,
    tags = case when p ? 'tags'
      then coalesce(array(select jsonb_array_elements_text(p -> 'tags')), '{}') else tags end
  where id = p_expense_id;
end;
$$;

create or replace function private.fin_void_expense(p_expense_id uuid, p_reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_actor text := private.fin_actor();
  v_exp public.fin_expenses;
  v_entry public.fin_ledger_entries;
  v_reversed int := 0;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to void an expense';
  end if;
  select * into v_exp from public.fin_expenses where id = p_expense_id for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Expense is already void'; end if;

  if exists (
    select 1 from public.fin_deposit_settlements s
    join public.fin_expenses t on t.id = s.applied_expense_id
    where s.expense_id = p_expense_id and s.kind = 'applied' and t.status = 'active'
  ) then
    raise exception 'This deposit was applied to other expenses. Void those expenses first.';
  end if;

  for v_entry in
    select * from public.fin_ledger_entries l
    where l.expense_id = p_expense_id
      and l.reversal_of is null
      and not private.fin_is_reversed(l.id)
  loop
    insert into public.fin_ledger_entries (
      entry_date, account_id, direction, amount, kind, method, reference, counterparty,
      expense_id, reversal_of, notes, created_by
    ) values (
      (now() at time zone 'Asia/Dhaka')::date, v_entry.account_id,
      case when v_entry.direction = 'in' then 'out' else 'in' end,
      v_entry.amount, v_entry.kind, v_entry.method, v_entry.reference, v_entry.counterparty,
      v_entry.expense_id, v_entry.id,
      'Reversal (expense void): ' || trim(p_reason), v_actor
    );
    v_reversed := v_reversed + 1;
  end loop;

  update public.fin_assets set status = 'void', disposal_note = 'Expense voided: ' || trim(p_reason)
  where expense_id = p_expense_id and status = 'active';

  update public.fin_expenses set
    status = 'void', void_reason = trim(p_reason), voided_by = v_actor, voided_at = now()
  where id = p_expense_id;

  return v_reversed;
end;
$$;

create or replace function private.fin_reverse_ledger_entry(p_entry_id uuid, p_reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_entry public.fin_ledger_entries;
  v_row public.fin_ledger_entries;
  v_count int := 0;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'A reason is required'; end if;
  select * into v_entry from public.fin_ledger_entries where id = p_entry_id for update;
  if not found then raise exception 'Ledger entry not found'; end if;
  if v_entry.reversal_of is not null then raise exception 'A reversal cannot itself be reversed'; end if;
  if private.fin_is_reversed(v_entry.id) then raise exception 'Entry is already reversed'; end if;

  for v_row in
    select * from public.fin_ledger_entries l
    where (v_entry.transfer_group_id is not null and l.transfer_group_id = v_entry.transfer_group_id)
       or l.id = v_entry.id
  loop
    if private.fin_is_reversed(v_row.id) then continue; end if;
    insert into public.fin_ledger_entries (
      entry_date, account_id, direction, amount, kind, method, reference, counterparty,
      expense_id, transfer_group_id, reversal_of, notes, created_by
    ) values (
      (now() at time zone 'Asia/Dhaka')::date, v_row.account_id,
      case when v_row.direction = 'in' then 'out' else 'in' end,
      v_row.amount, v_row.kind, v_row.method, v_row.reference, v_row.counterparty,
      v_row.expense_id, v_row.transfer_group_id, v_row.id,
      'Reversal: ' || trim(p_reason), private.fin_actor()
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Capital in / out
-- ---------------------------------------------------------------------------

create or replace function private.fin_record_capital(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_kind text := p ->> 'kind';
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_account text := coalesce(nullif(p ->> 'account_id', ''), 'acc-main');
  v_net numeric;
  v_entry_id uuid;
begin
  if v_kind not in ('owner_contribution', 'capital_withdrawal') then
    raise exception 'Choose investment or withdrawal';
  end if;
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  perform private.fin_require_account(v_account);

  if v_kind = 'capital_withdrawal' then
    -- Serialise withdrawals so two at once can't both pass the limit.
    perform pg_advisory_xact_lock(hashtext('fin_record_capital'));
    select coalesce(sum(
      case when kind = 'owner_contribution' then 1 else -1 end * private.fin_kind_sign(kind, direction) * amount
    ), 0) into v_net
    from public.fin_ledger_entries
    where kind in ('owner_contribution', 'capital_withdrawal');
    if v_amount > v_net + 0.005 then
      raise exception 'Withdrawal (%) exceeds the net amount invested (%)', v_amount, round(greatest(v_net, 0), 2);
    end if;
  end if;

  insert into public.fin_ledger_entries (
    entry_date, account_id, direction, amount, kind, method, reference, counterparty, notes, created_by
  ) values (
    coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    v_account,
    case when v_kind = 'owner_contribution' then 'in' else 'out' end,
    v_amount, v_kind, nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
    nullif(trim(p ->> 'counterparty'), ''), nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function public.fin_record_capital(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_record_capital(p); $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function private.fin_kind_sign(text, text) from public, anon, authenticated;

do $$
declare
  sig text;
begin
  foreach sig in array array[
    'fin_create_expense(jsonb)',
    'fin_update_expense_details(uuid, jsonb)',
    'fin_void_expense(uuid, text)',
    'fin_reverse_ledger_entry(uuid, text)',
    'fin_record_capital(jsonb)'
  ]
  loop
    execute format('revoke all on function private.%s from public, anon, authenticated', sig);
    execute format('grant execute on function private.%s to authenticated', sig);
    execute format('revoke all on function public.%s from public, anon, authenticated', sig);
    execute format('grant execute on function public.%s to authenticated', sig);
  end loop;
end;
$$;
