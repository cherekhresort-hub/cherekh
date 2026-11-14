-- Booking officers see every booking (dates, rooms, guest counts, status) but
-- money (room rent, discount, payments, bills) and guest identity (name, phone,
-- email, ID records, emergency contact) only on bookings they created.
-- Admin and manager are unchanged. Requires 060_bookings_list_notes.sql.
-- Safe to re-run.
--
-- Every read path is covered:
--   * bookings table (and Realtime, which follows its SELECT policy): officers
--     select only their own rows;
--   * bookings_list view: rows come from a DEFINER function that blanks the
--     money and guest columns on other staff's bookings;
--   * get_staff_booking / update_booking_status_safe / get_booking_confirmation:
--     return a masked payload to officers who do not own the booking.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

create or replace function private.booking_details_visible(p_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() is distinct from 'booking_officer'
    or (
      coalesce(public.current_auth_email(), '') <> ''
      and lower(coalesce(p_payload->'bookedBy'->>'email', '')) = lower(public.current_auth_email())
    );
$$;

create or replace function private.mask_booking_payload(p_payload jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_payload is null or private.booking_details_visible(p_payload) then p_payload
    else (
      p_payload - 'payment' - 'extras'
        - 'name' - 'email' - 'phone'
        - 'guests' - 'emergencyContact' - 'guestDetails' - 'adminNotes'
    ) || jsonb_build_object(
      'payment', jsonb_build_object('amount', 0, 'status', 'pending'),
      'extras', '[]'::jsonb,
      'paymentHidden', true,
      'name', 'Hidden guest',
      'email', '',
      'phone', '',
      'guests', '[]'::jsonb,
      'guestHidden', true
    )
  end;
$$;

revoke all on function private.booking_details_visible(jsonb) from public, anon, authenticated;
revoke all on function private.mask_booking_payload(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Direct table reads: officers only their own bookings
-- ---------------------------------------------------------------------------

drop policy if exists "Staff read bookings" on public.bookings;
create policy "Staff read bookings"
  on public.bookings for select
  to authenticated
  using (
    (select public.current_user_is_admin_or_manager())
    or (
      (select public.current_user_role()) = 'booking_officer'
      and lower(coalesce(payload->'bookedBy'->>'email', '')) = lower((select public.current_auth_email()))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Bookings list: all bookings for staff, money and guest blanked where hidden
-- ---------------------------------------------------------------------------

drop view if exists public.bookings_list;
drop function if exists private.bookings_list_rows();

create function private.bookings_list_rows()
returns table (
  id text,
  status text,
  check_in date,
  check_out date,
  guest_email text,
  guest_phone text,
  created_at timestamptz,
  updated_at timestamptz,
  guest_name text,
  room_name text,
  room_type text,
  adults int,
  children int,
  total_guests int,
  rooms jsonb,
  special_requests text,
  payment_amount numeric,
  payment_status text,
  payment_discount jsonb,
  payment_net numeric,
  payment_tx_count int,
  payment_last_amount numeric,
  payment_last_type text,
  payment_last_method text,
  payment_last_at text,
  extras_total numeric,
  booked_by jsonb,
  notes_count int,
  latest_note jsonb,
  payment_hidden boolean,
  guest_hidden boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.status,
    b.check_in,
    b.check_out,
    case when v.visible then b.guest_email end,
    case when v.visible then b.guest_phone end,
    b.created_at,
    b.updated_at,
    case when v.visible then coalesce(b.payload->>'name', '') else 'Hidden guest' end,
    coalesce(b.payload->>'roomName', ''),
    coalesce(b.payload->>'roomType', ''),
    coalesce((b.payload->>'adults')::int, 0),
    coalesce((b.payload->>'children')::int, 0),
    coalesce((b.payload->>'totalGuests')::int, 0),
    coalesce(b.payload->'rooms', '[]'::jsonb),
    coalesce(b.payload->>'specialRequests', ''),
    case when v.visible then coalesce((b.payload#>>'{payment,amount}')::numeric, 0) end,
    case when v.visible then coalesce(b.payload#>>'{payment,status}', 'pending') end,
    case when v.visible then b.payload->'payment'->'discount' end,
    case when v.visible then coalesce((
      select sum(
        case
          when coalesce(t->>'type', 'payment') in ('payment', 'adjustment')
            then coalesce((t->>'amount')::numeric, 0)
          when t->>'type' = 'refund'
            then -abs(coalesce((t->>'amount')::numeric, 0))
          else 0
        end
      )
      from jsonb_array_elements(
        coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
      ) as t
    ), 0) end,
    case when v.visible then coalesce(jsonb_array_length(
      coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
    ), 0) end,
    case when v.visible then last_tx.amount end,
    case when v.visible then last_tx.type end,
    case when v.visible then last_tx.method end,
    case when v.visible then last_tx.recorded_at end,
    case when v.visible then coalesce((
      select sum(coalesce((e->>'amount')::numeric, 0))
      from jsonb_array_elements(coalesce(b.payload->'extras', '[]'::jsonb)) as e
    ), 0) end,
    b.payload->'bookedBy',
    coalesce(jsonb_array_length(
      case when jsonb_typeof(b.payload->'notes') = 'array' then b.payload->'notes' end
    ), 0),
    ln.note,
    not v.visible,
    not v.visible
  from public.bookings b
  cross join lateral (select private.booking_details_visible(b.payload) as visible) v
  left join lateral (
    select
      coalesce((t->>'amount')::numeric, 0) as amount,
      coalesce(t->>'type', 'payment') as type,
      nullif(t->>'method', '') as method,
      nullif(t->>'recordedAt', '') as recorded_at
    from jsonb_array_elements(
      coalesce(b.payload->'payment'->'transactions', '[]'::jsonb)
    ) as t
    order by coalesce(t->>'recordedAt', '') desc
    limit 1
  ) last_tx on true
  left join lateral (
    select n as note
    from jsonb_array_elements(
      case when jsonb_typeof(b.payload->'notes') = 'array' then b.payload->'notes' else '[]'::jsonb end
    ) as n
    order by coalesce(n->>'createdAt', '') desc
    limit 1
  ) ln on true
  where public.current_user_role() is not null;
$$;

revoke all on function private.bookings_list_rows() from public, anon;
grant execute on function private.bookings_list_rows() to authenticated;

create view public.bookings_list
with (security_invoker = true)
as
select * from private.bookings_list_rows();

revoke all on public.bookings_list from public, anon;
grant select on public.bookings_list to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPCs that return a payload
-- ---------------------------------------------------------------------------

create or replace function private.get_staff_booking(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select private.mask_booking_payload(b.payload)
  from public.bookings b
  where b.id = p_id
    and public.current_user_role() is not null
  limit 1;
$$;

create or replace function private.get_booking_confirmation(p_id text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select private.mask_booking_payload(b.payload)
  from public.bookings b
  where b.id = p_id
    and lower(trim(b.guest_email)) = lower(trim(p_email))
  limit 1;
$$;

create or replace function private.update_booking_status_safe(
  p_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bookings%rowtype;
  v_payload jsonb;
begin
  if public.current_user_role() is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_row from public.bookings where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_payload := jsonb_set(v_row.payload, '{status}', to_jsonb(p_status), true);

  if p_status in ('pending', 'confirmed') then
    perform public.lock_overlapping_bookings(v_row.check_in, v_row.check_out);
    if not public.booking_inventory_available(v_row.check_in, v_row.check_out, v_payload, p_id) then
      return jsonb_build_object('ok', false, 'error', 'inventory_unavailable');
    end if;
  end if;

  update public.bookings
  set
    status = p_status,
    payload = v_payload,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'payload', private.mask_booking_payload(v_payload));
end;
$$;
