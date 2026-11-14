-- Staff payroll: monthly salary per staff member and one payroll record per
-- staff member per month.
-- Run after 061_booking_officer_hide_payments.sql
--
-- A payroll is a salary expense (fin_expenses) in the H. Salaries category:
--   base salary, allowances, overtime and bonus are expense lines;
--   deductions (absence, late, penalty) reduce the expense total (discount);
--   advances recovered are staff advances applied to the salary (no cash moves);
--   the salary paid is an expense payment from a cash, wallet or bank account.
-- Corrections void the salary expense (admin), which reverses its payments and
-- returns recovered advances to the staff member's balance. Nothing is deleted.

-- ---------------------------------------------------------------------------
-- Bonus category (salaries, overtime and allowances already exist in 043)
-- ---------------------------------------------------------------------------

insert into public.fin_categories (
  id, parent_id, code, name, classification, department_id,
  requires_approval, approval_threshold, requires_description, sort_order
)
select
  'cat-h-staff-bonus', p.id, null, 'Staff bonus', 'operating_expense', 'human_resources',
  p.requires_approval, p.approval_threshold, false, 14
from public.fin_categories p
where p.id = 'cat-h'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Monthly salary (id is the staff member id)
-- ---------------------------------------------------------------------------

create table if not exists public.staff_salaries (
  id text primary key references public.staff_members (id) on delete cascade,
  monthly_salary numeric(14, 2) not null check (monthly_salary >= 0),
  updated_by text,
  updated_at timestamptz not null default now()
);

drop trigger if exists staff_salaries_audit on public.staff_salaries;
create trigger staff_salaries_audit after insert or update or delete on public.staff_salaries
  for each row execute function private.fin_audit_trigger();

drop trigger if exists staff_salaries_touch on public.staff_salaries;
create trigger staff_salaries_touch before update on public.staff_salaries
  for each row execute function private.fin_touch_updated_at();

alter table public.staff_salaries enable row level security;

drop policy if exists "Finance staff read staff_salaries" on public.staff_salaries;
create policy "Finance staff read staff_salaries"
  on public.staff_salaries for select to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'));

drop policy if exists "Admins insert staff_salaries" on public.staff_salaries;
create policy "Admins insert staff_salaries"
  on public.staff_salaries for insert to authenticated
  with check ((select public.current_user_role()) = 'admin');

drop policy if exists "Admins update staff_salaries" on public.staff_salaries;
create policy "Admins update staff_salaries"
  on public.staff_salaries for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

revoke all on public.staff_salaries from anon, authenticated;
grant select, insert, update on public.staff_salaries to authenticated;

-- ---------------------------------------------------------------------------
-- Payroll records (written only by fin_create_payroll)
-- ---------------------------------------------------------------------------

