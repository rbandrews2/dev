create extension if not exists pgcrypto;

create table if not exists checkout_authorizations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) <= 160),
  customer_phone text check (customer_phone is null or char_length(customer_phone) <= 30),
  amount_cents integer not null check (amount_cents between 50 and 5000000),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  total_cents integer not null check (total_cents = amount_cents + service_fee_cents),
  currency char(3) not null default 'usd',
  withdrawal_date date not null,
  description text not null check (char_length(description) between 2 and 180),
  signature_accepted boolean not null check (signature_accepted is true),
  authorization_version text not null,
  business_snapshot jsonb not null,
  ip_address text,
  user_agent text,
  status text not null default 'authorized' check (status in ('authorized', 'paid', 'failed', 'canceled')),
  payment_intent_id text unique,
  amount_received_cents integer check (amount_received_cents is null or amount_received_cents >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkout_authorizations_customer_email_idx
  on checkout_authorizations (lower(customer_email));

create index if not exists checkout_authorizations_created_at_idx
  on checkout_authorizations (created_at desc);

create index if not exists checkout_authorizations_status_idx
  on checkout_authorizations (status);
