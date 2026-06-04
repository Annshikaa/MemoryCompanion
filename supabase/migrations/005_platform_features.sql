-- =============================================================
-- Memory Companion — Platform features (Milestone 6)
-- =============================================================
-- New tables: emergency_contacts, location_settings,
--             location_pings, notifications
-- Altered:    reminders (add missed_window_minutes, snooze_count, status)
-- =============================================================


-- ── Extend reminders ─────────────────────────────────────────
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS missed_window_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS snooze_count          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status                TEXT    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','snoozed','done','missed'));


-- ── Emergency contacts ────────────────────────────────────────
CREATE TABLE emergency_contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  relationship TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  photo_url    TEXT,
  priority     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_family ON emergency_contacts(family_id, priority);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_contacts_all" ON emergency_contacts
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());


-- ── Location settings (one row per family) ───────────────────
CREATE TABLE location_settings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  sharing_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  home_lat        FLOAT8,
  home_lng        FLOAT8,
  radius_m        INTEGER     NOT NULL DEFAULT 200,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_settings_family ON location_settings(family_id);

ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_settings_all" ON location_settings
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());


-- ── Location pings ────────────────────────────────────────────
CREATE TABLE location_pings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  lat         FLOAT8      NOT NULL,
  lng         FLOAT8      NOT NULL,
  accuracy    FLOAT8,
  inside_zone BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_pings_family ON location_pings(family_id, created_at DESC);

ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_pings_all" ON location_pings
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());


-- ── Notifications (caregiver-facing feed) ─────────────────────
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
    CHECK (type IN ('reminder_done','reminder_missed','sos','left_zone','inactivity')),
  detail     JSONB,
  seen       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_family ON notifications(family_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON notifications
  FOR ALL USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());


-- ── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE location_pings;
