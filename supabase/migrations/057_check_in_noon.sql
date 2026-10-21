-- Standard check-in moves to 12:00 PM; check-out stays 11:00 AM.

alter table public.site_settings
  alter column check_in_time set default '12:00',
  alter column check_out_time set default '11:00';

update public.site_settings
set check_in_time = '12:00',
    check_out_time = '11:00',
    updated_at = now()
where id = 'default';
