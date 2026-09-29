alter table public.checkout_authorizations enable row level security;
alter table public.checkout_customer_profiles enable row level security;
alter table public.checkout_subscriptions enable row level security;
revoke all privileges on table public.checkout_authorizations, public.checkout_customer_profiles, public.checkout_subscriptions from public, anon, authenticated;
create table if not exists public.checkout_webhook_events (
 account_id text not null, livemode boolean not null, event_id text not null, event_type text not null,
 processed_at timestamptz not null default now(), primary key(account_id,livemode,event_id)
);
alter table public.checkout_webhook_events enable row level security;
revoke all on public.checkout_webhook_events from public,anon,authenticated;
create index if not exists checkout_subscriptions_customer_profile_idx on public.checkout_subscriptions(customer_profile_id);
