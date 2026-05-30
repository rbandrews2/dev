-- Adds task/pay-area segments inside a single clocked shift.
-- A worker can stay clocked into one job site while switching between travel time,
-- job site time, setup, teardown, or other company-defined work types.

create table if not exists public.time_entry_segments_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_entry_id uuid not null references public.time_entries_2(id) on delete cascade,
  job_site_id uuid not null references public.job_sites_2(id),
  work_type_id uuid not null references public.work_types_2(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists time_entry_segments_2_entry_idx
on public.time_entry_segments_2(time_entry_id, started_at);

create index if not exists time_entry_segments_2_company_user_idx
on public.time_entry_segments_2(company_id, user_id, started_at desc);

create unique index if not exists time_entry_segments_2_one_open_segment_per_entry_idx
on public.time_entry_segments_2(time_entry_id)
where ended_at is null;

drop trigger if exists time_entry_segments_2_set_updated_at on public.time_entry_segments_2;
create trigger time_entry_segments_2_set_updated_at
before update on public.time_entry_segments_2
for each row execute function public.set_updated_at();

create or replace function public.validate_time_entry_segment_refs()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and (
    new.company_id <> old.company_id
    or new.user_id <> old.user_id
    or new.time_entry_id <> old.time_entry_id
  ) then
    raise exception 'Company, worker, and time entry cannot be changed on a time segment.';
  end if;

  if not exists (
    select 1 from public.time_entries_2
    where id = new.time_entry_id
      and company_id = new.company_id
      and user_id = new.user_id
      and job_site_id = new.job_site_id
  ) then
    raise exception 'Segment does not match the selected time entry.';
  end if;

  if not exists (
    select 1 from public.work_types_2
    where id = new.work_type_id
      and company_id = new.company_id
  ) then
    raise exception 'Segment work type does not belong to the selected company.';
  end if;

  return new;
end;
$$;

drop trigger if exists time_entry_segments_2_validate_refs on public.time_entry_segments_2;
create trigger time_entry_segments_2_validate_refs
before insert or update on public.time_entry_segments_2
for each row execute function public.validate_time_entry_segment_refs();

alter table public.time_entry_segments_2 enable row level security;

drop policy if exists "Workers can read their own time segments" on public.time_entry_segments_2;
create policy "Workers can read their own time segments"
on public.time_entry_segments_2 for select
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id));

drop policy if exists "Workers can create their own time segments" on public.time_entry_segments_2;
create policy "Workers can create their own time segments"
on public.time_entry_segments_2 for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_company_member(company_id)
);

drop policy if exists "Workers can update their own time segments" on public.time_entry_segments_2;
create policy "Workers can update their own time segments"
on public.time_entry_segments_2 for update
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id))
with check (
  (user_id = auth.uid() and public.is_company_member(company_id))
  or public.is_company_admin(company_id)
);

drop policy if exists "Admins can delete time segments" on public.time_entry_segments_2;
create policy "Admins can delete time segments"
on public.time_entry_segments_2 for delete
to authenticated
using (public.is_company_admin(company_id));

grant select, insert, update, delete on table public.time_entry_segments_2 to authenticated;

insert into public.work_types_2 (company_id, code, label, color)
select c.id, 'job_site', 'Job Site', 'orange'
from public.companies_2 c
where not exists (
  select 1
  from public.work_types_2 wt
  where wt.company_id = c.id
    and wt.code = 'job_site'
);

update public.work_types_2
set label = 'Travel Time'
where code = 'travel'
  and label = 'Travel';

notify pgrst, 'reload schema';
