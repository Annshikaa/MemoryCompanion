-- ============================================================
-- Memory Companion — Mood check-ins + Cognitive activities
-- ============================================================

-- ── Mood check-ins ────────────────────────────────────────────
CREATE TABLE mood_checkins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  mood       TEXT        NOT NULL
    CHECK (mood IN ('happy', 'okay', 'sad', 'anxious')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mood_checkins_family ON mood_checkins (family_id, created_at DESC);

ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_checkins_all" ON mood_checkins
  FOR ALL USING  (family_id = get_my_family_id())
  WITH CHECK     (family_id = get_my_family_id());


-- ── Cognitive activities ─────────────────────────────────────
-- Stores one row per completed game/activity session.
-- activity_type: 'who_is_this' (expandable)
-- score: correct answers out of total
-- result: arbitrary JSON for activity-specific detail
CREATE TABLE cognitive_activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  activity_type TEXT        NOT NULL,
  score         INTEGER,
  total         INTEGER,
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cognitive_activities_family ON cognitive_activities (family_id, created_at DESC);

ALTER TABLE cognitive_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cognitive_activities_all" ON cognitive_activities
  FOR ALL USING  (family_id = get_my_family_id())
  WITH CHECK     (family_id = get_my_family_id());
