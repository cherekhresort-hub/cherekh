-- Fix auth_rls_initplan on user_roles: linter matches literal "select auth.jwt()" in policy text.
-- Subselects like (select auth.jwt() ->> 'email') are stored with extra parens and still fail the lint.
-- Use a helper so the policy never calls auth.* directly.

create or replace function public.current_auth_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt()) ->> 'email', '');
$$;

revoke all on function public.current_auth_email() from anon, authenticated, public;
grant execute on function public.current_auth_email() to authenticated;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where lower(email) = lower((select public.current_auth_email()))
  limit 1;
$$;

drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role"
  on public.user_roles for select
  to authenticated
  using (lower(email) = lower((select public.current_auth_email())));
