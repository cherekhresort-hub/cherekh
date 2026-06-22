-- Bookable units per room type (admin-editable; read by website for availability)

alter table public.room_rates
  add column if not exists total_rooms integer not null default 1 check (total_rooms >= 0);
