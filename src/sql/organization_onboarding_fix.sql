-- Organization onboarding repair
-- Apply this in Supabase SQL editor before deploying the updated frontend.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  select coalesce((auth.jwt() ->> 'email')::text, null::text);
$$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id),
  ADD COLUMN IF NOT EXISTS member_name text,
  ADD COLUMN IF NOT EXISTS company_size text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_role_check'
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_role_check
      CHECK (role IN ('owner', 'admin', 'member'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_email_unique
  ON public.organization_members (organization_id, email)
  WHERE email IS NOT NULL;

DROP POLICY IF EXISTS "admins_modify_members" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert_owner_or_admin" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update_owner_or_admin" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete_owner_or_admin" ON public.organization_members;

CREATE POLICY "org_members_insert_owner_or_admin"
ON public.organization_members
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    (
      role = 'owner'
      AND user_id = auth.uid()
      AND lower(coalesce(email, '')) = lower(coalesce(public.current_email(), ''))
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND (
          om.user_id = auth.uid()
          OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
        )
        AND om.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "org_members_update_owner_or_admin"
ON public.organization_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
      AND om.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
      AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "org_members_delete_owner_or_admin"
ON public.organization_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
      AND om.role IN ('owner', 'admin')
  )
);

-- Organization creation is intentionally defined in organization_access_code_gate.sql.
-- Do not recreate the legacy 3-argument create_organization_with_owner() here:
-- it bypasses purchased access-code redemption.
DROP FUNCTION IF EXISTS public.create_organization_with_owner(text, text, text);

COMMIT;
