-- Publish bookings to Supabase Realtime so payments, bills and status changes
-- appear on every signed-in device without a reload. Delivery follows the
-- "Staff read bookings" RLS policy: only staff who can already select a row
-- receive its changes; anonymous visitors receive nothing.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'bookings'
     )
  then
    alter publication supabase_realtime add table public.bookings;
  end if;
end
$$;
