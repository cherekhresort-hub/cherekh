-- Fire (terminate) staff members. Only admins can set or clear termination.
-- Run after 062_staff_payroll.sql
--
-- The staff record is kept so payroll, advances and history stay intact.
-- Managers can still edit other staff fields; the trigger rejects any change
-- to the termination columns unless the caller is an admin.

alter table public.staff_members
  add column if not exists terminated_on date,
  add column if not exists termination_reason text,
  add column if not exists terminated_by text;

alter table public.staff_members drop constraint if exists staff_members_termination_reason;
alter table public.staff_members add constraint staff_members_termination_reason
  check (terminated_on is null or coalesce(trim(termination_reason), '') <> '');

create or replace function private.staff_guard_termination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.terminated_on is not null)
     or (tg_op = 'UPDATE' and (
       new.terminated_on is distinct from old.terminated_on
       or new.termination_reason is distinct from old.termination_reason
       or new.terminated_by is distinct from old.terminated_by
     )) then
    if public.current_user_role() is distinct from 'admin' then
      raise exception 'Only admins can fire or reinstate staff' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.staff_guard_termination() from public, anon, authenticated;

drop trigger if exists staff_members_guard_termination on public.staff_members;
create trigger staff_members_guard_termination
  before insert or update on public.staff_members
  for each row execute function private.staff_guard_termination();
