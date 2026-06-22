-- Conference bookings: discrete event dates in payload (not contiguous ranges)

create or replace function public.booking_blocks_conference_date(
  p_payload jsonb,
  p_check_in date,
  p_check_out date,
  p_date date
)
returns boolean
language sql
immutable
as $$
  select
    case
      when jsonb_typeof(p_payload->'eventDates') = 'array'
        and jsonb_array_length(p_payload->'eventDates') > 0 then
        exists (
          select 1
          from jsonb_array_elements_text(p_payload->'eventDates') as d(val)
          where d.val::date = p_date
        )
      else p_date >= p_check_in and p_date < p_check_out
    end;
$$;

create or replace function public.conference_bookings_on_date(
  p_date date,
  p_exclude_id text default null
)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.bookings b
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(b.payload->'rooms') = 'array' and jsonb_array_length(b.payload->'rooms') > 0
        then b.payload->'rooms'
      else jsonb_build_array(
        jsonb_build_object('roomType', coalesce(b.payload->>'roomType', ''))
      )
    end
  ) as line
  where b.status in ('pending', 'confirmed')
    and (p_exclude_id is null or b.id <> p_exclude_id)
    and line->>'roomType' = 'conference'
    and public.booking_blocks_conference_date(b.payload, b.check_in, b.check_out, p_date);
$$;

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

create or replace function public.direct_bookings_on_room(
  p_room_id text,
  p_check_in date,
  p_check_out date,
  p_exclude_id text default null
)
returns int
language plpgsql
stable
as $$
declare
  v_day date;
  v_count int := 0;
  v_day_count int;
begin
  if p_room_id = 'conference' then
    v_day := p_check_in;
    while v_day < p_check_out loop
      v_day_count := public.conference_bookings_on_date(v_day, p_exclude_id);
      v_count := greatest(v_count, v_day_count);
      v_day := v_day + 1;
    end loop;
    return v_count;
  end if;

  return (
    select count(*)::int
    from public.bookings b
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(b.payload->'rooms') = 'array' and jsonb_array_length(b.payload->'rooms') > 0
          then b.payload->'rooms'
        else jsonb_build_array(
          jsonb_build_object('roomType', coalesce(b.payload->>'roomType', ''))
        )
      end
    ) as line
    where b.status in ('pending', 'confirmed')
      and p_check_in < b.check_out
      and p_check_out > b.check_in
      and (p_exclude_id is null or b.id <> p_exclude_id)
      and line->>'roomType' = p_room_id
  );
end;
$$;

create or replace function public.booking_inventory_available(
  p_check_in date,
  p_check_out date,
  p_payload jsonb,
  p_exclude_id text default null
)
returns boolean
language plpgsql
stable
as $$
declare
  r record;
  v_needed jsonb := '{}'::jsonb;
  v_key text;
  v_count int;
  v_remaining int;
  v_cap int;
  v_has_conference boolean := false;
  v_event_dates jsonb;
begin
  if p_check_out <= p_check_in then
    return false;
  end if;

  v_event_dates := p_payload->'eventDates';

  for r in select * from public.booking_room_lines(p_payload) loop
    v_cap := public.room_type_capacity(r.room_type);
    if v_cap <= 0 then
      return false;
    end if;
    if r.adults < 1 or (r.adults + r.children) > v_cap then
      return false;
    end if;

    if r.room_type = 'conference' then
      v_has_conference := true;
    end if;

    v_key := r.room_type;
    v_count := coalesce((v_needed->>v_key)::int, 0) + 1;
    v_needed := jsonb_set(v_needed, array[v_key], to_jsonb(v_count), true);
  end loop;

  if v_has_conference
    and jsonb_typeof(v_event_dates) = 'array'
    and jsonb_array_length(v_event_dates) > 0 then
    if not public.conference_event_dates_available(v_event_dates, p_exclude_id) then
      return false;
    end if;
    v_needed := v_needed - 'conference';
    if v_needed = '{}'::jsonb then
      return true;
    end if;
  end if;

  for v_key, v_count in
    select key, (value)::int
    from jsonb_each_text(v_needed) as t(key, value)
  loop
    v_remaining := public.room_type_remaining_units(v_key, p_check_in, p_check_out, p_exclude_id);
    if v_remaining < v_count then
      return false;
    end if;
  end loop;

  return true;
end;
$$;
