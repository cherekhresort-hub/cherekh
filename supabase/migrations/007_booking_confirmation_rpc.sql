-- Guest thank-you page: fetch booking payload when id + email match (no full table exposure to anon)
create or replace function public.get_booking_confirmation(p_id text, p_email text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select b.payload
  from public.bookings b
  where b.id = p_id
    and lower(trim(b.guest_email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_booking_confirmation(text, text) from public;
grant execute on function public.get_booking_confirmation(text, text) to anon, authenticated;
