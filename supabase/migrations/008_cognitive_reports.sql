-- ============================================================
-- Memory Companion — Cognitive reports (Wave 2)
-- ============================================================
-- Stores AI-generated (or template-fallback) weekly summaries.
-- metrics_json stores the computed metrics snapshot so past
-- reports remain reproducible independent of current data.
-- ============================================================

CREATE TABLE cognitive_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  days         INTEGER     NOT NULL DEFAULT 7,
  metrics_json JSONB       NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT        NOT NULL,
  ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cognitive_reports_family ON cognitive_reports (family_id, created_at DESC);

ALTER TABLE cognitive_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cognitive_reports_all" ON cognitive_reports
  FOR ALL USING  (family_id = get_my_family_id())
  WITH CHECK     (family_id = get_my_family_id());
