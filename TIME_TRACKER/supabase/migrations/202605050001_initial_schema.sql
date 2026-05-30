-- Work Zone OS / Road Crew Time Clock isolated Supabase schema.
-- All app tables use the `_2` suffix so they stay separate from older tables.
-- Run this in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles_2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies_2 (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'worker' check (role in ('owner', 'admin', 'worker')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.job_sites_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  client text,
  address text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_types_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  code text not null,
  label text not null,
  color text not null default 'slate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.time_entries_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_site_id uuid not null references public.job_sites_2(id),
  work_type_id uuid not null references public.work_types_2(id),
  clock_in timestamptz not null,
  clock_out timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  break_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (clock_out is null or clock_out >= clock_in)
);

create table public.gps_markers_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies_2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_entry_id uuid references public.time_entries_2(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision,
  event text not null check (event in ('clock_in', 'clock_out', 'break_start', 'break_end')),
  created_at timestamptz not null default now()
);

create index memberships_2_user_id_idx on public.memberships_2(user_id);
create index memberships_2_company_id_idx on public.memberships_2(company_id);
create index job_sites_2_company_id_idx on public.job_sites_2(company_id);
create index work_types_2_company_id_idx on public.work_types_2(company_id);
create index time_entries_2_company_user_clock_idx on public.time_entries_2(company_id, user_id, clock_in desc);
create unique index time_entries_2_one_open_entry_per_company_user_idx
on public.time_entries_2(company_id, user_id)
where clock_out is null;
create index gps_markers_2_time_entry_id_idx on public.gps_markers_2(time_entry_id);

create trigger profiles_2_set_updated_at
before update on public.profiles_2
for each row execute function public.set_updated_at();

create trigger companies_2_set_updated_at
before update on public.companies_2
for each row execute function public.set_updated_at();

create trigger job_sites_2_set_updated_at
before update on public.job_sites_2
for each row execute function public.set_updated_at();

create trigger work_types_2_set_updated_at
before update on public.work_types_2
for each row execute function public.set_updated_at();

create trigger time_entries_2_set_updated_at
before update on public.time_entries_2
for each row execute function public.set_updated_at();

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

create trigger time_entries_2_validate_company_refs
before insert or update on public.time_entries_2
for each row execute function public.validate_time_entry_company_refs();

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

create trigger gps_markers_2_validate_company_refs
before insert or update on public.gps_markers_2
for each row execute function public.validate_gps_marker_company_refs();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_2 (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.seed_default_work_types(target_company_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.work_types_2 (company_id, code, label, color)
  values
    (target_company_id, 'job_site', 'Job Site', 'orange'),
    (target_company_id, 'setup', 'Setup', 'blue'),
    (target_company_id, 'teardown', 'Teardown', 'purple'),
    (target_company_id, 'travel', 'Travel Time', 'green'),
    (target_company_id, 'other', 'Other', 'slate')
  on conflict (company_id, code) do nothing;
$$;

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.memberships_2 (company_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (company_id, user_id) do nothing;
  end if;

  perform public.seed_default_work_types(new.id);
  return new;
end;
$$;

create trigger on_company_created
after insert on public.companies_2
for each row execute function public.handle_new_company();

create or replace function public.company_role(target_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships_2 m
  where m.company_id = target_company_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships_2 m
    where m.company_id = target_company_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.company_role(target_company_id) in ('owner', 'admin'), false);
$$;

alter table public.profiles_2 enable row level security;
alter table public.companies_2 enable row level security;
alter table public.memberships_2 enable row level security;
alter table public.job_sites_2 enable row level security;
alter table public.work_types_2 enable row level security;
alter table public.time_entries_2 enable row level security;
alter table public.gps_markers_2 enable row level security;

create policy "Users can read their own profile"
on public.profiles_2 for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own profile"
on public.profiles_2 for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Members can read their companies"
on public.companies_2 for select
to authenticated
using (public.is_company_member(id));

create policy "Authenticated users can create companies"
on public.companies_2 for insert
to authenticated
with check (created_by = auth.uid());

create policy "Company admins can update companies"
on public.companies_2 for update
to authenticated
using (public.is_company_admin(id))
with check (public.is_company_admin(id));

create policy "Users can read visible memberships"
on public.memberships_2 for select
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id));

create policy "Company admins can add memberships"
on public.memberships_2 for insert
to authenticated
with check (public.is_company_admin(company_id));

create policy "Company owners and admins can update memberships"
on public.memberships_2 for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

create policy "Company owners and admins can delete memberships"
on public.memberships_2 for delete
to authenticated
using (public.is_company_admin(company_id));

create policy "Members can read job sites"
on public.job_sites_2 for select
to authenticated
using (public.is_company_member(company_id));

create policy "Admins can create job sites"
on public.job_sites_2 for insert
to authenticated
with check (public.is_company_admin(company_id));

create policy "Admins can update job sites"
on public.job_sites_2 for update
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

create policy "Admins can delete job sites"
on public.job_sites_2 for delete
to authenticated
using (public.is_company_admin(company_id));

create policy "Members can read work types"
on public.work_types_2 for select
to authenticated
using (public.is_company_member(company_id));

create policy "Admins can manage work types"
on public.work_types_2 for all
to authenticated
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

create policy "Workers can read their own time entries"
on public.time_entries_2 for select
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id));

create policy "Workers can clock in for themselves"
on public.time_entries_2 for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_company_member(company_id)
);

create policy "Workers can update their own open entries"
on public.time_entries_2 for update
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id))
with check (
  (user_id = auth.uid() and public.is_company_member(company_id))
  or public.is_company_admin(company_id)
);

create policy "Admins can delete time entries"
on public.time_entries_2 for delete
to authenticated
using (public.is_company_admin(company_id));

create policy "Workers can read their own gps markers"
on public.gps_markers_2 for select
to authenticated
using (user_id = auth.uid() or public.is_company_admin(company_id));

create policy "Workers can create their own gps markers"
on public.gps_markers_2 for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_company_member(company_id)
);

create policy "Admins can delete gps markers"
on public.gps_markers_2 for delete
to authenticated
using (public.is_company_admin(company_id));

notify pgrst, 'reload schema';
