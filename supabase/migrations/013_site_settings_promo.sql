-- Public promo discount shown on room cards (display-only marketing)

alter table public.site_settings
  add column if not exists promo_discount_percent integer not null default 30
  check (promo_discount_percent >= 0 and promo_discount_percent <= 100);
