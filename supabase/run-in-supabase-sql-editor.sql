-- ============================================================
-- Run this entire file in the Supabase SQL Editor ONE TIME.
-- Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run (all use IF NOT EXISTS / idempotent patterns).
-- ============================================================

-- ── Migration 009: patient_medical_info ──────────────────────

CREATE TABLE IF NOT EXISTS patient_medical_info (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  allergies   TEXT,
  medications TEXT,
  conditions  TEXT,
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_medical_info_family ON patient_medical_info (family_id);
ALTER TABLE patient_medical_info ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='patient_medical_info' AND policyname='pmi_all') THEN
    CREATE POLICY "pmi_all" ON patient_medical_info
      FOR ALL USING (family_id=get_my_family_id()) WITH CHECK (family_id=get_my_family_id());
  END IF;
END $$;

-- ── Migration 010: emergency card token + visibility flags ───

ALTER TABLE patient_medical_info
  ADD COLUMN IF NOT EXISTS public_token      TEXT,
  ADD COLUMN IF NOT EXISTS is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_name         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_photo        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_allergies    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_medications  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_conditions   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_contacts     BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pmi_public_token
  ON patient_medical_info (public_token) WHERE public_token IS NOT NULL;

-- ── Migration 007: mood check-ins + cognitive activities ─────
-- REQUIRED for: mood page, Who is this game, Guess the Memory game

CREATE TABLE IF NOT EXISTS mood_checkins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  mood       TEXT        NOT NULL CHECK (mood IN ('happy','okay','sad','anxious')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_family ON mood_checkins (family_id, created_at DESC);
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mood_checkins' AND policyname='mood_checkins_all') THEN
    CREATE POLICY "mood_checkins_all" ON mood_checkins
      FOR ALL USING (family_id=get_my_family_id()) WITH CHECK (family_id=get_my_family_id());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cognitive_activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  activity_type TEXT        NOT NULL,
  score         INTEGER,
  total         INTEGER,
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cognitive_activities_family ON cognitive_activities (family_id, created_at DESC);
ALTER TABLE cognitive_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cognitive_activities' AND policyname='cognitive_activities_all') THEN
    CREATE POLICY "cognitive_activities_all" ON cognitive_activities
      FOR ALL USING (family_id=get_my_family_id()) WITH CHECK (family_id=get_my_family_id());
  END IF;
END $$;

-- ── Migration 008: cognitive reports ─────────────────────────

CREATE TABLE IF NOT EXISTS cognitive_reports (
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
CREATE INDEX IF NOT EXISTS idx_cognitive_reports_family ON cognitive_reports (family_id, created_at DESC);
ALTER TABLE cognitive_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cognitive_reports' AND policyname='cognitive_reports_all') THEN
    CREATE POLICY "cognitive_reports_all" ON cognitive_reports
      FOR ALL USING (family_id=get_my_family_id()) WITH CHECK (family_id=get_my_family_id());
  END IF;
END $$;

-- ── Verify all tables exist ───────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('patient_medical_info','mood_checkins','cognitive_activities','cognitive_reports')
ORDER BY table_name;
-- Should return 4 rows. If any are missing, re-run this file.
