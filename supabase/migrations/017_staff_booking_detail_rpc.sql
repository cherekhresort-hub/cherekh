-- Staff booking drawer: load full payload when direct table SELECT is blocked by RLS
-- (bookings_list view may still list rows for authenticated users).

create or replace function public.get_staff_booking(p_id text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select b.payload
  from public.bookings b
  where b.id = p_id
    and public.current_user_role() is not null
  limit 1;
$$;

revoke all on function public.get_staff_booking(text) from public;
grant execute on function public.get_staff_booking(text) to authenticated;
