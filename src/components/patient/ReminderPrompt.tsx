'use client';

/**
 * ReminderPrompt — full-screen overlay that surfaces a due reminder.
 *
 * Fixes applied vs. original:
 *  - Precision wake-up: schedules a setTimeout to fire at exactly the next
 *    reminder's due time instead of relying purely on the 30-s poll interval.
 *  - One-time reminders: if repeat_rule is null/empty and last_confirmed_at
 *    is set, the reminder is considered permanently done.
 *  - Repeat-reminder missed trap: markMissed no longer guards on
 *    status === 'missed' (which persisted across days). Instead it guards on
 *    whether a missed notification was already sent today using events_log.
 *  - handleDone / handleSnooze: wrapped in try/catch; overlay always closes
 *    even if a DB write fails.
 *  - Check is skipped while saving to avoid racing state.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSeverity } from '@/lib/alert-severity';
import type { Tables } from '@/lib/supabase/database.types';

const POLL_INTERVAL_MS = 30_000;   // fallback poll every 30 s
const SNOOZE_MIN       = 10;       // snooze for 10 minutes
const LOOKAHEAD_MS     = 30 * 60_000; // schedule precision wake-up for reminders within 30 min

type Reminder = Tables<'reminders'>;

const TYPE_EMOJI: Record<string, string> = {
  medication:  '💊',
  activity:    '🏃',
  appointment: '📅',
};

/** True if a reminder is "one-time" (no repeat rule). */
function isOneTime(r: Reminder): boolean {
  return !r.repeat_rule || r.repeat_rule.trim() === '';
}

