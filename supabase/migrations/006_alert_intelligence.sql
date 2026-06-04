-- ============================================================
-- Memory Companion — Alert Intelligence (Wave 1)
-- ============================================================
-- Extends notifications with severity + lifecycle status.
-- RLS stays on the existing policy (family_id = get_my_family_id()).
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'acknowledged', 'resolved')),
  ADD COLUMN IF NOT EXISTS acknowledged_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by  UUID;   -- auth.users id; soft ref, no FK to avoid cascade issues

-- ── Backfill correct severities for existing rows ────────────────────────
UPDATE notifications SET severity = 'critical'
  WHERE type = 'sos' AND severity = 'low';

UPDATE notifications SET severity = 'high'
  WHERE type IN ('left_zone', 'inactivity') AND severity = 'low';

UPDATE notifications SET severity = 'medium'
  WHERE type = 'reminder_missed' AND severity = 'low';

-- reminder_done stays 'low' (default already set above)

-- ── Optimised index for triage queries ───────────────────────────────────
-- Supports: "family X, unresolved critical first, newest first"
CREATE INDEX IF NOT EXISTS idx_notifications_triage
  ON notifications (family_id, severity, status, created_at DESC);

-- Realtime publication already covers notifications (migration 005)
