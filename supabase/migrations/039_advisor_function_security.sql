-- Security advisor (lints 0011, 0028, 0029)
-- Run after 038_menu_name_hyphens.sql (or any later 03x already applied).
--
-- This migration:
--   1. Pins search_path on normalize_guest_email / normalize_guest_phone (lint 0011).
--   2. Switches role helpers to SECURITY INVOKER so they are not privileged RPCs (lint 0029).
--   3. Leaves guest/staff SECURITY DEFINER RPCs as-is: they must run as the owner
--      because anon/authenticated cannot insert or scan bookings under RLS.
--      Advisor warnings for those functions are intentional.
--
-- Dashboard-only (not SQL): Authentication → Providers → Email →
-- Leaked password protection (HaveIBeenPwned; Pro plan and above).
-- Enable that toggle for lint auth_leaked_password_protection.

-- ---------------------------------------------------------------------------
-- 1. Lint 0011: mutable search_path on immutable helpers from 030
-- ---------------------------------------------------------------------------

create or replace function public.normalize_guest_email(p_email text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create or replace function public.normalize_guest_phone(p_phone text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g');
$$;

revoke all on function public.normalize_guest_email(text) from public, anon, authenticated;
revoke all on function public.normalize_guest_phone(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lint 0029: role helpers do not need DEFINER (JWT + own user_roles row)
-- ---------------------------------------------------------------------------

create or replace function public.current_auth_email()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((select auth.jwt()) ->> 'email', '');
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select role
  from public.user_roles
  where lower(email) = lower((select public.current_auth_email()))
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select public.current_user_role()) = 'admin';
$$;

create or replace function public.current_user_is_admin_or_manager()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select public.current_user_role()) in ('admin', 'manager');
$$;

revoke all on function public.current_auth_email() from anon, authenticated, public;
grant execute on function public.current_auth_email() to authenticated;

revoke all on function public.current_user_role() from anon, authenticated, public;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.current_user_is_admin() from anon, authenticated, public;
grant execute on function public.current_user_is_admin() to authenticated;

revoke all on function public.current_user_is_admin_or_manager() from anon, authenticated, public;
grant execute on function public.current_user_is_admin_or_manager() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Intentional SECURITY DEFINER RPCs (lints 0028 / 0029 remain)
-- ---------------------------------------------------------------------------
-- Guest site (anon + authenticated):
--   get_booking_confirmation, insert_booking_if_available,
--   insert_contact_inquiry_if_allowed, list_booking_availability
-- Staff dashboard (authenticated only; each function checks current_user_role):
--   get_staff_booking, upsert_booking_if_available, update_booking_status_safe,
--   checkout_past_confirmed_bookings
-- Switching these to SECURITY INVOKER would fail under RLS. Do not revoke EXECUTE.
