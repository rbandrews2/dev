-- Multi-company safety hardening for Work Zone OS / Road Crew Time Clock.
-- Apply after 202605050001_initial_schema.sql if the initial schema is already in Supabase.

create unique index if not exists time_entries_2_one_open_entry_per_company_user_idx
on public.time_entries_2(company_id, user_id)
where clock_out is null;

create or replace function public.validate_time_entry_company_refs()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and (
    new.company_id <> old.company_id
    or new.user_id <> old.user_id
  ) then
    raise exception 'Company and worker cannot be changed on a time entry.';
  end if;

  if not exists (
    select 1 from public.memberships_2
    where company_id = new.company_id
      and user_id = new.user_id
  ) then
    raise exception 'Worker is not assigned to the selected company.';
  end if;

  if not exists (
    select 1 from public.job_sites_2
    where id = new.job_site_id
      and company_id = new.company_id
  ) then
    raise exception 'Job site does not belong to the selected company.';
  end if;

  if not exists (
    select 1 from public.work_types_2
    where id = new.work_type_id
      and company_id = new.company_id
  ) then
    raise exception 'Work type does not belong to the selected company.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_gps_marker_company_refs()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.memberships_2
    where company_id = new.company_id
      and user_id = new.user_id
  ) then
    raise exception 'Worker is not assigned to the selected company.';
  end if;

  if new.time_entry_id is not null and not exists (
    select 1 from public.time_entries_2
    where id = new.time_entry_id
      and company_id = new.company_id
      and user_id = new.user_id
  ) then
    raise exception 'GPS marker does not match the selected time entry.';
  end if;

  return new;
end;
$$;

drop policy if exists "Workers can update their own open entries" on public.time_entries_2;
create policy "Workers can update their own open entries"
on public.time_entries_2 for update
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id))
with check (
  (user_id = auth.uid() and public.is_company_member(company_id))
  or public.is_company_admin(company_id)
);

notify pgrst, 'reload schema';
