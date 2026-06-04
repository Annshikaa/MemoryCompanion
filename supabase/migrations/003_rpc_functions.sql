-- =============================================================
-- Memory Companion — RPC helper functions for onboarding
-- =============================================================
-- These are called client-side during the onboarding wizard.
-- Both are SECURITY DEFINER so they can write to tables on
-- behalf of a user who has no profile/family_id yet (i.e. they
-- can't satisfy the RLS policies via get_my_family_id()).
-- =============================================================


-- -------------------------------------------------------------
-- create_family_and_profile
-- Called when a user chooses "Create new family" in onboarding.
-- Creates the family row, then inserts the caller's profile.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_family_and_profile(
  p_family_name  TEXT,
  p_role         TEXT,
  p_display_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('caregiver', 'patient') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Create the family
  INSERT INTO families (name)
  VALUES (p_family_name)
  RETURNING id INTO v_family_id;

  -- Create the profile, or update it if it somehow already exists
  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (auth.uid(), v_family_id, p_role, p_display_name)
  ON CONFLICT (id) DO UPDATE
    SET family_id    = EXCLUDED.family_id,
        role         = EXCLUDED.role,
        display_name = EXCLUDED.display_name;
END;
$$;


-- -------------------------------------------------------------
-- join_family_by_code
-- Called when a user chooses "Join existing family" in onboarding.
-- Looks up the family by invite_code, then inserts the caller's
-- profile linked to that family.
-- Raises 'Family not found' if the code doesn't match — the
-- onboarding page already maps that message to a friendly error.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_family_by_code(
  p_invite_code  TEXT,
  p_role         TEXT,
  p_display_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('caregiver', 'patient') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Look up the family — case-insensitive match
  SELECT id INTO v_family_id
  FROM families
  WHERE lower(invite_code) = lower(p_invite_code);

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Family not found';
  END IF;

  -- Create the profile, or update if it already exists
  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (auth.uid(), v_family_id, p_role, p_display_name)
  ON CONFLICT (id) DO UPDATE
    SET family_id    = EXCLUDED.family_id,
        role         = EXCLUDED.role,
        display_name = EXCLUDED.display_name;
END;
$$;
