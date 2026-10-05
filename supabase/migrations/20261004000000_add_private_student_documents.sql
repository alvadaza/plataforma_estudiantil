alter table public.documents
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'student-documents',
  'student-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'documents_select_own'
  ) then
    create policy documents_select_own
      on public.documents for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'documents_insert_own'
  ) then
    create policy documents_insert_own
      on public.documents for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'student_documents_insert_own'
  ) then
    create policy student_documents_insert_own
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'student-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'student_documents_select_own_or_admin'
  ) then
    create policy student_documents_select_own_or_admin
      on storage.objects for select to authenticated
      using (
        bucket_id = 'student-documents'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'student_documents_delete_own'
  ) then
    create policy student_documents_delete_own
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'student-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end;
$$;

drop policy if exists documents_select_admin on public.documents;

create policy documents_select_admin
  on public.documents for select to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
