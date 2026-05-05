-- Repair organization membership visibility under RLS.
-- Run in Supabase SQL Editor after confirming the membership row exists.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND (
        om.user_id = auth.uid()
        OR lower(coalesce(om.email, '')) = lower(coalesce(public.current_email(), ''))
      )
      AND om.role IN ('owner','admin')
  );
$$;

DROP POLICY IF EXISTS "org_read_members" ON public.organization_members;
CREATE POLICY "org_read_members"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR lower(coalesce(email, '')) = lower(coalesce(public.current_email(), ''))
  OR public.is_org_member(organization_id)
);

COMMIT;
