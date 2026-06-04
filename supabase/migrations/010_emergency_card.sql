-- ============================================================
-- Memory Companion — Public Emergency Card (QR)
-- ============================================================
-- Extends patient_medical_info with a public, revocable token
-- and per-field visibility flags.
--
-- Security model:
--   • public_token is a random UUID; brute-forcing 2^122 is infeasible.
--   • is_public must be TRUE for the token to resolve.
--   • The public page is served via the service-role key (server-side only)
--     and returns ONLY the fields where the corresponding show_* flag is TRUE.
--   • Regenerating the token immediately invalidates the old QR.
--   • RLS on patient_medical_info is unchanged — caregiver-only writes.
-- ============================================================

ALTER TABLE patient_medical_info
  ADD COLUMN IF NOT EXISTS public_token    TEXT,
  ADD COLUMN IF NOT EXISTS is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Per-field visibility (caregiver chooses what strangers can see)
  ADD COLUMN IF NOT EXISTS show_name       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_photo      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_allergies  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_medications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_conditions  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_contacts    BOOLEAN NOT NULL DEFAULT TRUE;

-- Unique partial index so two active cards can't share a token
CREATE UNIQUE INDEX IF NOT EXISTS idx_pmi_public_token
  ON patient_medical_info (public_token)
  WHERE public_token IS NOT NULL;
