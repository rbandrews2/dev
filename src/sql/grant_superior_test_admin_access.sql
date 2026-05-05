-- Grant full testing access for the existing Superior admin account.
-- Run in the Supabase SQL Editor with a service-role/admin connection.
--
-- What this does:
-- - finds the existing auth user by email
-- - creates a dedicated 15-character access code for auditability
-- - creates a Superior testing organization if the user has no org yet
-- - redeems the code to that organization
-- - grants the user owner role, which unlocks all owner/admin app permissions

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_email text := 'r.andrews@superiorllc.org';
  v_access_code text := 'SUPERIORTEST001';
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
    RAISE EXCEPTION 'Auth user % does not exist. Create/sign up the account first, then rerun this script.', v_email;
  END IF;

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
    'manual-superior-test-admin',
    'WZOS_CORE',
    now(),
    NULL
  )
  ON CONFLICT (code_hash) DO UPDATE
  SET
    customer_email = EXCLUDED.customer_email,
    product_sku = EXCLUDED.product_sku,
    expires_at = NULL
  RETURNING id INTO v_code_id;

  -- Prefer an existing org for this user. If none exists, create a dedicated test org.
  SELECT organization_id
  INTO v_org_id
  FROM public.organization_members
  WHERE user_id = v_user_id
     OR lower(coalesce(email, '')) = lower(v_email)
  ORDER BY
    CASE WHEN role = 'owner' THEN 0 WHEN role = 'admin' THEN 1 ELSE 2 END,
    organization_id
  LIMIT 1;

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
  ELSE
    UPDATE public.organizations
    SET
      created_by = coalesce(created_by, v_user_id),
      activation_code_id = coalesce(activation_code_id, v_code_id)
    WHERE id = v_org_id;
  END IF;

  UPDATE public.activation_codes
  SET
    status = 'redeemed',
    redeemed_at = coalesce(redeemed_at, now()),
    redeemed_organization_id = coalesce(redeemed_organization_id, v_org_id),
    redeemed_by_user_id = coalesce(redeemed_by_user_id, v_user_id)
  WHERE id = v_code_id;

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
    member_name = coalesce(organization_members.member_name, EXCLUDED.member_name),
    company_size = coalesce(organization_members.company_size, EXCLUDED.company_size);

  -- If this tester was already attached to other organizations, promote those rows too.
  UPDATE public.organization_members
  SET
    role = 'owner',
    user_id = v_user_id,
    email = lower(v_email)
  WHERE user_id = v_user_id
     OR lower(coalesce(email, '')) = lower(v_email);

  RAISE NOTICE 'Granted owner testing access to % in organization %. Access code: %', v_email, v_org_id, v_access_code;
END $$;

COMMIT;
