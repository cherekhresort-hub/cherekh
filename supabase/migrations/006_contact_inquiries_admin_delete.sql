-- Allow only admins to delete contact inquiries
-- Run after 005_contact_inquiries.sql

drop policy if exists "Admins delete contact inquiries" on public.contact_inquiries;
create policy "Admins delete contact inquiries"
  on public.contact_inquiries for delete
  to authenticated
  using (public.current_user_is_admin());

grant delete on public.contact_inquiries to authenticated;
