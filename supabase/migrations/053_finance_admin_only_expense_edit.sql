-- Only admins can edit an expense after it has been submitted. Managers can
-- still record expenses, payments, reimbursements and deposit settlements.
-- Amounts and lines are never edited in place; void and re-enter instead.
-- Run after 052_staff_full_time_shift.sql

create or replace function private.fin_update_expense_details(p_expense_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := private.fin_require_role(array['admin']);
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

revoke all on function private.fin_update_expense_details(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.fin_update_expense_details(uuid, jsonb) to authenticated;
