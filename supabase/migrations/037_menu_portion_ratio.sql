-- Simplify portions to 1:1 (one person) or 1:2 (two people)

update public.restaurant_menu_items
set portion = '1:1', updated_at = now()
where portion is distinct from '1:2';

update public.restaurant_menu_items
set portion = '1:2', updated_at = now()
where id in ('bamboo-fish', 'bamboo-chicken-farm', 'bamboo-chicken-local');
