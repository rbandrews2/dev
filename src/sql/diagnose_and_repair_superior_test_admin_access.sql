-- Diagnose and repair org-owner access for r.andrews@superiorllc.org.
-- Run in Supabase SQL Editor. This does not require the user password.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_email text := 'r.andrews@superiorllc.org';
  v_access_code text := 'SUPERIORTEST002';
  v_user_id uuid;
  v_org_id uuid;
  v_code_id uuid;
  v_code_hash text;
BEGIN
  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user found for %. Confirm you are in the same Supabase project used by the app.', v_email;
  END IF;

  RAISE NOTICE 'Auth user found: %', v_user_id;

  SELECT om.organization_id
  INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = v_user_id
     OR lower(coalesce(om.email, '')) = lower(v_email)
  ORDER BY
    CASE WHEN om.role = 'owner' THEN 0 WHEN om.role = 'admin' THEN 1 ELSE 2 END,
    om.created_at DESC NULLS LAST
  LIMIT 1;

  v_code_hash := encode(extensions.digest(convert_to(public.normalize_activation_code(v_access_code), 'UTF8'), 'sha256'::text), 'hex');

  INSERT INTO public.activation_codes (
    code_hash,
    status,
    customer_email,
    order_id,
    product_sku,
    issued_at,
    expires_at
  )
  VALUES (
    v_code_hash,
    'new',
    lower(v_email),
    'manual-superior-test-admin-002',
    'WZOS_CORE',
    now(),
    NULL
  )
  ON CONFLICT (code_hash) DO UPDATE
  SET
    status = CASE
      WHEN public.activation_codes.redeemed_at IS NULL
       AND public.activation_codes.redeemed_organization_id IS NULL
      THEN 'new'
      ELSE public.activation_codes.status
    END,
    customer_email = EXCLUDED.customer_email,
    product_sku = EXCLUDED.product_sku,
    expires_at = NULL
  RETURNING id INTO v_code_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      industry,
      created_by,
      activation_code_id
    )
    VALUES (
      'Superior Consultation Testing',
      'Roadway Operations',
      v_user_id,
      v_code_id
    )
    RETURNING id INTO v_org_id;

    UPDATE public.activation_codes
    SET
      status = 'redeemed',
      redeemed_at = now(),
      redeemed_organization_id = v_org_id,
      redeemed_by_user_id = v_user_id
    WHERE id = v_code_id;
  ELSE
    UPDATE public.organizations
    SET created_by = coalesce(created_by, v_user_id)
    WHERE id = v_org_id;
  END IF;

  -- Ensure the membership matches every lookup style the frontend/RLS uses:
  -- user_id, lowercase email, and owner role.
  INSERT INTO public.organization_members (
    organization_id,
    email,
    role,
    user_id,
    member_name,
    company_size
  )
  VALUES (
    v_org_id,
    lower(v_email),
    'owner',
    v_user_id,
    'R. Andrews',
    NULL
  )
  ON CONFLICT (organization_id, email)
  DO UPDATE SET
    role = 'owner',
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    member_name = coalesce(public.organization_members.member_name, EXCLUDED.member_name);

  UPDATE public.organization_members
  SET
    role = 'owner',
    user_id = v_user_id,
    email = lower(v_email)
  WHERE organization_id = v_org_id
    AND (user_id = v_user_id OR lower(coalesce(email, '')) = lower(v_email));

  RAISE NOTICE 'Repaired owner access for % in org %. Fresh fallback access code if still forced through onboarding: %', v_email, v_org_id, v_access_code;
END $$;

-- Readback. You should see at least one owner row for this email/user.
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  om.organization_id,
  o.name AS organization_name,
  om.email AS member_email,
  om.user_id AS member_user_id,
  om.role AS member_role
FROM auth.users u
LEFT JOIN public.organization_members om
  ON om.user_id = u.id
  OR lower(coalesce(om.email, '')) = lower(u.email)
LEFT JOIN public.organizations o
  ON o.id = om.organization_id
WHERE lower(u.email) = lower('r.andrews@superiorllc.org');

COMMIT;
