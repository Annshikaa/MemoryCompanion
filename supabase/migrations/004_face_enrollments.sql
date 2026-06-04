-- =============================================================
-- Memory Companion — Face enrollments table
-- =============================================================
-- Stores 128-d face embeddings (dlib/face_recognition format).
-- Written ONLY by the Python face service (service role key,
-- bypasses RLS). Read by caregivers to show enrollment counts.
-- =============================================================

CREATE TABLE face_enrollments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_id        UUID        NOT NULL REFERENCES people(id)  ON DELETE CASCADE,
  embedding        FLOAT8[]    NOT NULL,          -- 128-element vector
  source_photo_url TEXT,                          -- optional, for audit
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_face_enrollments_family   ON face_enrollments(family_id);
CREATE INDEX idx_face_enrollments_person   ON face_enrollments(person_id);

ALTER TABLE face_enrollments ENABLE ROW LEVEL SECURITY;

-- Caregivers can read their family's enrollment records (for showing counts)
CREATE POLICY "face_enrollments_select" ON face_enrollments
  FOR SELECT USING (family_id = get_my_family_id());

-- Caregivers can delete enrollments (e.g. to re-enroll with better photos)
CREATE POLICY "face_enrollments_delete" ON face_enrollments
  FOR DELETE USING (family_id = get_my_family_id());

-- INSERT and UPDATE are done exclusively by the Python service via the
-- service role key, which bypasses RLS — no policy needed for those.
