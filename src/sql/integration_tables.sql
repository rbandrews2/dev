-- Work Zone OS integration state tables
-- Run in Supabase SQL Editor before enabling production integrations.

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

CREATE TABLE IF NOT EXISTS public.org_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'api-key')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'pending', 'connected', 'error')),
  webhook_url TEXT NULL,
  external_account_label TEXT NULL,
  notes TEXT NULL,
  last_test_status TEXT NULL CHECK (last_test_status IN ('ok', 'failed')),
  last_test_message TEXT NULL,
  last_test_at TIMESTAMPTZ NULL,
  connected_at TIMESTAMPTZ NULL,
  disconnected_at TIMESTAMPTZ NULL,
  connected_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_by_email TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_org_integrations_org_provider
  ON public.org_integrations (organization_id, provider);

CREATE TABLE IF NOT EXISTS public.owner_drive_settings (
  owner_email TEXT PRIMARY KEY,
  drive_folder_id TEXT NULL,
  drive_folder_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_drive_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_integrations_select_members" ON public.org_integrations;
CREATE POLICY "org_integrations_select_members"
ON public.org_integrations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_integrations.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

DROP POLICY IF EXISTS "org_integrations_modify_admins" ON public.org_integrations;
CREATE POLICY "org_integrations_modify_admins"
ON public.org_integrations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_integrations.organization_id
      AND om.role IN ('owner', 'admin')
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_integrations.organization_id
      AND om.role IN ('owner', 'admin')
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);
