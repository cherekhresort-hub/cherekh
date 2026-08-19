-- Restaurant menu table + portions (safe to run even if 034 was skipped)

create table if not exists public.restaurant_menu_items (
  id text primary key,
  category_id text not null,
  category_title text not null,
  category_sort int not null default 0,
  name text not null,
  portion text not null default '',
  price numeric not null check (price >= 0),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.restaurant_menu_items
  add column if not exists portion text not null default '';

create index if not exists restaurant_menu_items_category_idx
  on public.restaurant_menu_items (category_sort, sort_order, name);

alter table public.restaurant_menu_items enable row level security;

drop policy if exists "Public read restaurant menu" on public.restaurant_menu_items;
create policy "Public read restaurant menu"
  on public.restaurant_menu_items for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff write restaurant menu" on public.restaurant_menu_items;
create policy "Staff write restaurant menu"
  on public.restaurant_menu_items for insert
  to authenticated
  with check ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff update restaurant menu" on public.restaurant_menu_items;
create policy "Staff update restaurant menu"
  on public.restaurant_menu_items for update
  to authenticated
  using ((select public.current_user_is_admin_or_manager()))
  with check ((select public.current_user_is_admin_or_manager()));

drop policy if exists "Staff delete restaurant menu" on public.restaurant_menu_items;
create policy "Staff delete restaurant menu"
  on public.restaurant_menu_items for delete
  to authenticated
  using ((select public.current_user_is_admin_or_manager()));

grant select on public.restaurant_menu_items to anon, authenticated;
grant insert, update, delete on public.restaurant_menu_items to authenticated;

insert into public.restaurant_menu_items (
  id, category_id, category_title, category_sort, name, portion, price, sort_order
)
values
  ('rice', 'rice-dal', 'Rice & Dal', 10, 'Rice', '1:1', 60, 10),
  ('dal', 'rice-dal', 'Rice & Dal', 10, 'Dal', '1:1', 80, 20),
  ('alu-vorta', 'rice-dal', 'Rice & Dal', 10, 'Alu Vorta', '1:1', 60, 30),
  ('begun-vorta', 'rice-dal', 'Rice & Dal', 10, 'Begun Vorta', '1:1', 80, 40),
  ('tomato-vorta', 'rice-dal', 'Rice & Dal', 10, 'Tomato Vorta', '1:1', 80, 50),
  ('mixed-salad', 'rice-dal', 'Rice & Dal', 10, 'Mixed Salad (Local Style)', '1:1', 70, 60),
  ('fish-fry', 'fish', 'Fish Delicacies', 20, 'Fish Fry (Telapia/Rui)', '1:1', 200, 10),
  ('fish-curry', 'fish', 'Fish Delicacies', 20, 'Fish Curry (Local Style)', '1:1', 250, 20),
  ('bamboo-fish', 'fish', 'Fish Delicacies', 20, 'Bamboo Fish', '1:2', 500, 30),
  ('fish-pahari', 'fish', 'Fish Delicacies', 20, 'Fish (Pahari Style)', '1:1', 300, 40),
  ('egg-lakso', 'eggs', 'Eggs', 30, 'Egg Lakso', '1:1', 100, 10),
  ('egg-curry', 'eggs', 'Eggs', 30, 'Egg Curry', '1:1', 100, 20),
  ('chicken-lakso-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Lakso - Farm', '1:1', 180, 10),
  ('chicken-lakso-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Lakso - Local (Pahari)', '1:1', 250, 20),
  ('chicken-bhuna-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Bhuna - Farm', '1:1', 220, 30),
  ('chicken-bhuna-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Bhuna - Local (Pahari)', '1:1', 330, 40),
  ('chicken-pahari-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Pahari Style - Farm', '1:1', 250, 50),
  ('chicken-pahari-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Pahari Style - Local (Pahari)', '1:1', 350, 60),
  ('bamboo-chicken-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Bamboo Chicken - Farm', '1:2', 1000, 70),
  ('bamboo-chicken-local', 'chicken-meat', 'Chicken & Meat', 40, 'Bamboo Chicken - Local (Pahari)', '1:2', 1600, 80),
  ('pajon', 'traditional', 'Traditional & Local Specials', 50, 'Pajon (Vegetable Mix)', '1:1', 120, 10),
  ('tohza', 'beverages', 'Beverages', 60, 'Tohza', '1:1', 100, 10),
  ('milk-tea', 'beverages', 'Beverages', 60, 'Milk Tea', '1:1', 60, 20),
  ('rong-tea', 'beverages', 'Beverages', 60, 'Rong Tea', '1:1', 40, 30),
  ('coffee', 'beverages', 'Beverages', 60, 'Coffee', '1:1', 120, 40)
on conflict (id) do update
set
  portion = excluded.portion,
  name = excluded.name,
  price = excluded.price,
  category_id = excluded.category_id,
  category_title = excluded.category_title,
  category_sort = excluded.category_sort,
  sort_order = excluded.sort_order,
  updated_at = now();
