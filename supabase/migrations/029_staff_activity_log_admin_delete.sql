-- Allow admins to delete activity log entries (read rows cascade via staff_activity_reads FK).

drop policy if exists "Admins delete activity log" on public.staff_activity_log;
create policy "Admins delete activity log"
  on public.staff_activity_log for delete
  to authenticated
  using ((select public.current_user_is_admin()));

grant delete on public.staff_activity_log to authenticated;
