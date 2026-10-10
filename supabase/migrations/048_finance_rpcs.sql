-- Finance write RPCs. Each call is one transaction.
-- Run after 047_finance_attachments.sql
--
-- Implementations are SECURITY DEFINER in `private` (not exposed by PostgREST,
-- same pattern as 040) and check the caller's role first. Public INVOKER
-- wrappers keep supabase.rpc('fin_*') names stable.
--
-- Roles:
--   admin   every function
--   manager fin_create_expense, fin_update_expense_details, fin_record_expense_payment,
--           fin_record_reimbursement, fin_settle_deposit (refund / apply only)

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.fin_require_role(p_roles text[])
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
begin
  if v_role is null or not (v_role = any (p_roles)) then
    raise exception 'Not authorized for this finance action' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

create or replace function private.fin_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(coalesce((select auth.jwt()) ->> 'email', ''), '');
$$;

-- +1 when the entry moves in the kind's natural direction, -1 for reversals.
create or replace function private.fin_kind_sign(p_kind text, p_direction text)
returns int
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_kind in ('expense_refund', 'deposit_refund', 'owner_contribution', 'equity_receipt',
                    'loan_receipt', 'grant_receipt', 'other_funding_receipt', 'transfer_in')
      then case when p_direction = 'in' then 1 else -1 end
    else case when p_direction = 'out' then 1 else -1 end
  end;
$$;

create or replace function private.fin_is_reversed(p_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.fin_ledger_entries r where r.reversal_of = p_entry_id);
$$;

-- Net amount settled toward the supplier for a company-paid expense:
-- payments - refunds + advances applied from deposits.
create or replace function private.fin_expense_net_paid(p_expense_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(
        case l.kind
          when 'expense_payment' then private.fin_kind_sign(l.kind, l.direction) * l.amount
          when 'expense_refund' then -private.fin_kind_sign(l.kind, l.direction) * l.amount
          else 0
        end)
      from public.fin_ledger_entries l
      where l.expense_id = p_expense_id
        and l.kind in ('expense_payment', 'expense_refund')
    ), 0)
    + coalesce((
      select sum(s.amount)
      from public.fin_deposit_settlements s
      join public.fin_expenses d on d.id = s.expense_id
      where s.applied_expense_id = p_expense_id
        and s.kind = 'applied'
        and d.status = 'active'
    ), 0);
$$;

create or replace function private.fin_expense_payments_net(p_expense_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case l.kind
      when 'expense_payment' then private.fin_kind_sign(l.kind, l.direction) * l.amount
      when 'expense_refund' then -private.fin_kind_sign(l.kind, l.direction) * l.amount
      else 0
    end), 0)
  from public.fin_ledger_entries l
  where l.expense_id = p_expense_id
    and l.kind in ('expense_payment', 'expense_refund');
$$;

create or replace function private.fin_expense_reimbursed(p_expense_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(private.fin_kind_sign(l.kind, l.direction) * l.amount), 0)
  from public.fin_ledger_entries l
  where l.expense_id = p_expense_id and l.kind = 'reimbursement';
$$;

-- Deposit / advance still recoverable on a deposit expense.
create or replace function private.fin_deposit_outstanding(p_expense_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exp public.fin_expenses;
  v_deposit_lines numeric;
  v_base numeric;
  v_settled numeric;
begin
  select * into v_exp from public.fin_expenses where id = p_expense_id;
  if not found or v_exp.status <> 'active' or v_exp.subtotal <= 0 then
    return 0;
  end if;

  select coalesce(sum(line_total), 0) into v_deposit_lines
  from public.fin_expense_lines
  where expense_id = p_expense_id and classification = 'deposit_advance';

  if v_deposit_lines <= 0 then
    return 0;
  end if;

  v_base := case
    when v_exp.paid_by_type = 'employee' then v_exp.total
    else private.fin_expense_net_paid(p_expense_id)
  end * (v_deposit_lines / v_exp.subtotal);

  select coalesce(sum(s.amount), 0) into v_settled
  from public.fin_deposit_settlements s
  left join public.fin_expenses t on t.id = s.applied_expense_id
  where s.expense_id = p_expense_id
    and (s.kind <> 'applied' or t.status = 'active')
    and (s.ledger_entry_id is null or not private.fin_is_reversed(s.ledger_entry_id));

  return round(greatest(v_base - v_settled, 0), 2);
end;
$$;

-- Signed sum of an investment's ledger entries for the given kinds.
create or replace function private.fin_investment_sum(p_investment_id uuid, p_kinds text[])
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(private.fin_kind_sign(l.kind, l.direction) * l.amount), 0)
  from public.fin_ledger_entries l
  where l.investment_id = p_investment_id and l.kind = any (p_kinds);
