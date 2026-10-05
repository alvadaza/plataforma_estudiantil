do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'courses_update_admin'
  ) then
    create policy courses_update_admin
      on public.courses for update to authenticated
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end;
$$;
