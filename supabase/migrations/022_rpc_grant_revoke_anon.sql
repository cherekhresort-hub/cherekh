-- Supabase grants EXECUTE directly to anon/authenticated in earlier migrations.
-- REVOKE FROM PUBLIC alone does not remove those explicit grants (lint 0028).

-- ---------------------------------------------------------------------------
-- Staff / internal RPCs: authenticated only
-- ---------------------------------------------------------------------------

revoke all on function public.current_user_role() from anon, authenticated, public;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.current_user_is_admin() from anon, authenticated, public;
grant execute on function public.current_user_is_admin() to authenticated;

revoke all on function public.get_staff_booking(text) from anon, authenticated, public;
grant execute on function public.get_staff_booking(text) to authenticated;

revoke all on function public.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  from anon, authenticated, public;
grant execute on function public.upsert_booking_if_available(text, jsonb, text, date, date, text, text)
  to authenticated;

revoke all on function public.update_booking_status_safe(text, text) from anon, authenticated, public;
grant execute on function public.update_booking_status_safe(text, text) to authenticated;

revoke all on function public.checkout_past_confirmed_bookings() from anon, authenticated, public;
grant execute on function public.checkout_past_confirmed_bookings() to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger-only: no API role may call these via PostgREST
-- ---------------------------------------------------------------------------

revoke all on function public.sync_user_role_id() from anon, authenticated, public;

revoke all on function public.touch_contact_inquiries_updated_at() from anon, authenticated, public;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    revoke all on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public guest booking RPCs: anon + authenticated (intentional warnings remain)
-- ---------------------------------------------------------------------------

revoke all on function public.get_booking_confirmation(text, text) from anon, authenticated, public;
grant execute on function public.get_booking_confirmation(text, text) to anon, authenticated;

revoke all on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  from anon, authenticated, public;
grant execute on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  to anon, authenticated;

revoke all on function public.list_booking_availability() from anon, authenticated, public;
grant execute on function public.list_booking_availability() to anon, authenticated;
