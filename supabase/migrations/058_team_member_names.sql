-- Display names for team members (admin panel + "booked by" labels).
-- Admins set names via the team-members function (service role).
-- Members set their own name via set_my_display_name; user_roles stays non-writable for them.

alter table public.user_roles
  add column if not exists display_name text;

alter table public.user_roles drop constraint if exists user_roles_display_name_length;
alter table public.user_roles add constraint user_roles_display_name_length
  check (display_name is null or char_length(display_name) <= 60);

create or replace function public.set_my_display_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower((select public.current_auth_email()));
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_email = '' then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'display_name_too_long' using errcode = '22001';
  end if;

  update public.user_roles
  set display_name = v_name,
      updated_at = now()
  where lower(email) = v_email;

  if not found then
    raise exception 'not_a_team_member' using errcode = '42501';
  end if;

  return v_name;
end;
$$;

revoke all on function public.set_my_display_name(text) from anon, authenticated, public;
grant execute on function public.set_my_display_name(text) to authenticated;

-- Staff-only directory (email → name) for booking creator labels.
create or replace function public.staff_directory()
returns table (email text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select lower(r.email), r.display_name
  from public.user_roles r
  where (select public.current_user_role()) is not null;
$$;

revoke all on function public.staff_directory() from anon, authenticated, public;
grant execute on function public.staff_directory() to authenticated;
