-- Allow finance actions (expenses, payments, approvals) in the staff activity log.
-- Run after 048_finance_rpcs.sql

alter table public.staff_activity_log drop constraint if exists staff_activity_log_category_check;
alter table public.staff_activity_log
  add constraint staff_activity_log_category_check check (
    category in ('booking', 'housekeeping', 'guest', 'staff', 'inquiry', 'settings', 'team', 'system', 'finance')
  );
