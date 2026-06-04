'use client';

/**
 * PatientReminderWidget — inline home-page reminder card.
 *
 * Shows on the patient Home page so the patient can see an active or upcoming
 * reminder without relying on the full-screen overlay alone.
 *
 * Layout:
 *  • Due NOW  → large amber "Time for:" card with Done + Snooze buttons
 *              (mirrors ReminderPrompt but stays inline; the overlay also fires)
 *  • Upcoming → smaller "Next reminder in X min" card (informational only)
 *  • Nothing  → returns null
 *
 * Uses the same precision-wakeup strategy as ReminderPrompt (setTimeout fires
 * at exactly the next due time so the card appears immediately).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSeverity } from '@/lib/alert-severity';
import type { Tables } from '@/lib/supabase/database.types';

const POLL_MS         = 30_000;
const SNOOZE_MIN      = 10;
const LOOKAHEAD_MS    = 4 * 60 * 60_000;  // show upcoming reminder up to 4 h ahead

type Reminder = Tables<'reminders'>;
type State =
  | { kind: 'idle' }
  | { kind: 'upcoming'; reminder: Reminder; minsUntil: number }
  | { kind: 'due';      reminder: Reminder };

const TYPE_EMOJI: Record<string, string> = {
  medication:  '💊',
  activity:    '🏃',
  appointment: '📅',
};

function isOneTime(r: Reminder) {
  return !r.repeat_rule || r.repeat_rule.trim() === '';
}

export default function PatientReminderWidget({ familyId }: { familyId: string }) {
  const supabase    = createClient();
  const [state, setState]   = useState<State>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const snoozeMap   = useRef(new Map<string, number>());
  const wakeupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef   = useRef(false);

  useEffect(() => { savingRef.current = saving; }, [saving]);

  const scheduleWakeup = useCallback((reminders: Reminder[]) => {
    if (wakeupTimer.current) { clearTimeout(wakeupTimer.current); wakeupTimer.current = null; }
    const now = Date.now();
    let soonestMs: number | null = null;
    for (const r of reminders) {
      if (!r.time) continue;
      const [hh, mm] = r.time.split(':').map(Number);
      const due = new Date(); due.setHours(hh, mm ?? 0, 0, 0);
      const ms = due.getTime() - now;
      if (ms > 0 && (soonestMs === null || ms < soonestMs)) soonestMs = ms;
    }
    if (soonestMs !== null) {
      wakeupTimer.current = setTimeout(() => runCheck(), soonestMs + 200);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, POLL_MS);
    return () => {
      clearInterval(id);
      if (wakeupTimer.current) clearTimeout(wakeupTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  async function runCheck() {
    if (savingRef.current) return;
    try {
      const now      = new Date();
      const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);

      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('family_id', familyId)
        .eq('requires_confirmation', true);

      if (error || !reminders || reminders.length === 0) { setState({ kind: 'idle' }); return; }

      scheduleWakeup(reminders);

      let bestDue: Reminder | null = null;
      let bestUpcoming: { reminder: Reminder; minsUntil: number } | null = null;

      for (const r of reminders) {
        if (!r.time) continue;

        // Day filters
        if (r.repeat_rule === 'weekdays') {
          const dow = now.getDay();
          if (dow === 0 || dow === 6) continue;
        }
        if (r.repeat_rule === 'weekly' && r.last_confirmed_at) {
          const days = (now.getTime() - new Date(r.last_confirmed_at).getTime()) / 86_400_000;
          if (days < 7) continue;
        }

        // Done checks
        if (isOneTime(r) && r.last_confirmed_at) continue;
        if (!isOneTime(r) && r.last_confirmed_at && new Date(r.last_confirmed_at) >= midnight) continue;

        const [hh, mm]  = r.time.split(':').map(Number);
        const dueToday  = new Date(now);
        dueToday.setHours(hh, mm ?? 0, 0, 0);
        const minsUntil = (dueToday.getTime() - now.getTime()) / 60_000;

        // Snoozed?
        const snoozedUntil = snoozeMap.current.get(r.id);
        if (snoozedUntil && now.getTime() < snoozedUntil) continue;

        if (minsUntil <= 0) {
          const missedWindow = r.missed_window_minutes ?? 60;
          if (-minsUntil <= missedWindow) {
            bestDue = r; // take first due reminder
            break;
          }
        } else if (minsUntil <= LOOKAHEAD_MS / 60_000) {
          // Keep the earliest upcoming
          if (!bestUpcoming || minsUntil < bestUpcoming.minsUntil) {
            bestUpcoming = { reminder: r, minsUntil };
          }
        }
      }

      if (bestDue) {
        setState({ kind: 'due', reminder: bestDue });
      } else if (bestUpcoming) {
        setState({ kind: 'upcoming', reminder: bestUpcoming.reminder, minsUntil: bestUpcoming.minsUntil });
      } else {
        setState({ kind: 'idle' });
      }
    } catch (err) {
      console.error('[PatientReminderWidget] check error:', err);
    }
  }

  async function handleDone() {
    if (state.kind !== 'due' || saving) return;
    const reminder = state.reminder;
    setSaving(true);
    setErrMsg(null);
    const now = new Date().toISOString();
    try {
      await supabase.from('reminders').update({
        status:            'done',
        last_confirmed_at:  now,
        snooze_count:       0,
      }).eq('id', reminder.id);
      await supabase.from('notifications').insert({
        family_id: familyId,
        type:      'reminder_done',
        detail:    { reminder_id: reminder.id, title: reminder.title, completed_at: now },
        severity:  getSeverity('reminder_done'),
        status:    'new',
      });
      await supabase.from('events_log').insert({
        family_id: familyId,
        type:      'reminder_done',
        detail:    { reminder_id: reminder.id, title: reminder.title },
      });
      setState({ kind: 'idle' });
    } catch (err) {
      console.error('[PatientReminderWidget] done error:', err);
      setErrMsg('Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSnooze() {
    if (state.kind !== 'due' || saving) return;
    const reminder = state.reminder;
    setSaving(true);
    try {
      snoozeMap.current.set(reminder.id, Date.now() + SNOOZE_MIN * 60_000);
      await supabase.from('reminders').update({
        snooze_count: (reminder.snooze_count ?? 0) + 1,
        status:       'snoozed',
      }).eq('id', reminder.id);
    } catch (err) {
      console.error('[PatientReminderWidget] snooze error:', err);
    } finally {
      setSaving(false);
      setState({ kind: 'idle' });
    }
  }

  if (state.kind === 'idle') return null;

  // ── Upcoming: informational card ────────────────────────────────────────
  if (state.kind === 'upcoming') {
    const { reminder, minsUntil } = state;
    const [h, m] = reminder.time.split(':').map(Number);
    const timeStr = `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const emoji   = TYPE_EMOJI[reminder.type] ?? '🔔';
    const label   = minsUntil <= 5  ? 'in a few minutes'
      : minsUntil < 60  ? `in ${Math.round(minsUntil)} min`
      : minsUntil < 120 ? `in ${Math.round(minsUntil / 60)} hour`
      : `at ${timeStr}`;

    return (
      <div
        className="rounded-3xl px-5 py-4 flex items-center gap-4"
        style={{ backgroundColor: '#fdf0e3' }}
        role="region"
        aria-label={`Next reminder: ${reminder.title}`}
      >
        <div
          className="rounded-2xl flex items-center justify-center shrink-0 text-2xl"
          style={{ backgroundColor: '#f0a05a', width: '56px', height: '56px' }}
          aria-hidden
        >
          {emoji}
        </div>
        <div>
          <p style={{ fontSize: '15px', color: '#9a5c1a', fontWeight: 600 }}>
            Next reminder — {label}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2 }}>
            {reminder.title}
          </p>
        </div>
      </div>
    );
  }

  // ── Due: action card ─────────────────────────────────────────────────────
  const { reminder } = state;
  const emoji = TYPE_EMOJI[reminder.type] ?? '🔔';

  return (
    <div
      className="rounded-3xl px-6 py-5 text-center"
      style={{ backgroundColor: '#fdf0e3', border: '3px solid #f0a05a' }}
      role="region"
      aria-label={`Reminder due now: ${reminder.title}`}
      aria-live="assertive"
    >
      <p className="text-5xl mb-2" aria-hidden>{emoji}</p>
      <p style={{ fontSize: '18px', color: '#9a5c1a', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Time for your reminder
      </p>
      <p style={{ fontSize: '30px', fontWeight: 700, color: '#2b2b3a', marginTop: '6px', lineHeight: 1.2 }}>
        {reminder.title}
      </p>

      {errMsg && (
        <p style={{ fontSize: '16px', color: '#b91c1c', marginTop: '8px' }} role="alert">{errMsg}</p>
      )}

      <button
        type="button"
        onClick={handleDone}
        disabled={saving}
        className="w-full rounded-3xl mt-5 font-bold disabled:opacity-50"
        style={{ backgroundColor: '#5cb89a', color: '#fff', fontSize: '26px', minHeight: '72px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
        aria-busy={saving}
      >
        {saving ? 'Saving…' : '✓  Done'}
      </button>

      <button
        type="button"
        onClick={handleSnooze}
        disabled={saving}
        className="w-full rounded-3xl mt-3 font-semibold disabled:opacity-50"
        style={{ backgroundColor: '#e5f5f0', color: '#2b5c4a', fontSize: '20px', minHeight: '60px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        Remind me in {SNOOZE_MIN} minutes
      </button>
    </div>
  );
}
