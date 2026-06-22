-- Drop legacy manager bell notifications (replaced by staff_activity_log / Activity page).
-- Safe to run after 026_staff_activity_log.sql.

drop policy if exists "Managers insert notifications" on public.admin_notifications;
drop policy if exists "Admins read notifications" on public.admin_notifications;
drop policy if exists "Admins update notifications" on public.admin_notifications;

drop table if exists public.admin_notifications;
