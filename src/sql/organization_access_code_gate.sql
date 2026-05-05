-- Organization access-code gate.
-- Apply after src/sql/commerce_activation_tables.sql and src/sql/organization_onboarding_fix.sql.
-- Requires one purchased activation code per organization.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS redeemed_organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS activation_code_id uuid NULL REFERENCES public.activation_codes(id) ON DELETE RESTRICT;

-- Organization creation must go through create_organization_with_owner(), which
-- validates and atomically redeems a purchased access code.
DROP POLICY IF EXISTS "org_insert_any_authenticated" ON public.organizations;

CREATE UNIQUE INDEX IF NOT EXISTS activation_codes_redeemed_organization_unique
  ON public.activation_codes (redeemed_organization_id)
  WHERE redeemed_organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_activation_code_unique
  ON public.organizations (activation_code_id)
  WHERE activation_code_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_activation_code(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(coalesce(input, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

DROP FUNCTION IF EXISTS public.create_organization_with_owner(text, text, text);

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name text,
  org_industry text DEFAULT NULL,
  org_company_size text DEFAULT NULL,
  org_activation_code text DEFAULT NULL
)
RETURNS TABLE (organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_email text;
  v_code_id uuid;
  v_code_hash text;
  v_clean_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF org_name IS NULL OR length(trim(org_name)) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;

  v_clean_code := public.normalize_activation_code(org_activation_code);
  IF length(v_clean_code) <> 15 THEN
    RAISE EXCEPTION 'A valid 15-character access code is required';
  END IF;

  v_code_hash := encode(extensions.digest(convert_to(v_clean_code, 'UTF8'), 'sha256'::text), 'hex');

  SELECT id
  INTO v_code_id
  FROM public.activation_codes
  WHERE code_hash = v_code_hash
    AND status = 'new'
    AND redeemed_organization_id IS NULL
    AND redeemed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Access code is invalid, expired, or already used';
  END IF;

  v_email := lower(coalesce(public.current_email(), ''));

  INSERT INTO public.organizations (name, industry, created_by, activation_code_id)
  VALUES (trim(org_name), nullif(trim(org_industry), ''), auth.uid(), v_code_id)
  RETURNING id INTO v_org_id;

  UPDATE public.activation_codes
  SET
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_organization_id = v_org_id,
    redeemed_by_user_id = auth.uid()
  WHERE id = v_code_id;

  INSERT INTO public.organization_members (
    organization_id,
    email,
    role,
    user_id,
    company_size
  )
  VALUES (
    v_org_id,
    nullif(v_email, ''),
    'owner',
    auth.uid(),
    nullif(trim(org_company_size), '')
  )
  ON CONFLICT (organization_id, email)
  DO UPDATE SET
    role = EXCLUDED.role,
    user_id = EXCLUDED.user_id,
    company_size = COALESCE(EXCLUDED.company_size, organization_members.company_size);

  RETURN QUERY SELECT v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text, text) TO authenticated;

COMMIT;
