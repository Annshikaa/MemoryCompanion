-- ============================================================
-- Memory Companion — Initial Schema
-- ============================================================
-- All tables are scoped to a family_id.
-- RLS ensures one family can never read another family's data.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id    UUID REFERENCES families(id) ON DELETE SET NULL,
  role         TEXT NOT NULL CHECK (role IN ('caregiver', 'patient')),
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  photo_url           TEXT,
  home_location_text  TEXT NOT NULL DEFAULT 'You are at home',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE people (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  relationship   TEXT NOT NULL,
  photo_url      TEXT,
  notes          TEXT,
  voice_note_url TEXT,
  pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  time_of_day  TIME NOT NULL,
  days_of_week TEXT[] NOT NULL DEFAULT '{}',
  icon_url     TEXT,
  instructions TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reminders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id            UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL CHECK (type IN ('medication', 'activity', 'appointment')),
  title                TEXT NOT NULL,
  time                 TIME NOT NULL,
  repeat_rule          TEXT,
  photo_url            TEXT,
  last_confirmed_at    TIMESTAMPTZ,
  requires_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reminiscence_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('photo', 'music', 'memory')),
  title       TEXT NOT NULL,
  media_url   TEXT,
  era_year    INTEGER,
  description TEXT,
  prompt      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_family_id       ON profiles(family_id);
CREATE INDEX idx_patients_family_id       ON patients(family_id);
CREATE INDEX idx_people_family_id         ON people(family_id);
CREATE INDEX idx_routines_family_id       ON routines(family_id);
CREATE INDEX idx_reminders_family_id      ON reminders(family_id);
CREATE INDEX idx_reminiscence_family_id   ON reminiscence_items(family_id);
CREATE INDEX idx_events_log_family_id     ON events_log(family_id);
CREATE INDEX idx_events_log_created_at    ON events_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE people            ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminiscence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_log        ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the family_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid();
$$;

-- families: users see only their own family
CREATE POLICY "families_select" ON families
  FOR SELECT USING (id = get_my_family_id());

CREATE POLICY "families_insert" ON families
  FOR INSERT WITH CHECK (true); -- anyone can create a family during onboarding

CREATE POLICY "families_update" ON families
  FOR UPDATE USING (id = get_my_family_id());

-- profiles: users see profiles in their family; can insert/update their own
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR family_id = get_my_family_id()
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- patients
CREATE POLICY "patients_all" ON patients
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- people
CREATE POLICY "people_all" ON people
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- routines
CREATE POLICY "routines_all" ON routines
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- reminders
CREATE POLICY "reminders_all" ON reminders
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- reminiscence_items
CREATE POLICY "reminiscence_all" ON reminiscence_items
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- events_log
CREATE POLICY "events_log_all" ON events_log
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in the Supabase dashboard Storage section, or via the JS client.
-- Bucket: "family-media" — scoped per family in the path: {family_id}/{type}/{filename}

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime for tables the patient side subscribes to:
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE routines;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE people;
ALTER PUBLICATION supabase_realtime ADD TABLE reminiscence_items;