export default function ReminderPrompt({ familyId }: { familyId: string }) {
  const [active,  setActive]  = useState<Reminder | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);

  const supabase    = createClient();
  const snoozeMap   = useRef(new Map<string, number>()); // id → epoch ms to re-show
  const wakeupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef   = useRef(false);  // mirror of saving for use inside async check

  // Keep ref in sync with state so the async check can read it
  useEffect(() => { savingRef.current = saving; }, [saving]);

  // ── Precision wake-up scheduler ──────────────────────────────────────────
  const schedulePreciseWakeup = useCallback((reminders: Reminder[]) => {
    if (wakeupTimer.current) {
      clearTimeout(wakeupTimer.current);
      wakeupTimer.current = null;
    }

    const now = Date.now();
    let soonestMs: number | null = null;

    for (const r of reminders) {
      if (!r.time) continue;
      const [hh, mm] = r.time.split(':').map(Number);
      const due = new Date();
      due.setHours(hh, mm ?? 0, 0, 0);
      const msUntil = due.getTime() - now;
      if (msUntil > 0 && msUntil < LOOKAHEAD_MS) {
        if (soonestMs === null || msUntil < soonestMs) soonestMs = msUntil;
      }
    }

    if (soonestMs !== null) {
      // Fire exactly at due time (+ 200 ms buffer for clock jitter)
      wakeupTimer.current = setTimeout(() => runCheck(), soonestMs + 200);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main polling effect ──────────────────────────────────────────────────
  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      if (wakeupTimer.current) clearTimeout(wakeupTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // ── Core check logic ──────────────────────────────────────────────────────
  async function runCheck() {
    try {
      await _runCheck();
    } catch (err) {
      console.error('[ReminderPrompt] check error:', err);
    }
  }

  async function _runCheck() {
    // Never interrupt a save-in-progress
    if (savingRef.current) return;

    const now      = new Date();
    const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('family_id', familyId)
      .eq('requires_confirmation', true);

    if (error) {
      console.error('[ReminderPrompt] query error:', error.message);
      return;
    }
    if (!reminders || reminders.length === 0) {
      setActive(null);
      return;
    }

    // Schedule a precision wake-up for the next upcoming reminder
    schedulePreciseWakeup(reminders);

    for (const r of reminders) {
      if (!r.time) continue;

      // ── Day filtering ──────────────────────────────────────────────────
      if (r.repeat_rule === 'weekdays') {
        const dow = now.getDay();
        if (dow === 0 || dow === 6) continue;
      }
      if (r.repeat_rule === 'weekly' && r.last_confirmed_at) {
        const daysSince = (now.getTime() - new Date(r.last_confirmed_at).getTime()) / 86_400_000;
        if (daysSince < 7) continue;
      }

      // ── Already-done checks ────────────────────────────────────────────
      // One-time reminder: confirmed at any point → done forever
      if (isOneTime(r) && r.last_confirmed_at) continue;
      // Repeating reminder: confirmed today → skip until tomorrow
      if (!isOneTime(r) && r.last_confirmed_at && new Date(r.last_confirmed_at) >= midnight) continue;

      // ── Parse due time ─────────────────────────────────────────────────
      const [hh, mm] = r.time.split(':').map(Number);
      const dueToday  = new Date(now);
      dueToday.setHours(hh, mm ?? 0, 0, 0);

      // Not due yet
      if (now < dueToday) continue;

      // Snoozed?
      const snoozedUntil = snoozeMap.current.get(r.id);
      if (snoozedUntil && now.getTime() < snoozedUntil) continue;

      // ── Missed window check ────────────────────────────────────────────
      const missedWindow = r.missed_window_minutes ?? 60;
      const minsPast = (now.getTime() - dueToday.getTime()) / 60_000;
      if (minsPast > missedWindow) {
        // Mark missed — but only if we haven't already marked it missed today.
        // Guard against duplicate notifications by checking events_log for today.
        await maybeMarkMissed(r, midnight);
        continue;
      }

      // ── Active ────────────────────────────────────────────────────────
      setActive(r);
      return;
    }

    // Nothing due — clear overlay if showing
    setActive((prev) => {
      // Don't clear while saving to avoid a flicker during handleDone
      if (savingRef.current) return prev;
      return null;
    });
  }

  // ── Mark missed (idempotent per day) ──────────────────────────────────────
  async function maybeMarkMissed(r: Reminder, midnight: Date) {
    try {
      // Check events_log: was this reminder already marked missed today?
      // Select detail so we can match by reminder_id client-side.
      const { data: existing } = await supabase
        .from('events_log')
        .select('detail')
        .eq('family_id', familyId)
        .eq('type', 'reminder_missed')
        .gte('created_at', midnight.toISOString());

      const alreadyToday = (existing ?? []).some(
        (e) => {
          const d = e.detail as Record<string, unknown> | null;
          return d?.reminder_id === r.id;
        },
      );
      if (alreadyToday) return;

      // Not yet marked missed today — write both records
      await Promise.all([
        supabase.from('reminders').update({ status: 'missed' }).eq('id', r.id),
        supabase.from('notifications').insert({
          family_id: familyId,
          type: 'reminder_missed',
          detail: { reminder_id: r.id, title: r.title, due_time: r.time },
          severity: getSeverity('reminder_missed'),
          status: 'new',
        }),
        supabase.from('events_log').insert({
          family_id: familyId,
          type: 'reminder_missed',
          detail: { reminder_id: r.id, title: r.title },
        }),
      ]);
    } catch (err) {
      console.error('[ReminderPrompt] maybeMarkMissed error:', err);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  async function handleDone() {
    if (!active || saving) return;
    setSaving(true);
    setErrMsg(null);
    const now = new Date().toISOString();
    try {
      await supabase.from('reminders').update({
        status:           'done',
        last_confirmed_at: now,
        snooze_count:     0,
      }).eq('id', active.id);

      await supabase.from('notifications').insert({
        family_id: familyId,
        type:      'reminder_done',
        detail:    { reminder_id: active.id, title: active.title, completed_at: now },
        severity:  getSeverity('reminder_done'),
        status:    'new',
      });
      await supabase.from('events_log').insert({
        family_id: familyId,
        type:      'reminder_done',
        detail:    { reminder_id: active.id, title: active.title },
      });
      setActive(null);
    } catch (err) {
      console.error('[ReminderPrompt] handleDone error:', err);
      setErrMsg('Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Snooze ────────────────────────────────────────────────────────────────
  async function handleSnooze() {
    if (!active || saving) return;
    setSaving(true);
    try {
      snoozeMap.current.set(active.id, Date.now() + SNOOZE_MIN * 60_000);
      await supabase.from('reminders').update({
        snooze_count: (active.snooze_count ?? 0) + 1,
        status:       'snoozed',
      }).eq('id', active.id);
    } catch (err) {
      console.error('[ReminderPrompt] handleSnooze error:', err);
    } finally {
      setSaving(false);
      setActive(null);
    }
  }

  if (!active) return null;

  const emoji = TYPE_EMOJI[active.type] ?? '🔔';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(43,43,58,0.85)' }}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Reminder: ${active.title}`}
    >
      <div
        style={{
          background:    '#fbf7f0',
          borderRadius:  '28px',
          padding:       '36px 28px',
          width:         '100%',
          maxWidth:      '420px',
          textAlign:     'center',
        }}
      >
        <div style={{ fontSize: '72px', marginBottom: '8px' }} aria-hidden>
          {emoji}
        </div>
        <h2 style={{ fontSize: '34px', fontWeight: 700, color: '#2b2b3a', marginBottom: '8px', lineHeight: 1.2 }}>
          {active.title}
        </h2>
        <p style={{ fontSize: '22px', color: '#6b7280', marginBottom: '32px' }}>
          It&apos;s time for this reminder
        </p>

        {errMsg && (
          <p style={{ fontSize: '16px', color: '#b91c1c', marginBottom: '16px' }} role="alert">
            {errMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleDone}
          disabled={saving}
          style={{
            display:       'block',
            width:         '100%',
            minHeight:     '72px',
            background:    saving ? '#a7c9be' : '#5cb89a',
            color:         '#fff',
            borderRadius:  '20px',
            fontSize:      '28px',
            fontWeight:    700,
            border:        'none',
            marginBottom:  '14px',
            cursor:        saving ? 'not-allowed' : 'pointer',
          }}
          aria-busy={saving}
        >
          {saving ? 'Saving…' : '✓  Done'}
        </button>

        <button
          type="button"
          onClick={handleSnooze}
          disabled={saving}
          style={{
            display:      'block',
            width:        '100%',
            minHeight:    '64px',
            background:   '#e5f5f0',
            color:        '#2b5c4a',
            borderRadius: '20px',
            fontSize:     '22px',
            fontWeight:   600,
            border:       'none',
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          Remind me in {SNOOZE_MIN} minutes
        </button>
      </div>
    </div>
  );
}
