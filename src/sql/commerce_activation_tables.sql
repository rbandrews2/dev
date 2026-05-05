-- Work Zone OS commerce, activation, and customer support tables.
-- Run in Supabase SQL Editor before enabling the Stripe purchase flow.

CREATE TABLE IF NOT EXISTS public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'redeemed', 'revoked')),
  customer_email TEXT NULL,
  order_id TEXT NULL UNIQUE,
  product_sku TEXT NOT NULL DEFAULT 'WZOS_CORE',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  redeemed_at TIMESTAMPTZ NULL,
  redeemed_installation_id TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_activation_codes_customer_email
  ON public.activation_codes (customer_email, issued_at DESC);

CREATE TABLE IF NOT EXISTS public.app_installations (
  installation_id TEXT PRIMARY KEY,
  activated BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  activation_code_id UUID NULL REFERENCES public.activation_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ NULL,
  locked_at TIMESTAMPTZ NULL,
  last_attempt_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.activation_attempts (
  installation_id TEXT PRIMARY KEY REFERENCES public.app_installations(installation_id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NULL,
  phone TEXT NULL,
  company TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  message TEXT NOT NULL,
  owner_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NULL,
  action TEXT NOT NULL,
  target_type TEXT NULL,
  target_id TEXT NULL,
  detail JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id TEXT NULL UNIQUE,
  delivery_token_hash TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT NULL,
  stripe_customer_id TEXT NULL,
  customer_email TEXT NULL,
  product_sku TEXT NOT NULL DEFAULT 'WZOS_CORE',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  sealed_activation_code TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fulfilled_at TIMESTAMPTZ NULL,
  email_sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_deliveries ENABLE ROW LEVEL SECURITY;
