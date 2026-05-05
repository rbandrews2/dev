create extension if not exists pgcrypto;

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text null,
  company text null,
  phone text null,
  placement text null,
  source text not null default 'workzoneos_org',
  visitor_session_id text null,
  consent boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'workzoneos_org',
  page_url text null,
  page_path text null,
  referrer text null,
  screen text null,
  viewport text null,
  language text null,
  timezone text null,
  user_agent text null,
  visitor_session_id text null,
  ip_hash text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.marketing_leads
  add column if not exists visitor_session_id text null;

alter table public.site_page_views
  add column if not exists viewport text null,
  add column if not exists visitor_session_id text null,
  add column if not exists ip_hash text null;

create table if not exists public.purchase_deliveries (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text null unique,
  delivery_token_hash text not null unique,
  stripe_payment_intent_id text null,
  stripe_customer_id text null,
  customer_email text null,
  company text null,
  phone text null,
  product_sku text not null default 'WZOS_CORE',
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  fulfilled_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_leads_created_at
  on public.marketing_leads (created_at desc);

create index if not exists idx_site_page_views_created_at
  on public.site_page_views (created_at desc);

create index if not exists idx_site_page_views_path_created_at
  on public.site_page_views (page_path, created_at desc);

create index if not exists idx_site_page_views_session
  on public.site_page_views (visitor_session_id);

create index if not exists idx_purchase_deliveries_created_at
  on public.purchase_deliveries (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_marketing_leads_updated_at on public.marketing_leads;
create trigger trg_marketing_leads_updated_at
before update on public.marketing_leads
for each row execute function public.set_updated_at();

alter table public.marketing_leads enable row level security;
alter table public.site_page_views enable row level security;
alter table public.purchase_deliveries enable row level security;

drop policy if exists "service_role_marketing_leads_all" on public.marketing_leads;
create policy "service_role_marketing_leads_all"
on public.marketing_leads
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_site_page_views_all" on public.site_page_views;
create policy "service_role_site_page_views_all"
on public.site_page_views
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_purchase_deliveries_all" on public.purchase_deliveries;
create policy "service_role_purchase_deliveries_all"
on public.purchase_deliveries
for all
to service_role
using (true)
with check (true);
