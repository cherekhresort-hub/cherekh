-- Original (list) price per room for promo display; price column remains the discounted nightly rate.

alter table public.room_rates
  add column if not exists list_price integer check (list_price >= 0);

-- Backfill from the previous site-wide 30% promo display formula.
update public.room_rates
set list_price = round(price / 0.7)
where list_price is null and price > 0;

update public.room_rates
set list_price = price
where list_price is null;
