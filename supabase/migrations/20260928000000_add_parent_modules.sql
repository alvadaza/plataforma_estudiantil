alter table public.modules
add column if not exists parent_module_id uuid
references public.modules (id) on delete set null;

create index if not exists modules_parent_module_id_idx
on public.modules (parent_module_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'modules_parent_module_not_self'
      and conrelid = 'public.modules'::regclass
  ) then
    alter table public.modules
    add constraint modules_parent_module_not_self
    check (parent_module_id is null or parent_module_id <> id);
  end if;
end;
$$;
