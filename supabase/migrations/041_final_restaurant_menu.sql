-- Finalised dining menu (names, portions, prices). Run after 036/038.
-- Replaces published rows so /dining matches the catalog without a re-publish.

create table if not exists public.restaurant_menu_items (
  id text primary key,
  category_id text not null,
  category_title text not null,
  category_sort int not null default 0,
  name text not null,
  portion text not null default '1:1',
  price numeric not null check (price >= 0),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.restaurant_menu_items (
  id, category_id, category_title, category_sort, name, portion, price, sort_order
)
values
  ('rice', 'rice-dal', 'Rice & Dal', 10, 'Rice', '1:1', 60, 10),
  ('dal', 'rice-dal', 'Rice & Dal', 10, 'Dal', '1:1', 80, 20),
  ('alu-vorta', 'rice-dal', 'Rice & Dal', 10, 'Alu Vorta', '1:2', 60, 30),
  ('begun-vorta', 'rice-dal', 'Rice & Dal', 10, 'Begun Vorta', '1:2', 100, 40),
  ('tomato-vorta', 'rice-dal', 'Rice & Dal', 10, 'Tomato Vorta', '1:2', 100, 50),
  ('mixed-salad', 'rice-dal', 'Rice & Dal', 10, 'Mixed Salad (Local Style)', '1:2', 80, 60),
  ('fish-fry', 'fish', 'Fish Delicacies', 20, 'Fish Fry (Telapia/Rui)', '1:1', 180, 10),
  ('fish-lakso', 'fish', 'Fish Delicacies', 20, 'Fish Lakso', '1:2', 220, 20),
  ('fish-curry', 'fish', 'Fish Delicacies', 20, 'Fish Curry (Local Style)', '1:1', 250, 30),
  ('bamboo-fish', 'fish', 'Fish Delicacies', 20, 'Bamboo Fish', '1:2', 700, 40),
  ('fish-pahari', 'fish', 'Fish Delicacies', 20, 'Fish (Pahari Style)', '1:1', 320, 50),
  ('egg-lakso', 'eggs', 'Eggs', 30, 'Egg Lakso', '1:2', 80, 10),
  ('egg-curry', 'eggs', 'Eggs', 30, 'Egg Curry', '1:2', 100, 20),
  ('chicken-lakso-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Lakso - Farm', '1:2', 180, 10),
  ('chicken-lakso-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Lakso - Local (Pahari)', '1:2', 280, 20),
  ('chicken-bhuna-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Bhuna - Farm', '1:1', 220, 30),
  ('chicken-bhuna-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Bhuna - Local (Pahari)', '1:1', 340, 40),
  ('chicken-pahari-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Pahari Style - Farm', '1:1', 220, 50),
  ('chicken-pahari-local', 'chicken-meat', 'Chicken & Meat', 40, 'Chicken Pahari Style - Local (Pahari)', '1:1', 340, 60),
  ('bamboo-chicken-farm', 'chicken-meat', 'Chicken & Meat', 40, 'Bamboo Chicken - Farm', '1:4', 1200, 70),
  ('bamboo-chicken-local', 'chicken-meat', 'Chicken & Meat', 40, 'Bamboo Chicken - Local (Pahari)', '1:4', 1800, 80),
  ('pajon', 'traditional', 'Traditional & Local Specials', 50, 'Pajon (Vegetable Mix)', '1:1', 150, 10),
  ('tohza', 'traditional', 'Traditional & Local Specials', 50, 'Tohza', '1:1', 100, 20),
  ('borboti-lakso', 'traditional', 'Traditional & Local Specials', 50, 'Borboti Lakso', '1:2', 150, 30),
  ('milk-tea', 'beverages', 'Beverages', 60, 'Milk Tea', '1:1', 60, 10),
  ('rong-tea', 'beverages', 'Beverages', 60, 'Rong Tea', '1:1', 40, 20),
  ('coffee-small', 'beverages', 'Beverages', 60, 'Coffee (Small)', '1:1', 120, 30),
  ('coffee-large', 'beverages', 'Beverages', 60, 'Coffee (Large)', '1:1', 220, 40),
  ('chicken-momo', 'momo', 'Momo', 70, 'Chicken Momo (3 Pieces)', '1:1', 130, 10),
  ('dragon-momo', 'momo', 'Momo', 70, 'Dragon Momo (3 Pieces)', '1:1', 160, 20),
  ('vorta-platter', 'platter', 'Platter', 80, 'Vorta Platter (Alu Vorta + Begun Vorta + Egg Lakso + Tomato Vorta + Chicken Lakso + Borboti Lakso + Fish Lakso) (Any six items will be available)', '1:1', 499, 10),
  ('pahari-platter-local', 'platter', 'Platter', 80, 'Pahari Platter (Tohza + Chicken Lakso + Egg Lakso + Borboti Lakso + Pahari Murgi + Pahari Style Fish)', '1:1', 999, 20),
  ('pahari-platter-farm', 'platter', 'Platter', 80, 'Pahari Platter (Tohza + Farm Chicken Lakso + Egg Lakso + Borboti Lakso + Farm Murgi + Pahari Style Fish)', '1:1', 799, 30),
  ('regular-platter', 'platter', 'Platter', 80, 'Regular Platter (Rice + Dal + Alu Vorta + Farm Chicken Vuna)', '1:1', 299, 40)
on conflict (id) do update
set
  category_id = excluded.category_id,
  category_title = excluded.category_title,
  category_sort = excluded.category_sort,
  name = excluded.name,
  portion = excluded.portion,
  price = excluded.price,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.restaurant_menu_items
where id not in (
  'rice', 'dal', 'alu-vorta', 'begun-vorta', 'tomato-vorta', 'mixed-salad',
  'fish-fry', 'fish-lakso', 'fish-curry', 'bamboo-fish', 'fish-pahari',
  'egg-lakso', 'egg-curry',
  'chicken-lakso-farm', 'chicken-lakso-local', 'chicken-bhuna-farm', 'chicken-bhuna-local',
  'chicken-pahari-farm', 'chicken-pahari-local', 'bamboo-chicken-farm', 'bamboo-chicken-local',
  'pajon', 'tohza', 'borboti-lakso',
  'milk-tea', 'rong-tea', 'coffee-small', 'coffee-large',
  'chicken-momo', 'dragon-momo',
  'vorta-platter', 'pahari-platter-local', 'pahari-platter-farm', 'regular-platter'
);
