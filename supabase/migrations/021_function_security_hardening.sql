-- Supabase security advisor: harden function search_path and RPC execute grants
-- Run after 020_security_invoker_views.sql

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on internal helpers (lint 0011)
-- ---------------------------------------------------------------------------

alter function public.touch_contact_inquiries_updated_at()
  set search_path = public;

alter function public.room_type_capacity(text)
  set search_path = public;

alter function public.booking_room_lines(jsonb)
  set search_path = public;

alter function public.booking_line_matches_pool(text, text[])
  set search_path = public;

alter function public.booking_pool_usage(text[], date, date, text)
  set search_path = public;

alter function public.physical_room_available(text, date, date, text)
  set search_path = public;

alter function public.legacy_type_remaining(text, date, date, text)
  set search_path = public;

alter function public.room_type_remaining_units(text, date, date, text)
  set search_path = public;

alter function public.lock_overlapping_bookings(date, date)
  set search_path = public;

alter function public.booking_blocks_conference_date(jsonb, date, date, date)
  set search_path = public;

alter function public.conference_bookings_on_date(date, text)
  set search_path = public;

alter function public.conference_event_dates_available(jsonb, text)
  set search_path = public;

alter function public.direct_bookings_on_room(text, date, date, text)
  set search_path = public;

alter function public.booking_inventory_available(date, date, jsonb, text)
  set search_path = public;

-- ---------------------------------------------------------------------------
-- 2. Role helpers: authenticated only (used in RLS, not public RPC)
-- ---------------------------------------------------------------------------

revoke all on function public.current_user_role() from anon, authenticated, public;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.current_user_is_admin() from anon, authenticated, public;
grant execute on function public.current_user_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Staff-only RPCs: authenticated only (lint 0028)
-- ---------------------------------------------------------------------------

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
-- 4. Trigger-only functions: not callable via PostgREST RPC
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
-- 5. Public booking RPCs: keep anon + authenticated (intentional)
-- ---------------------------------------------------------------------------

revoke all on function public.get_booking_confirmation(text, text) from anon, authenticated, public;
grant execute on function public.get_booking_confirmation(text, text) to anon, authenticated;

revoke all on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  from anon, authenticated, public;
grant execute on function public.insert_booking_if_available(text, jsonb, date, date, text, text)
  to anon, authenticated;

revoke all on function public.list_booking_availability() from anon, authenticated, public;
grant execute on function public.list_booking_availability() to anon, authenticated;
