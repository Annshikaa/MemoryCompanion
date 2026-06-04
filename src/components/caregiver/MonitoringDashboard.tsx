'use client';

/**
 * MonitoringDashboard — Wave 2 caregiver cognitive-health monitoring.
 *
 * Receives pre-fetched metrics for both 7-day and 30-day windows.
 * Toggle switches between them client-side (no extra fetch).
 *
 * IMPORTANT framing: observational support aid, NOT a medical device.
 * No diagnoses, no clinical language.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { AllMetrics } from '@/lib/metrics';
import { LineChart, BarChart, MoodBars } from './charts/MiniChart';

interface Props {
  metrics7:    AllMetrics;
  metrics30:   AllMetrics;
  familyId:    string;
  patientName: string;
}

const MOOD_EMOJI: Record<string, string> = { happy: '😊', okay: '😐', sad: '😢', anxious: '😰' };
const DIR_COLOR: Record<string, string>  = {
  improving:    'text-green-600',
  stable:       'text-amber-600',
  declining:    'text-red-600',
  insufficient: 'text-care-text-subtle',
};
const DIR_LABEL: Record<string, string>  = {
  improving:    '↑ improving',
  stable:       '→ stable',
  declining:    '↓ declining',
  insufficient: '— not enough data',
};

// ── Stat pill ─────────────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-care-bg rounded-care px-4 py-3 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle">{label}</p>
      <p className="text-2xl font-display font-bold text-care-text mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-care-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────
function Section({
  title, children, empty,
}: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
      <h2 className="font-display font-semibold text-care-text text-base mb-4">{title}</h2>
      {empty ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-care-text-subtle text-center">
            Not enough data yet — check back in a few days.
          </p>
        </div>
      ) : children}
    </div>
  );
}

// ── Report generation button ──────────────────────────────────────────────
function GenerateReportButton({ days, familyId }: { days: number; familyId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [reportId, setReportId] = useState<string | null>(null);

  async function generate() {
    setState('loading');
    try {
      const res = await fetch('/api/reports/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ days }),
      });
      if (!res.ok) throw new Error('API error');
      const json = await res.json() as { id: string };
      setReportId(json.id);
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done' && reportId) {
    return (
      <Link
        href={`/caregiver/monitoring/reports/${reportId}`}
        className="inline-flex items-center gap-2 bg-care-primary text-white text-sm font-semibold px-4 py-2.5 rounded-care hover:bg-care-primary-hover transition-colors"
      >
        View report →
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-2 bg-care-primary text-white text-sm font-semibold px-4 py-2.5 rounded-care hover:bg-care-primary-hover transition-colors disabled:opacity-60"
    >
      {state === 'loading' ? 'Generating…' : state === 'error' ? 'Try again' : `Generate ${days}-day report`}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function MonitoringDashboard({ metrics7, metrics30, familyId, patientName }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const m = days === 7 ? metrics7 : metrics30;

  const { adherence, mood, cognitive, confusion, activity } = m;

  // Snapshot text helpers
  const adherenceSnap = adherence.hasData
    ? `${adherence.overallRate ?? 0}% adherence`
    : 'No reminders yet';
  const moodSnap = mood.hasData
    ? `Mostly ${Object.entries(mood.distribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}`
    : 'No check-ins yet';
  const gameSnap = cognitive.hasData
    ? `${cognitive.sessionsTotal} game${cognitive.sessionsTotal !== 1 ? 's' : ''} played`
    : 'No game data';
  const actSnap = activity.hasData
    ? `~${activity.avgPerDay ?? 0} actions/day`
    : 'No activity data';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Monitoring
          </h1>
          <p className="text-care-text-muted text-sm mt-1">
            Observational patterns for {patientName} — not a medical assessment.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Range toggle */}
          <div className="flex rounded-care border border-care-border overflow-hidden text-sm font-semibold">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-4 py-2 transition-colors ${days === d ? 'bg-care-primary text-white' : 'bg-white text-care-text-muted hover:bg-care-bg'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Link
            href="/caregiver/monitoring/reports"
            className="text-sm font-medium text-care-primary hover:underline"
          >
            Past reports
          </Link>
        </div>
      </div>

      {/* Wellbeing Snapshot */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle">
              Wellbeing Snapshot — {days} day window
            </p>
            <p className="text-xs text-care-text-subtle mt-1">
              Observational heuristic — component signals shown transparently below.
            </p>
          </div>
          <GenerateReportButton days={days} familyId={familyId} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Adherence"  value={adherenceSnap} />
          <Stat label="Mood"       value={moodSnap} />
          <Stat label="Engagement" value={gameSnap} />
          <Stat label="Activity"   value={actSnap} />
        </div>
      </div>

      {/* Adherence chart */}
      <Section title="Reminder Adherence" empty={!adherence.hasData}>
        {adherence.hasData && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Overall" value={`${adherence.overallRate ?? 0}%`} sub="completed on time" />
              <Stat label="Completed" value={String(adherence.totalDone)} sub="reminders done" />
              <Stat label="Missed"    value={String(adherence.totalMissed)} sub="reminders missed" />
            </div>
            <LineChart
              data={adherence.series.map((s) => ({ date: s.date, value: s.rate }))}
              color="#3d7a6e"
              yMax={100}
              yUnit="%"
              emptyText="No reminder data in range"
            />
          </>
        )}
      </Section>

      {/* Mood chart */}
      <Section title="Mood Check-ins" empty={!mood.hasData}>
        {mood.hasData && (
          <>
            <div className="flex items-center gap-6 mb-4 flex-wrap">
              <div className="flex gap-3">
                {(['happy', 'okay', 'sad', 'anxious'] as const).map((k) => (
                  mood.distribution[k] > 0 && (
                    <div key={k} className="flex items-center gap-1">
                      <span className="text-xl" aria-hidden>{MOOD_EMOJI[k]}</span>
                      <span className="text-sm font-semibold text-care-text">{mood.distribution[k]}</span>
                    </div>
                  )
                ))}
              </div>
              <span className={`text-sm font-semibold ${DIR_COLOR[mood.direction]}`}>
                {DIR_LABEL[mood.direction]}
              </span>
            </div>
            <MoodBars
              data={mood.series}
              emptyText="No mood data in range"
            />
            <p className="text-xs text-care-text-subtle mt-3">
              Bar colours: 🟢 Happy, 🟡 Okay, 🔵 Sad, 🩷 Worried
            </p>
          </>
        )}
      </Section>

      {/* Cognitive engagement chart */}
      <Section title="Memory Game Engagement" empty={!cognitive.hasData}>
        {cognitive.hasData && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Sessions" value={String(cognitive.sessionsTotal)} sub="games played" />
              <Stat
                label="Avg score"
                value={cognitive.avgScore !== null ? `${cognitive.avgScore}%` : '—'}
                sub={cognitive.avgScore !== null ? 'correct answers' : 'no scored rounds yet'}
              />
              <Stat
                label="Score trend"
                value={DIR_LABEL[cognitive.scoreTrend] ?? '—'}
              />
            </div>
            <BarChart
              data={cognitive.series.map((s) => ({ date: s.date, value: s.sessions }))}
              color="#9b7fd4"
              emptyText="No game data in range"
            />
          </>
        )}
      </Section>

      {/* Confusion signals */}
      <Section title="Companion Interaction Signals" empty={!confusion.hasData}>
        {confusion.hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Questions" value={String(confusion.totalQuestions)} sub="total asked" />
            <Stat
              label="Couldn't answer"
              value={confusion.deferredRate !== null ? `${confusion.deferredRate}%` : '—'}
              sub={`${confusion.deferredCount} deferred`}
            />
            <Stat
              label="Repeated questions"
              value={String(confusion.repeatedCount)}
              sub="same question within 24 h"
            />
          </div>
        )}
      </Section>

      {/* Activity level */}
      <Section title="App Activity Level" empty={!activity.hasData}>
        {activity.hasData && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Total actions"  value={String(activity.totalInteractions)} />
              <Stat label="Daily avg"       value={`${activity.avgPerDay ?? 0}`} sub="actions/day" />
              {activity.safeZoneExits > 0 && (
                <Stat label="Safe-zone exits" value={String(activity.safeZoneExits)} sub="left home area" />
              )}
            </div>
            <BarChart
              data={activity.series}
              color="#f0a05a"
              emptyText="No activity data in range"
            />
          </>
        )}
      </Section>

      {/* Disclaimer */}
      <p className="text-xs text-care-text-subtle text-center pb-2">
        This dashboard shows observational patterns from app usage only.
        It is a supportive aid for caregivers and is not a medical device,
        diagnostic tool, or substitute for professional healthcare advice.
      </p>
    </div>
  );
}
