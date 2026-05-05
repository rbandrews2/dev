-- Work Zone OS server-side vault storage
-- Run in Supabase SQL Editor before using the production vault.
-- No RLS policies are added intentionally. Access should happen only through
-- service-role-backed edge functions such as owner-admin.

CREATE TABLE IF NOT EXISTS public.org_vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'generic',
  notes TEXT NULL,
  sealed_value TEXT NOT NULL,
  created_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email TEXT NULL,
  updated_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_org_vault_entries_org
  ON public.org_vault_entries (organization_id, updated_at DESC);

ALTER TABLE public.org_vault_entries ENABLE ROW LEVEL SECURITY;
