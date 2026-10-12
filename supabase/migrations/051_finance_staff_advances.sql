-- Staff advances / loans: money lent to a staff member (salary advance or
-- personal loan). Recorded as an expense line in this subcategory, paid by
-- Cherekh Center; fin_expenses.employee_staff_id / employee_name hold the staff
-- member. Like other refundable advances it is not an expense: it stays a
-- balance until repaid (deposit refund), deducted from a later bill such as
-- salary (applied), or forgiven (written off).
-- Run after 050_finance_simple_capital.sql

insert into public.fin_categories (
  id, parent_id, code, name, classification, department_id,
  requires_approval, approval_threshold, requires_description, sort_order
)
select
  'cat-x-staff-advance-loan',
  p.id,
  null,
  'Staff advance / loan',
  'deposit_advance',
  'human_resources',
  p.requires_approval,
  p.approval_threshold,
  p.requires_description,
  6
from public.fin_categories p
where p.id = 'cat-x'
on conflict (id) do nothing;