create table if not exists public.fin_payroll (
  id uuid primary key default gen_random_uuid(),
  staff_id text references public.staff_members (id) on delete set null,
  staff_name text not null,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  expense_id uuid not null unique references public.fin_expenses (id) on delete restrict,
  base_salary numeric(14, 2) not null default 0 check (base_salary >= 0),
  -- [{ "type": "allowance" | "overtime" | "bonus" | "other", "label": text, "amount": number }]
  earnings jsonb not null default '[]'::jsonb,
  -- [{ "label": text, "amount": number }]
  deductions jsonb not null default '[]'::jsonb,
  gross numeric(14, 2) not null check (gross >= 0),
  total_deductions numeric(14, 2) not null default 0 check (total_deductions >= 0),
  advance_recovered numeric(14, 2) not null default 0 check (advance_recovered >= 0),
  net_pay numeric(14, 2) not null check (net_pay >= 0),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists fin_payroll_period_idx on public.fin_payroll (period);
create index if not exists fin_payroll_staff_idx on public.fin_payroll (staff_id, period);

drop trigger if exists fin_payroll_audit on public.fin_payroll;
create trigger fin_payroll_audit after insert or update or delete on public.fin_payroll
  for each row execute function private.fin_audit_trigger();

alter table public.fin_payroll enable row level security;

drop policy if exists "Finance staff read fin_payroll" on public.fin_payroll;
create policy "Finance staff read fin_payroll"
  on public.fin_payroll for select to authenticated
  using ((select public.current_user_role()) in ('admin', 'manager'));

revoke all on public.fin_payroll from anon, authenticated;
grant select on public.fin_payroll to authenticated;

-- ---------------------------------------------------------------------------
-- fin_create_payroll: salary expense + advance recoveries + optional payment,
-- all in one transaction.
-- ---------------------------------------------------------------------------

create or replace function private.fin_create_payroll(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin', 'manager']);
  v_actor text := private.fin_actor();
  v_staff public.staff_members;
  v_period text := p ->> 'period';
  v_period_end date;
  v_base numeric := round(coalesce(nullif(p ->> 'base_salary', '')::numeric, 0), 2);
  v_earnings jsonb := coalesce(p -> 'earnings', '[]'::jsonb);
  v_deductions jsonb := coalesce(p -> 'deductions', '[]'::jsonb);
  v_advances jsonb := coalesce(p -> 'advances', '[]'::jsonb);
  v_pay jsonb := p -> 'payment';
  v_item jsonb;
  v_amount numeric;
  v_type text;
  v_label text;
  v_lines jsonb := '[]'::jsonb;
  v_clean_earnings jsonb := '[]'::jsonb;
  v_clean_deductions jsonb := '[]'::jsonb;
  v_gross numeric := 0;
  v_total_deductions numeric := 0;
  v_recovered numeric := 0;
  v_expense jsonb;
  v_expense_id uuid;
  v_advance public.fin_expenses;
  v_settle_date date;
  v_payroll_id uuid;
begin
  if v_period is null or v_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Choose the payroll month';
  end if;
  v_period_end := (to_date(v_period || '-01', 'YYYY-MM-DD') + interval '1 month' - interval '1 day')::date;

  select * into v_staff from public.staff_members where id = nullif(p ->> 'staff_id', '');
  if not found then raise exception 'Staff member not found'; end if;

  perform pg_advisory_xact_lock(hashtext('fin_payroll:' || v_staff.id || ':' || v_period));
  if exists (
    select 1 from public.fin_payroll pr
    join public.fin_expenses e on e.id = pr.expense_id
    where pr.staff_id = v_staff.id and pr.period = v_period and e.status = 'active'
  ) then
    raise exception '% already has a payroll for %. Void it first to redo it.', v_staff.name, v_period;
  end if;

  if v_base < 0 then raise exception 'Base salary cannot be negative'; end if;
  if jsonb_typeof(v_earnings) <> 'array' or jsonb_typeof(v_deductions) <> 'array' or jsonb_typeof(v_advances) <> 'array' then
    raise exception 'Invalid payroll details';
  end if;

  if v_base > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Base salary · ' || v_period, 'category_id', 'cat-h-staff-salaries',
      'quantity', 1, 'unit_price', v_base));
    v_gross := v_base;
  end if;

  for v_item in select * from jsonb_array_elements(v_earnings) loop
    v_amount := round(coalesce(nullif(v_item ->> 'amount', '')::numeric, 0), 2);
    v_type := coalesce(v_item ->> 'type', 'other');
    v_label := nullif(trim(v_item ->> 'label'), '');
    if v_amount <= 0 then raise exception 'Each addition needs an amount greater than zero'; end if;
    if v_type not in ('allowance', 'overtime', 'bonus', 'other') then raise exception 'Invalid addition type'; end if;
    v_label := coalesce(v_label, initcap(v_type));
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', v_label,
      'category_id', case v_type
        when 'allowance' then 'cat-h-staff-allowances'
        when 'overtime' then 'cat-h-overtime'
        when 'bonus' then 'cat-h-staff-bonus'
        else 'cat-h-other-personnel-costs'
      end,
      'quantity', 1, 'unit_price', v_amount));
    v_clean_earnings := v_clean_earnings || jsonb_build_array(jsonb_build_object('type', v_type, 'label', v_label, 'amount', v_amount));
    v_gross := v_gross + v_amount;
  end loop;

  if v_gross <= 0 then raise exception 'Enter a salary or an addition to pay'; end if;

  for v_item in select * from jsonb_array_elements(v_deductions) loop
    v_amount := round(coalesce(nullif(v_item ->> 'amount', '')::numeric, 0), 2);
    v_label := nullif(trim(v_item ->> 'label'), '');
    if v_amount <= 0 then raise exception 'Each deduction needs an amount greater than zero'; end if;
    if v_label is null then raise exception 'Give each deduction a reason'; end if;
    v_clean_deductions := v_clean_deductions || jsonb_build_array(jsonb_build_object('label', v_label, 'amount', v_amount));
    v_total_deductions := v_total_deductions + v_amount;
  end loop;

  if v_total_deductions > v_gross + 0.005 then
    raise exception 'Deductions (%) cannot exceed the gross pay (%)', v_total_deductions, v_gross;
  end if;

  v_expense := private.fin_create_expense(jsonb_build_object(
    'title', 'Salary · ' || v_staff.name || ' · ' || to_char(to_date(v_period || '-01', 'YYYY-MM-DD'), 'FMMonth YYYY'),
    'txn_date', v_period_end,
    'payee_name', v_staff.name,
    'department_id', 'human_resources',
    'phase', 'operating',
    'description', case when v_total_deductions > 0
      then 'Deductions: ' || (select string_agg((d ->> 'label') || ' ' || (d ->> 'amount'), ', ') from jsonb_array_elements(v_clean_deductions) d)
      end,
    'discount', v_total_deductions,
    'paid_by_type', 'company',
    'employee_staff_id', v_staff.id,
    'employee_name', v_staff.name,
    'tags', jsonb_build_array('payroll', v_period),
    'notes', nullif(trim(p ->> 'notes'), ''),
    'lines', v_lines
  ));
  v_expense_id := (v_expense ->> 'id')::uuid;

  v_settle_date := coalesce(nullif(v_pay ->> 'date', '')::date, (now() at time zone 'Asia/Dhaka')::date);
  for v_item in select * from jsonb_array_elements(v_advances) loop
    v_amount := round(coalesce(nullif(v_item ->> 'amount', '')::numeric, 0), 2);
    if v_amount <= 0 then continue; end if;
    select * into v_advance from public.fin_expenses where id = nullif(v_item ->> 'expense_id', '')::uuid;
    if not found or v_advance.employee_staff_id is distinct from v_staff.id or not exists (
      select 1 from public.fin_expense_lines l
      where l.expense_id = v_advance.id and l.category_id = 'cat-x-staff-advance-loan'
    ) then
      raise exception 'Advance % does not belong to %', coalesce(v_advance.code, v_item ->> 'expense_id'), v_staff.name;
    end if;
    perform private.fin_settle_deposit(jsonb_build_object(
      'kind', 'applied',
      'expense_id', v_advance.id,
      'amount', v_amount,
      'applied_expense_id', v_expense_id,
      'date', v_settle_date,
      'notes', 'Recovered from salary ' || v_period
    ));
    v_recovered := v_recovered + v_amount;
  end loop;

  if v_pay is not null and coalesce(nullif(v_pay ->> 'amount', '')::numeric, 0) > 0 then
    perform private.fin_record_expense_payment(v_pay || jsonb_build_object('expense_id', v_expense_id, 'kind', 'expense_payment'));
  end if;

  insert into public.fin_payroll (
    staff_id, staff_name, period, expense_id, base_salary, earnings, deductions,
    gross, total_deductions, advance_recovered, net_pay, notes, created_by
  ) values (
    v_staff.id, v_staff.name, v_period, v_expense_id, v_base, v_clean_earnings, v_clean_deductions,
    v_gross, v_total_deductions, v_recovered, round(v_gross - v_total_deductions - v_recovered, 2),
    nullif(trim(p ->> 'notes'), ''), v_actor
  ) returning id into v_payroll_id;

  return jsonb_build_object('id', v_payroll_id, 'expense_id', v_expense_id, 'code', v_expense ->> 'code');
end;
$$;

create or replace function public.fin_create_payroll(p jsonb)
returns jsonb language sql security invoker set search_path = public, private
as $$ select private.fin_create_payroll(p); $$;

revoke all on function private.fin_create_payroll(jsonb) from public, anon, authenticated;
grant execute on function private.fin_create_payroll(jsonb) to authenticated;
revoke all on function public.fin_create_payroll(jsonb) from public, anon, authenticated;
grant execute on function public.fin_create_payroll(jsonb) to authenticated;
