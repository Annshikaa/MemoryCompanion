/**
 * Cognitive Health Metrics Engine — Wave 2
 *
 * Each metric is a pure async function that accepts a Supabase server client,
 * a familyId, and a `since` ISO timestamp (start of the window).
 *
 * Design rules:
 *  - Never crash on sparse/missing data; return null-safe structs instead.
 *  - No PII leaves this module (no question text, no reminder titles).
 *  - Nothing clinical — values are observations, not diagnoses.
 *  - Each function is independently testable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';

export type Supabase = SupabaseClient<Database>;

// ── Shared helpers ────────────────────────────────────────────────────────

/** ISO YYYY-MM-DD in the caller's local-equivalent UTC day */
function toDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Inclusive range of YYYY-MM-DD strings for the last `days` days (today last). */
export function buildDayRange(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function sinceDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface DailyAdherence {
  date:    string;
  done:    number;
  missed:  number;
  rate:    number | null;   // 0–100, null if no reminders that day
}

export interface AdherenceMetrics {
  hasData:      boolean;
  totalDue:     number;
  totalDone:    number;
  totalMissed:  number;
  overallRate:  number | null;
  series:       DailyAdherence[];
}

export interface DailyMood {
  date:  string;
  happy:   number;
  okay:    number;
  sad:     number;
  anxious: number;
  total:   number;
}

export type MoodDirection = 'improving' | 'stable' | 'declining' | 'insufficient';

export interface MoodMetrics {
  hasData:      boolean;
  total:        number;
  distribution: { happy: number; okay: number; sad: number; anxious: number };
  direction:    MoodDirection;
  series:       DailyMood[];
}

export interface DailyCognitive {
  date:     string;
  sessions: number;
  avgScore: number | null;
}

export type TrendDir = 'improving' | 'stable' | 'declining' | 'insufficient';

export interface CognitiveMetrics {
  hasData:       boolean;
  sessionsTotal: number;
  avgScore:      number | null;
  scoreTrend:    TrendDir;
  series:        DailyCognitive[];
}

export interface ConfusionMetrics {
  hasData:        boolean;
  totalQuestions: number;
  deferredCount:  number;
  repeatedCount:  number;   // same question fingerprint within 24 h
  deferredRate:   number | null;
}

export interface DailyActivity {
  date:  string;
  count: number;
}

export interface ActivityMetrics {
  hasData:          boolean;
  totalInteractions: number;
  avgPerDay:        number | null;
  safeZoneExits:    number;
  series:           DailyActivity[];
}

export interface AllMetrics {
  days:       number;
  periodStart: string;
  periodEnd:  string;
  adherence:  AdherenceMetrics;
  mood:       MoodMetrics;
  cognitive:  CognitiveMetrics;
  confusion:  ConfusionMetrics;
  activity:   ActivityMetrics;
}

// ── 1. Adherence ──────────────────────────────────────────────────────────

export async function getAdherenceMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<AdherenceMetrics> {
  const since = sinceDate(days);
  const range = buildDayRange(days);
  const empty = (): AdherenceMetrics => ({
    hasData: false, totalDue: 0, totalDone: 0, totalMissed: 0,
    overallRate: null, series: range.map((d) => ({ date: d, done: 0, missed: 0, rate: null })),
  });

  const { data, error } = await sb
    .from('events_log')
    .select('type, created_at')
    .eq('family_id', familyId)
    .in('type', ['reminder_done', 'reminder_missed'])
    .gte('created_at', since);

  if (error || !data || data.length === 0) return empty();

  // Aggregate by day
  const byDay = new Map<string, { done: number; missed: number }>();
  for (const row of data) {
    const d = toDay(row.created_at);
    const cur = byDay.get(d) ?? { done: 0, missed: 0 };
    if (row.type === 'reminder_done')   cur.done++;
    else                                cur.missed++;
    byDay.set(d, cur);
  }

  const series: DailyAdherence[] = range.map((d) => {
    const v = byDay.get(d) ?? { done: 0, missed: 0 };
    const total = v.done + v.missed;
    return { date: d, done: v.done, missed: v.missed, rate: total > 0 ? Math.round((v.done / total) * 100) : null };
  });

  const totalDone   = data.filter((r) => r.type === 'reminder_done').length;
  const totalMissed = data.filter((r) => r.type === 'reminder_missed').length;
  const totalDue    = totalDone + totalMissed;

  return {
    hasData:     totalDue > 0,
    totalDue, totalDone, totalMissed,
    overallRate: totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : null,
    series,
  };
}

// ── 2. Mood ───────────────────────────────────────────────────────────────

const MOOD_WEIGHT: Record<string, number> = { happy: 2, okay: 1, sad: -1, anxious: -1 };

function moodScore(dist: { happy: number; okay: number; sad: number; anxious: number }): number {
  return (
    dist.happy   * MOOD_WEIGHT.happy   +
    dist.okay    * MOOD_WEIGHT.okay    +
    dist.sad     * MOOD_WEIGHT.sad     +
    dist.anxious * MOOD_WEIGHT.anxious
  );
}

export async function getMoodMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<MoodMetrics> {
  const since = sinceDate(days);
  const range = buildDayRange(days);
  const emptyDist = () => ({ happy: 0, okay: 0, sad: 0, anxious: 0 });
  const empty = (): MoodMetrics => ({
    hasData: false, total: 0, distribution: emptyDist(),
    direction: 'insufficient', series: range.map((d) => ({ date: d, ...emptyDist(), total: 0 })),
  });

  const { data, error } = await sb
    .from('mood_checkins')
    .select('mood, created_at')
    .eq('family_id', familyId)
    .gte('created_at', since);

  if (error || !data || data.length === 0) return empty();

  const byDay = new Map<string, { happy: number; okay: number; sad: number; anxious: number }>();
  const overall = emptyDist();

  for (const row of data) {
    const d = toDay(row.created_at);
    const cur = byDay.get(d) ?? emptyDist();
    const m = row.mood as keyof typeof cur;
    if (m in cur) { cur[m]++; overall[m]++; }
    byDay.set(d, cur);
  }

  const series: DailyMood[] = range.map((d) => {
    const v = byDay.get(d) ?? emptyDist();
    return { date: d, ...v, total: v.happy + v.okay + v.sad + v.anxious };
  });

  // Direction: compare score of first half vs second half
  let direction: MoodDirection = 'insufficient';
  if (data.length >= 4) {
    const mid = Math.floor(range.length / 2);
    const firstHalf  = series.slice(0, mid).reduce((acc, s) => ({
      happy: acc.happy + s.happy, okay: acc.okay + s.okay, sad: acc.sad + s.sad, anxious: acc.anxious + s.anxious,
    }), emptyDist());
    const secondHalf = series.slice(mid).reduce((acc, s) => ({
      happy: acc.happy + s.happy, okay: acc.okay + s.okay, sad: acc.sad + s.sad, anxious: acc.anxious + s.anxious,
    }), emptyDist());
    const delta = moodScore(secondHalf) - moodScore(firstHalf);
    direction = delta > 1 ? 'improving' : delta < -1 ? 'declining' : 'stable';
  }

  return { hasData: true, total: data.length, distribution: overall, direction, series };
}

// ── 3. Cognitive engagement ───────────────────────────────────────────────

export async function getCognitiveMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<CognitiveMetrics> {
  const since = sinceDate(days);
  const range = buildDayRange(days);
  const empty = (): CognitiveMetrics => ({
    hasData: false, sessionsTotal: 0, avgScore: null, scoreTrend: 'insufficient',
    series: range.map((d) => ({ date: d, sessions: 0, avgScore: null })),
  });

  const { data, error } = await sb
    .from('cognitive_activities')
    .select('score, total, created_at')
    .eq('family_id', familyId)
    .gte('created_at', since);

  if (error || !data || data.length === 0) return empty();

  const byDay = new Map<string, { sessions: number; scoreSum: number; scoreCnt: number }>();
  let totalScoreSum = 0, totalScoreCnt = 0;

  for (const row of data) {
    const d = toDay(row.created_at);
    const cur = byDay.get(d) ?? { sessions: 0, scoreSum: 0, scoreCnt: 0 };
    cur.sessions++;
    if (row.score !== null && row.total !== null && row.total > 0) {
      const pct = (row.score / row.total) * 100;
      cur.scoreSum += pct; cur.scoreCnt++;
      totalScoreSum += pct; totalScoreCnt++;
    }
    byDay.set(d, cur);
  }

  const series: DailyCognitive[] = range.map((d) => {
    const v = byDay.get(d) ?? { sessions: 0, scoreSum: 0, scoreCnt: 0 };
    return { date: d, sessions: v.sessions, avgScore: v.scoreCnt > 0 ? Math.round(v.scoreSum / v.scoreCnt) : null };
  });

  // Score trend: compare first half avg vs second half avg
  let scoreTrend: TrendDir = 'insufficient';
  const scoreSeries = series.filter((s) => s.avgScore !== null);
  if (scoreSeries.length >= 4) {
    const mid = Math.floor(scoreSeries.length / 2);
    const firstAvg  = scoreSeries.slice(0, mid).reduce((s, d) => s + (d.avgScore ?? 0), 0) / mid;
    const secondAvg = scoreSeries.slice(mid).reduce((s, d) => s + (d.avgScore ?? 0), 0) / (scoreSeries.length - mid);
    const delta = secondAvg - firstAvg;
    scoreTrend = delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable';
  }

  return {
    hasData:       true,
    sessionsTotal: data.length,
    avgScore:      totalScoreCnt > 0 ? Math.round(totalScoreSum / totalScoreCnt) : null,
    scoreTrend,
    series,
  };
}

// ── 4. Confusion signals ──────────────────────────────────────────────────

/** Normalize a question string to a fingerprint for duplicate detection. */
function questionFingerprint(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export async function getConfusionMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<ConfusionMetrics> {
  const since = sinceDate(days);
  const empty = (): ConfusionMetrics => ({
    hasData: false, totalQuestions: 0, deferredCount: 0, repeatedCount: 0, deferredRate: null,
  });

  const { data, error } = await sb
    .from('events_log')
    .select('detail, created_at')
    .eq('family_id', familyId)
    .eq('type', 'companion_question')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return empty();

  let deferredCount = 0;
  let repeatedCount = 0;

  // Track (fingerprint → last seen timestamp ms) to detect repeats within 24 h
  const lastSeen = new Map<string, number>();

  for (const row of data) {
    const detail = row.detail as Record<string, unknown> | null;
    if (detail?.deferred) deferredCount++;

    const q = typeof detail?.question === 'string' ? detail.question : '';
    if (q) {
      const fp = questionFingerprint(q);
      const ts = new Date(row.created_at).getTime();
      const prev = lastSeen.get(fp);
      if (prev && ts - prev < 24 * 60 * 60 * 1000) repeatedCount++;
      lastSeen.set(fp, ts);
    }
  }

  return {
    hasData:        true,
    totalQuestions: data.length,
    deferredCount,
    repeatedCount,
    deferredRate:   data.length > 0 ? Math.round((deferredCount / data.length) * 100) : null,
  };
}

// ── 5. Activity level ─────────────────────────────────────────────────────

export async function getActivityMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<ActivityMetrics> {
  const since = sinceDate(days);
  const range = buildDayRange(days);
  const empty = (): ActivityMetrics => ({
    hasData: false, totalInteractions: 0, avgPerDay: null, safeZoneExits: 0,
    series: range.map((d) => ({ date: d, count: 0 })),
  });

  // Count events_log entries (all types = any app activity)
  const [eventsRes, moodRes, gameRes] = await Promise.all([
    sb.from('events_log').select('created_at').eq('family_id', familyId).gte('created_at', since),
    sb.from('mood_checkins').select('created_at').eq('family_id', familyId).gte('created_at', since),
    sb.from('cognitive_activities').select('created_at').eq('family_id', familyId).gte('created_at', since),
  ]);

  const allDates: string[] = [
    ...(eventsRes.data ?? []).map((r) => r.created_at),
    ...(moodRes.data ?? []).map((r) => r.created_at),
    ...(gameRes.data ?? []).map((r) => r.created_at),
  ];

  if (allDates.length === 0) return empty();

  const safeZoneExits = (eventsRes.data ?? []).filter(
    (r) => {
      // We only fetched created_at so we need another query for type filter
      // Use the notification table query instead
      return false; // placeholder — counted separately below
    },
  ).length;

  // Separate query for safe-zone exits
  const { data: exitData } = await sb
    .from('events_log')
    .select('id')
    .eq('family_id', familyId)
    .eq('type', 'left_zone')
    .gte('created_at', since);

  const byDay = new Map<string, number>();
  for (const ts of allDates) {
    const d = toDay(ts);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }

  const series: DailyActivity[] = range.map((d) => ({
    date: d, count: byDay.get(d) ?? 0,
  }));

  const activeDays  = series.filter((s) => s.count > 0).length;
  const totalInteractions = allDates.length;

  return {
    hasData:           totalInteractions > 0,
    totalInteractions,
    avgPerDay:         activeDays > 0 ? Math.round(totalInteractions / days) : null,
    safeZoneExits:     exitData?.length ?? 0,
    series,
  };
}

// ── Composite: get all metrics ────────────────────────────────────────────

export async function getAllMetrics(
  sb: Supabase, familyId: string, days: number,
): Promise<AllMetrics> {
  const now        = new Date().toISOString();
  const periodEnd  = now;
  const startDate  = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  startDate.setUTCHours(0, 0, 0, 0);
  const periodStart = startDate.toISOString();

  const [adherence, mood, cognitive, confusion, activity] = await Promise.all([
    getAdherenceMetrics(sb, familyId, days),
    getMoodMetrics(sb, familyId, days),
    getCognitiveMetrics(sb, familyId, days),
    getConfusionMetrics(sb, familyId, days),
    getActivityMetrics(sb, familyId, days),
  ]);

  return { days, periodStart, periodEnd, adherence, mood, cognitive, confusion, activity };
}

// ── Text helpers for report generation ───────────────────────────────────

/** Returns a plain-text metrics summary suitable for LLM input (no PII). */
export function metricsToPromptContext(m: AllMetrics): string {
  const lines: string[] = [`Period: last ${m.days} days`];

  if (m.adherence.hasData) {
    lines.push(
      `Reminder adherence: ${m.adherence.overallRate}% (${m.adherence.totalDone} completed, ${m.adherence.totalMissed} missed out of ${m.adherence.totalDue} total)`,
    );
  } else {
    lines.push('Reminder adherence: no data (no reminders recorded yet)');
  }

  if (m.mood.hasData) {
    const d = m.mood.distribution;
    lines.push(
      `Mood check-ins: ${m.mood.total} total — happy ${d.happy}, okay ${d.okay}, sad ${d.sad}, worried ${d.anxious}; trend: ${m.mood.direction}`,
    );
  } else {
    lines.push('Mood check-ins: no data');
  }

  if (m.cognitive.hasData) {
    const scoreStr = m.cognitive.avgScore !== null ? `avg score ${m.cognitive.avgScore}%` : 'no scores recorded';
    lines.push(`Cognitive game sessions: ${m.cognitive.sessionsTotal} (${scoreStr}; trend: ${m.cognitive.scoreTrend})`);
  } else {
    lines.push('Cognitive game sessions: no data');
  }

  if (m.confusion.hasData) {
    lines.push(
      `Companion questions: ${m.confusion.totalQuestions} total, ${m.confusion.deferredCount} the app could not answer, ${m.confusion.repeatedCount} repeated questions within 24 h`,
    );
  } else {
    lines.push('Companion questions: no data');
  }

  if (m.activity.hasData) {
    lines.push(`App activity: avg ${m.activity.avgPerDay ?? 0} interactions/day over ${m.days} days`);
    if (m.activity.safeZoneExits > 0) {
      lines.push(`Safe-zone exits: ${m.activity.safeZoneExits} time(s)`);
    }
  } else {
    lines.push('App activity: no data');
  }

  return lines.join('\n');
}

/** Template-based fallback summary (used when AI is unavailable). */
export function buildTemplateSummary(m: AllMetrics): string {
  const parts: string[] = [];

  if (m.adherence.hasData) {
    const rate = m.adherence.overallRate ?? 0;
    const adh  = rate >= 80 ? 'Reminder adherence was strong'
      : rate >= 50 ? 'Reminder adherence was moderate'
      : 'Reminder adherence was lower than usual';
    parts.push(`${adh} at ${rate}% (${m.adherence.totalDone} of ${m.adherence.totalDue} completed).`);
  }

  if (m.mood.hasData) {
    const d = m.mood.distribution;
    const top = (['happy', 'okay', 'sad', 'anxious'] as const)
      .map((k) => ({ k, n: d[k] }))
      .sort((a, b) => b.n - a.n)[0];
    const topLabel: Record<string, string> = { happy: 'positive', okay: 'neutral', sad: 'low', anxious: 'worried' };
    parts.push(
      `Mood check-ins (${m.mood.total} recorded) were most often ${topLabel[top.k] ?? top.k}` +
      (m.mood.direction !== 'insufficient' ? `, with a ${m.mood.direction} trend over the period.` : '.'),
    );
  }

  if (m.cognitive.hasData) {
    parts.push(
      `The memory game was played ${m.cognitive.sessionsTotal} time${m.cognitive.sessionsTotal !== 1 ? 's' : ''}` +
      (m.cognitive.avgScore !== null ? ` with an average score of ${m.cognitive.avgScore}%.` : '.'),
    );
  }

  if (!m.adherence.hasData && !m.mood.hasData && !m.cognitive.hasData) {
    parts.push(`No activity data was recorded in the last ${m.days} days. As the patient uses the app more, this summary will reflect their actual patterns.`);
  }

  parts.push(
    'Keep encouraging regular app use — the more check-ins recorded, the clearer the picture becomes.',
    'Note: This is an observational summary based on app data only and is not medical advice. Please consult a healthcare professional for any medical concerns.',
  );

  return parts.join(' ');
}
