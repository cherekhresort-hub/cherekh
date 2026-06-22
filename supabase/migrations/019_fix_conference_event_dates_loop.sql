-- Fix conference_event_dates_available: loop variable must be text, not jsonb

create or replace function public.conference_event_dates_available(
  p_event_dates jsonb,
  p_exclude_id text default null
)
returns boolean
language plpgsql
stable
as $$
declare
  v_elem text;
  v_date date;
begin
  if jsonb_typeof(p_event_dates) <> 'array' or jsonb_array_length(p_event_dates) = 0 then
    return false;
  end if;

  for v_elem in select val from jsonb_array_elements_text(p_event_dates) as t(val) loop
    v_date := v_elem::date;
    if public.conference_bookings_on_date(v_date, p_exclude_id) >= 1 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;
