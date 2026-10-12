-- Staff roster: allow a "full time" schedule alongside the morning, afternoon
-- and night shifts. Existing rows are unchanged.

alter table public.staff_members drop constraint if exists staff_members_shift_check;

alter table public.staff_members
  add constraint staff_members_shift_check
  check (shift in ('morning', 'afternoon', 'night', 'full-time', 'off'));
