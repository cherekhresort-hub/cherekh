-- Finance documents: private Storage bucket + attachment metadata.
-- Run after 046_finance_investments.sql
--
-- Object paths: <owner_type>/<owner_id>/<timestamp>-<file name>
--   expense/..., asset/...                      admin + manager
--   investment/..., investor/..., allocation/... admin only
-- Files are served through short-lived signed URLs; the bucket is not public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-docs',
  'finance-docs',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword', 'application/vnd.ms-excel', 'text/csv'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Finance docs read" on storage.objects;
create policy "Finance docs read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'finance-docs'
    and (
      (select public.current_user_role()) = 'admin'
      or (
        (select public.current_user_role()) = 'manager'
        and (storage.foldername(name))[1] in ('expense', 'asset')
      )
    )
  );

drop policy if exists "Finance docs upload" on storage.objects;
create policy "Finance docs upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'finance-docs'
    and (
      (select public.current_user_role()) = 'admin'
      or (
        (select public.current_user_role()) = 'manager'
        and (storage.foldername(name))[1] in ('expense', 'asset')
      )
    )
  );

-- No update/delete policies: uploaded evidence is immutable.

create table if not exists public.fin_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null
    check (owner_type in ('expense', 'asset', 'investment', 'investor', 'allocation')),
  owner_id uuid not null,
  doc_type text not null default 'other' check (doc_type in (
    'invoice', 'receipt', 'purchase_order', 'warranty', 'contract',
    'agreement', 'payment_confirmation', 'repayment_schedule', 'approval', 'other'
  )),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by text,
  created_at timestamptz not null default now(),
  constraint fin_attachments_path_matches_owner
    check (storage_path like owner_type || '/' || owner_id::text || '/%')
);

create index if not exists fin_attachments_owner_idx on public.fin_attachments (owner_type, owner_id);

drop trigger if exists fin_attachments_audit on public.fin_attachments;
create trigger fin_attachments_audit
  after insert or update or delete on public.fin_attachments
  for each row execute function private.fin_audit_trigger();

alter table public.fin_attachments enable row level security;

drop policy if exists "Finance attachments read" on public.fin_attachments;
create policy "Finance attachments read"
  on public.fin_attachments for select to authenticated
  using (
    (select public.current_user_role()) = 'admin'
    or ((select public.current_user_role()) = 'manager' and owner_type in ('expense', 'asset'))
  );

drop policy if exists "Finance attachments insert" on public.fin_attachments;
create policy "Finance attachments insert"
  on public.fin_attachments for insert to authenticated
  with check (
    (select public.current_user_role()) = 'admin'
    or ((select public.current_user_role()) = 'manager' and owner_type in ('expense', 'asset'))
  );

revoke all on public.fin_attachments from anon, authenticated;
grant select, insert on public.fin_attachments to authenticated;