$$;

create or replace function private.fin_require_account(p_account_id text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_account_id is null or not exists (
    select 1 from public.fin_accounts where id = p_account_id and active
  ) then
    raise exception 'Choose an active account';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------

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
  if (p ->> 'allocation_id') is not null and v_role <> 'admin' then
    raise exception 'Only admins can link an expense to a fund allocation';
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
    department_id, project_id, allocation_id, phase, description, currency,
    subtotal, discount, tax, additional_charges, total,
    paid_by_type, employee_staff_id, employee_name, purchased_by, requested_by,
    approval_status, approved_by, approved_at, tags, notes, created_by
  ) values (
    v_id, v_code, trim(p ->> 'title'), v_txn_date,
    nullif(p ->> 'invoice_date', '')::date, nullif(p ->> 'due_date', '')::date,
    nullif(p ->> 'supplier_id', '')::uuid, nullif(trim(p ->> 'payee_name'), ''),
    nullif(p ->> 'department_id', ''), nullif(p ->> 'project_id', '')::uuid, nullif(p ->> 'allocation_id', '')::uuid,
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
  if p ? 'allocation_id' and v_role <> 'admin' then
    raise exception 'Only admins can link an expense to a fund allocation';
  end if;
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
    allocation_id = case when p ? 'allocation_id' then nullif(p ->> 'allocation_id', '')::uuid else allocation_id end,
    phase = case when p ? 'phase' then p ->> 'phase' else phase end,
    purchased_by = case when p ? 'purchased_by' then nullif(trim(p ->> 'purchased_by'), '') else purchased_by end,
    requested_by = case when p ? 'requested_by' then nullif(trim(p ->> 'requested_by'), '') else requested_by end,
    tags = case when p ? 'tags'
      then coalesce(array(select jsonb_array_elements_text(p -> 'tags')), '{}') else tags end
  where id = p_expense_id;
end;
$$;

create or replace function private.fin_record_expense_payment(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_exp public.fin_expenses;
  v_kind text := coalesce(p ->> 'kind', 'expense_payment');
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_net_paid numeric;
  v_payments_net numeric;
  v_entry_id uuid;
begin
  if v_kind not in ('expense_payment', 'expense_refund') then
    raise exception 'Invalid payment kind';
  end if;
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;

  select * into v_exp from public.fin_expenses where id = nullif(p ->> 'expense_id', '')::uuid for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Expense is void'; end if;
  if v_exp.approval_status = 'rejected' then raise exception 'Expense was rejected'; end if;
  if v_exp.paid_by_type = 'employee' then
    raise exception 'Employee-paid expenses are settled with reimbursements';
  end if;
  perform private.fin_require_account(p ->> 'account_id');

  v_net_paid := private.fin_expense_net_paid(v_exp.id);
  v_payments_net := private.fin_expense_payments_net(v_exp.id);

  if v_kind = 'expense_payment' and v_amount > v_exp.total - v_net_paid + 0.005 then
    raise exception 'Payment (%) exceeds the outstanding balance (%)', v_amount, round(v_exp.total - v_net_paid, 2);
  end if;
  if v_kind = 'expense_refund' and v_amount > v_payments_net + 0.005 then
    raise exception 'Refund (%) exceeds the amount paid in cash (%)', v_amount, v_payments_net;
  end if;

  insert into public.fin_ledger_entries (
    entry_date, account_id, direction, amount, kind, method, reference, counterparty,
    expense_id, notes, created_by
  ) values (
    coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    p ->> 'account_id',
    case when v_kind = 'expense_payment' then 'out' else 'in' end,
    v_amount, v_kind, nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
    coalesce(v_exp.payee_name, (select name from public.fin_suppliers where id = v_exp.supplier_id)),
    v_exp.id, nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function private.fin_record_reimbursement(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_exp public.fin_expenses;
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_outstanding numeric;
  v_entry_id uuid;
begin
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;

  select * into v_exp from public.fin_expenses where id = nullif(p ->> 'expense_id', '')::uuid for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Expense is void'; end if;
  if v_exp.approval_status = 'rejected' then raise exception 'Expense was rejected'; end if;
  if v_exp.paid_by_type <> 'employee' then
    raise exception 'Only employee-paid expenses can be reimbursed';
  end if;
  perform private.fin_require_account(p ->> 'account_id');

  v_outstanding := v_exp.total - private.fin_expense_reimbursed(v_exp.id);
  if v_amount > v_outstanding + 0.005 then
    raise exception 'Reimbursement (%) exceeds the amount owed (%)', v_amount, round(v_outstanding, 2);
  end if;

  insert into public.fin_ledger_entries (
    entry_date, account_id, direction, amount, kind, method, reference, counterparty,
    expense_id, notes, created_by
  ) values (
    coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    p ->> 'account_id', 'out', v_amount, 'reimbursement',
    nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
    coalesce(v_exp.employee_name, (select name from public.staff_members where id = v_exp.employee_staff_id)),
    v_exp.id, nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function private.fin_set_expense_approval(p_expense_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_exp public.fin_expenses;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Approval status must be approved or rejected';
  end if;
  select * into v_exp from public.fin_expenses where id = p_expense_id for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Expense is void'; end if;
  if p_status = 'rejected' then
    if coalesce(trim(p_note), '') = '' then
      raise exception 'Give a reason for rejecting';
    end if;
    if private.fin_expense_payments_net(p_expense_id) > 0
       or private.fin_expense_reimbursed(p_expense_id) > 0 then
      raise exception 'This expense already has payments. Void it instead so the payments are reversed.';
    end if;
  end if;

  update public.fin_expenses set
    approval_status = p_status,
    approved_by = private.fin_actor(),
    approved_at = now(),
    approval_note = nullif(trim(p_note), '')
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
      expense_id, investment_id, reversal_of, notes, created_by
    ) values (
      (now() at time zone 'Asia/Dhaka')::date, v_entry.account_id,
      case when v_entry.direction = 'in' then 'out' else 'in' end,
      v_entry.amount, v_entry.kind, v_entry.method, v_entry.reference, v_entry.counterparty,
      v_entry.expense_id, v_entry.investment_id, v_entry.id,
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

create or replace function private.fin_settle_deposit(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_actor text := private.fin_actor();
  v_kind text := p ->> 'kind';
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_date date := coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date);
  v_exp public.fin_expenses;
  v_target public.fin_expenses;
  v_outstanding numeric;
  v_entry_id uuid;
  v_settlement_id uuid;
begin
  if v_kind not in ('refund_received', 'applied', 'written_off') then
    raise exception 'Invalid settlement type';
  end if;
  if v_kind = 'written_off' and v_role <> 'admin' then
    raise exception 'Only admins can write off a deposit';
  end if;
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;

  select * into v_exp from public.fin_expenses where id = nullif(p ->> 'expense_id', '')::uuid for update;
  if not found then raise exception 'Deposit expense not found'; end if;
  if v_exp.status = 'void' then raise exception 'Deposit expense is void'; end if;

  v_outstanding := private.fin_deposit_outstanding(v_exp.id);
  if v_outstanding <= 0 then
    raise exception 'Nothing outstanding on this deposit (only paid deposit amounts can be settled)';
  end if;
  if v_amount > v_outstanding + 0.005 then
    raise exception 'Amount (%) exceeds the outstanding deposit (%)', v_amount, v_outstanding;
  end if;

  if v_kind = 'applied' then
    select * into v_target from public.fin_expenses where id = nullif(p ->> 'applied_expense_id', '')::uuid for update;
    if not found then raise exception 'Choose the expense this advance pays for'; end if;
    if v_target.id = v_exp.id then raise exception 'An advance cannot be applied to itself'; end if;
    if v_target.status = 'void' or v_target.approval_status = 'rejected' then
      raise exception 'Target expense is void or rejected';
    end if;
    if v_target.paid_by_type = 'employee' then
      raise exception 'Advances cannot settle employee-paid expenses';
    end if;
    if v_amount > v_target.total - private.fin_expense_net_paid(v_target.id) + 0.005 then
      raise exception 'Amount exceeds the outstanding balance of %', v_target.code;
    end if;
  end if;

  if v_kind = 'refund_received' then
    perform private.fin_require_account(p ->> 'account_id');
    insert into public.fin_ledger_entries (
      entry_date, account_id, direction, amount, kind, method, reference, counterparty,
      expense_id, notes, created_by
    ) values (
      v_date, p ->> 'account_id', 'in', v_amount, 'deposit_refund',
      nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
      coalesce(v_exp.payee_name, (select name from public.fin_suppliers where id = v_exp.supplier_id)),
      v_exp.id, nullif(trim(p ->> 'notes'), ''), v_actor
    ) returning id into v_entry_id;
  end if;

  insert into public.fin_deposit_settlements (
    expense_id, settlement_date, amount, kind, ledger_entry_id, applied_expense_id, notes, created_by
  ) values (
    v_exp.id, v_date, v_amount, v_kind, v_entry_id,
    case when v_kind = 'applied' then v_target.id end,
    nullif(trim(p ->> 'notes'), ''), v_actor
  ) returning id into v_settlement_id;

  return v_settlement_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Investments
-- ---------------------------------------------------------------------------

create or replace function private.fin_create_investment(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_id uuid := gen_random_uuid();
  v_code text := 'INV-' || lpad(nextval('public.fin_investment_seq')::text, 4, '0');
  v_type text := p ->> 'funding_type';
  v_is_equity boolean;
  v_is_loan boolean;
begin
  if coalesce(trim(p ->> 'name'), '') = '' then raise exception 'Investment name is required'; end if;
  if (p ->> 'investor_id') is null then raise exception 'Choose the investor or funding provider'; end if;
  v_is_equity := v_type in ('owner_capital', 'external_equity');
  v_is_loan := v_type in ('shareholder_loan', 'business_loan', 'equipment_financing');

  insert into public.fin_investments (
    id, code, investor_id, name, funding_type, agreement_date, agreement_reference,
    amount_committed, currency, ownership_pct, share_units, interest_rate, interest_terms,
    repayment_terms, repayment_frequency, maturity_date, distribution_terms, conditions,
    restrictions, approval_status, notes, created_by
  ) values (
    v_id, v_code, nullif(p ->> 'investor_id', '')::uuid, trim(p ->> 'name'), v_type,
    nullif(p ->> 'agreement_date', '')::date, nullif(trim(p ->> 'agreement_reference'), ''),
    round(coalesce(nullif(p ->> 'amount_committed', '')::numeric, 0), 2), coalesce(p ->> 'currency', 'BDT'),
    case when v_is_equity then nullif(p ->> 'ownership_pct', '')::numeric end,
    case when v_is_equity then nullif(trim(p ->> 'share_units'), '') end,
    case when v_is_loan then nullif(p ->> 'interest_rate', '')::numeric end,
    case when v_is_loan then nullif(trim(p ->> 'interest_terms'), '') end,
    case when v_is_loan then nullif(trim(p ->> 'repayment_terms'), '') end,
    case when v_is_loan then nullif(trim(p ->> 'repayment_frequency'), '') end,
    case when v_is_loan then nullif(p ->> 'maturity_date', '')::date end,
    nullif(trim(p ->> 'distribution_terms'), ''), nullif(trim(p ->> 'conditions'), ''),
    nullif(trim(p ->> 'restrictions'), ''), coalesce(p ->> 'approval_status', 'approved'),
    nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  );

  return jsonb_build_object('id', v_id, 'code', v_code);
end;
$$;

create or replace function private.fin_record_investment_txn(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_inv public.fin_investments;
  v_kind text := p ->> 'kind';
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_allowed text[];
  v_received numeric;
  v_out numeric;
  v_entry_id uuid;
begin
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select * into v_inv from public.fin_investments where id = nullif(p ->> 'investment_id', '')::uuid for update;
  if not found then raise exception 'Funding agreement not found'; end if;
  if v_inv.status = 'cancelled' then raise exception 'Agreement is cancelled'; end if;
  if v_inv.approval_status <> 'approved' then raise exception 'Agreement is not approved'; end if;

  v_allowed := case v_inv.funding_type
    when 'owner_capital' then array['owner_contribution', 'capital_withdrawal', 'investor_distribution']
    when 'external_equity' then array['equity_receipt', 'capital_withdrawal', 'investor_distribution']
    when 'shareholder_loan' then array['loan_receipt', 'loan_principal', 'loan_interest']
    when 'business_loan' then array['loan_receipt', 'loan_principal', 'loan_interest']
    when 'equipment_financing' then array['loan_receipt', 'loan_principal', 'loan_interest']
    when 'grant' then array['grant_receipt']
    when 'restricted_project' then array['grant_receipt']
    else array['other_funding_receipt', 'investor_distribution']
  end;
  if not (v_kind = any (v_allowed)) then
    raise exception 'Transaction type % does not apply to % funding', v_kind, v_inv.funding_type;
  end if;
  perform private.fin_require_account(p ->> 'account_id');

  if v_kind = 'loan_principal' then
    v_received := private.fin_investment_sum(v_inv.id, array['loan_receipt']);
    v_out := private.fin_investment_sum(v_inv.id, array['loan_principal']);
    if v_amount > v_received - v_out + 0.005 then
      raise exception 'Principal repayment (%) exceeds outstanding principal (%)', v_amount, round(v_received - v_out, 2);
    end if;
  elsif v_kind = 'capital_withdrawal' then
    v_received := private.fin_investment_sum(v_inv.id, array['owner_contribution', 'equity_receipt']);
    v_out := private.fin_investment_sum(v_inv.id, array['capital_withdrawal']);
    if v_amount > v_received - v_out + 0.005 then
      raise exception 'Withdrawal (%) exceeds net capital contributed (%)', v_amount, round(v_received - v_out, 2);
    end if;
  end if;

  insert into public.fin_ledger_entries (
    entry_date, account_id, direction, amount, kind, method, reference, counterparty,
    investment_id, notes, created_by
  ) values (
    coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    p ->> 'account_id',
    case when v_kind in ('owner_contribution', 'equity_receipt', 'loan_receipt', 'grant_receipt', 'other_funding_receipt')
      then 'in' else 'out' end,
    v_amount, v_kind, nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
    (select name from public.fin_investors where id = v_inv.investor_id),
    v_inv.id, nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function private.fin_create_allocation(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_investment_id uuid := nullif(p ->> 'investment_id', '')::uuid;
  v_exception boolean := coalesce(nullif(p ->> 'exception_approved', '')::boolean, false);
  v_available numeric;
  v_id uuid;
begin
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if coalesce(trim(p ->> 'purpose'), '') = '' then raise exception 'Purpose is required'; end if;
  if v_exception and coalesce(trim(p ->> 'exception_reason'), '') = '' then
    raise exception 'Explain why this allocation exceeds available funds';
  end if;

  if v_investment_id is not null then
    perform 1 from public.fin_investments where id = v_investment_id for update;
    if not found then raise exception 'Funding agreement not found'; end if;
    v_available :=
      private.fin_investment_sum(v_investment_id,
        array['owner_contribution', 'equity_receipt', 'loan_receipt', 'grant_receipt', 'other_funding_receipt'])
      - coalesce((select sum(amount) from public.fin_allocations
                  where investment_id = v_investment_id and status <> 'cancelled'), 0);
  else
    -- Pooled funds: all funding received, less capital returned and principal
    -- repaid, less every existing allocation.
    v_available :=
      coalesce((select sum(private.fin_kind_sign(kind, direction) * amount) from public.fin_ledger_entries
                where kind in ('owner_contribution', 'equity_receipt', 'loan_receipt', 'grant_receipt', 'other_funding_receipt')), 0)
      - coalesce((select sum(private.fin_kind_sign(kind, direction) * amount) from public.fin_ledger_entries
                  where kind in ('capital_withdrawal', 'loan_principal')), 0)
      - coalesce((select sum(amount) from public.fin_allocations where status <> 'cancelled'), 0);
  end if;

  if v_amount > v_available + 0.005 and not v_exception then
    raise exception 'Allocation (%) exceeds available funds (%). An admin exception with a reason is required.',
      v_amount, round(greatest(v_available, 0), 2);
  end if;

  insert into public.fin_allocations (
    investment_id, project_id, department_id, purpose, amount, allocation_date, approved_by,
    exception_approved, exception_reason, notes, created_by
  ) values (
    v_investment_id, nullif(p ->> 'project_id', '')::uuid, nullif(p ->> 'department_id', ''),
    trim(p ->> 'purpose'), v_amount,
    coalesce(nullif(p ->> 'allocation_date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    coalesce(nullif(trim(p ->> 'approved_by'), ''), private.fin_actor()),
    v_exception and v_amount > v_available + 0.005,
    case when v_exception and v_amount > v_available + 0.005 then trim(p ->> 'exception_reason') end,
    nullif(trim(p ->> 'notes'), ''), private.fin_actor()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts: transfers, adjustments, reversals
-- ---------------------------------------------------------------------------

create or replace function private.fin_transfer(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_from text := p ->> 'from_account_id';
  v_to text := p ->> 'to_account_id';
  v_group uuid := gen_random_uuid();
  v_date date := coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date);
begin
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if v_from = v_to then raise exception 'Choose two different accounts'; end if;
  perform private.fin_require_account(v_from);
  perform private.fin_require_account(v_to);

  insert into public.fin_ledger_entries
    (entry_date, account_id, direction, amount, kind, method, reference, transfer_group_id, notes, created_by)
  values
    (v_date, v_from, 'out', v_amount, 'transfer_out', nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
     v_group, nullif(trim(p ->> 'notes'), ''), private.fin_actor()),
    (v_date, v_to, 'in', v_amount, 'transfer_in', nullif(p ->> 'method', ''), nullif(trim(p ->> 'reference'), ''),
     v_group, nullif(trim(p ->> 'notes'), ''), private.fin_actor());

  return v_group;
end;
$$;

create or replace function private.fin_record_adjustment(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
  v_amount numeric := round(coalesce(nullif(p ->> 'amount', '')::numeric, 0), 2);
  v_entry_id uuid;
begin
  if v_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if (p ->> 'direction') not in ('in', 'out') then raise exception 'Choose money in or money out'; end if;
  if coalesce(trim(p ->> 'notes'), '') = '' then raise exception 'Explain the adjustment'; end if;
  perform private.fin_require_account(p ->> 'account_id');

  insert into public.fin_ledger_entries
    (entry_date, account_id, direction, amount, kind, reference, notes, created_by)
  values (
    coalesce(nullif(p ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date),
    p ->> 'account_id', p ->> 'direction', v_amount, 'adjustment',
    nullif(trim(p ->> 'reference'), ''), trim(p ->> 'notes'), private.fin_actor()
  ) returning id into v_entry_id;

  return v_entry_id;
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
      expense_id, investment_id, transfer_group_id, reversal_of, notes, created_by
    ) values (
      (now() at time zone 'Asia/Dhaka')::date, v_row.account_id,
      case when v_row.direction = 'in' then 'out' else 'in' end,
      v_row.amount, v_row.kind, v_row.method, v_row.reference, v_row.counterparty,
      v_row.expense_id, v_row.investment_id, v_row.transfer_group_id, v_row.id,
      'Reversal: ' || trim(p_reason), private.fin_actor()
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public INVOKER wrappers
-- ---------------------------------------------------------------------------

create or replace function public.fin_create_expense(p jsonb)
returns jsonb language sql security invoker set search_path = public, private
as $$ select private.fin_create_expense(p); $$;

create or replace function public.fin_update_expense_details(p_expense_id uuid, p jsonb)
returns void language sql security invoker set search_path = public, private
as $$ select private.fin_update_expense_details(p_expense_id, p); $$;

create or replace function public.fin_record_expense_payment(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_record_expense_payment(p); $$;

create or replace function public.fin_record_reimbursement(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_record_reimbursement(p); $$;

create or replace function public.fin_set_expense_approval(p_expense_id uuid, p_status text, p_note text)
returns void language sql security invoker set search_path = public, private
as $$ select private.fin_set_expense_approval(p_expense_id, p_status, p_note); $$;

create or replace function public.fin_void_expense(p_expense_id uuid, p_reason text)
returns int language sql security invoker set search_path = public, private
as $$ select private.fin_void_expense(p_expense_id, p_reason); $$;

create or replace function public.fin_settle_deposit(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_settle_deposit(p); $$;

create or replace function public.fin_create_investment(p jsonb)
returns jsonb language sql security invoker set search_path = public, private
as $$ select private.fin_create_investment(p); $$;

create or replace function public.fin_record_investment_txn(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_record_investment_txn(p); $$;

create or replace function public.fin_create_allocation(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_create_allocation(p); $$;

create or replace function public.fin_transfer(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_transfer(p); $$;

create or replace function public.fin_record_adjustment(p jsonb)
returns uuid language sql security invoker set search_path = public, private
as $$ select private.fin_record_adjustment(p); $$;

create or replace function public.fin_reverse_ledger_entry(p_entry_id uuid, p_reason text)
returns int language sql security invoker set search_path = public, private
as $$ select private.fin_reverse_ledger_entry(p_entry_id, p_reason); $$;

-- ---------------------------------------------------------------------------
-- Grants: authenticated only (each implementation checks the role).
-- ---------------------------------------------------------------------------

do $$
declare
  sig text;
begin
  foreach sig in array array[
    'fin_require_role(text[])',
    'fin_actor()',
    'fin_kind_sign(text, text)',
    'fin_is_reversed(uuid)',
    'fin_expense_net_paid(uuid)',
    'fin_expense_payments_net(uuid)',
    'fin_expense_reimbursed(uuid)',
    'fin_deposit_outstanding(uuid)',
    'fin_investment_sum(uuid, text[])',
    'fin_require_account(text)'
  ]
  loop
    execute format('revoke all on function private.%s from public, anon, authenticated', sig);
  end loop;

  foreach sig in array array[
    'fin_create_expense(jsonb)',
    'fin_update_expense_details(uuid, jsonb)',
    'fin_record_expense_payment(jsonb)',
    'fin_record_reimbursement(jsonb)',
    'fin_set_expense_approval(uuid, text, text)',
    'fin_void_expense(uuid, text)',
    'fin_settle_deposit(jsonb)',
    'fin_create_investment(jsonb)',
    'fin_record_investment_txn(jsonb)',
    'fin_create_allocation(jsonb)',
    'fin_transfer(jsonb)',
    'fin_record_adjustment(jsonb)',
    'fin_reverse_ledger_entry(uuid, text)'
  ]
  loop
    execute format('revoke all on function private.%s from public, anon, authenticated', sig);
    execute format('grant execute on function private.%s to authenticated', sig);
    execute format('revoke all on function public.%s from public, anon, authenticated', sig);
    execute format('grant execute on function public.%s to authenticated', sig);
  end loop;
end;
$$;
