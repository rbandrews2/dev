-- Company billing entitlement for Time Tracker⚡.
-- Stripe webhooks update this table through a server-side function using the service role key.

create table if not exists public.company_billing_2 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies_2(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_product_id text not null default 'prod_USsnAqnFjc2KIa',
  status text not null default 'inactive'
    check (status in ('inactive', 'pending', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_billing_2_customer_idx
on public.company_billing_2(stripe_customer_id);

create index if not exists company_billing_2_subscription_idx
on public.company_billing_2(stripe_subscription_id);

drop trigger if exists company_billing_2_set_updated_at on public.company_billing_2;
create trigger company_billing_2_set_updated_at
before update on public.company_billing_2
for each row execute function public.set_updated_at();

alter table public.company_billing_2 enable row level security;

drop policy if exists "Company members can read billing status" on public.company_billing_2;
create policy "Company members can read billing status"
on public.company_billing_2 for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists "Company admins can initialize billing status" on public.company_billing_2;
create policy "Company admins can initialize billing status"
on public.company_billing_2 for insert
to authenticated
with check (public.is_company_admin(company_id));

grant select, insert on table public.company_billing_2 to authenticated;

notify pgrst, 'reload schema';
