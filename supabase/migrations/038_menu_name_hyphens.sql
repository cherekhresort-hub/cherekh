-- Replace em dashes in published menu names with a hyphen

update public.restaurant_menu_items
set name = replace(name, U&'\2014', ' - '),
    updated_at = now()
where position(U&'\2014' in name) > 0;
