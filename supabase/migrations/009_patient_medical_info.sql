-- ============================================================
-- Memory Companion — Patient Medical Info (Emergency Mode)
-- ============================================================
-- Stores caregiver-entered reference info for emergency situations.
-- ONE row per family (UNIQUE on family_id).
-- Non-clinical: just stored text fields for first-responder context.
-- ============================================================

CREATE TABLE patient_medical_info (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  allergies   TEXT,
  medications TEXT,
  conditions  TEXT,
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_medical_info_family ON patient_medical_info (family_id);

ALTER TABLE patient_medical_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmi_all" ON patient_medical_info
  FOR ALL USING  (family_id = get_my_family_id())
  WITH CHECK     (family_id = get_my_family_id());
