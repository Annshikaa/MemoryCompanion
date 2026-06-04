'use client';

/**
 * DigitalTwinClient — Wave 4 unified patient-state dashboard.
 *
 * Receives all server-fetched data as props (no client-side fetching).
 * Adds Supabase Realtime subscriptions only for signals that must be live:
 *   • notifications (alerts panel)
 *   • location_pings (current location)
 *
 * Panel layout:
 *   1. RIGHT NOW   — current state (location, last activity, alerts, reminders, mood)
 *   2. TRENDS      — 7-day sparklines reusing Wave 2 AllMetrics
 *   3. WELLBEING SNAPSHOT — composed text + latest report headline
 *   4. SETUP STATUS — coverage gap indicators
 *
 * Non-clinical framing throughout. Explicit labels on every heuristic.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin, Clock, BellRing, CheckCircle2, Circle,
  Smile, AlertTriangle, Activity, ChevronRight, Info,
  Wifi, WifiOff, Users, Phone, ScanFace, Bell,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SEVERITY_STYLES, SEVERITY_LABEL, ALERT_TYPE_LABEL, getAlertDescription } from '@/lib/alert-severity';
import type { Severity } from '@/lib/alert-severity';
import type { AllMetrics } from '@/lib/metrics';
import { Sparkline } from './charts/Sparkline';

// ── Exported data type (shared with server page) ─────────────────────────

export interface TwinPageData {
  familyId:     string;
  patientName:  string;

  latestPing: {
    lat: number; lng: number;
    inside_zone: boolean | null;
    created_at: string;
  } | null;
  locationSettings: {
    sharing_enabled: boolean;
    home_lat: number | null; home_lng: number | null; radius_m: number;
  } | null;

  unresolvedAlerts: Array<{
    id: string; type: string;
    severity:   'critical' | 'high';
    status:     'new' | 'acknowledged';
    created_at: string;
    detail:     Record<string, unknown> | null;
  }>;

  todayReminders: Array<{
    id: string; title: string; type: string; time: string; completed: boolean;
  }>;

  latestMood: { mood: string; created_at: string } | null;
  lastActivity: { type: string; created_at: string } | null;

  metrics7: AllMetrics;

  latestReport: {
    id: string; summary_text: string; created_at: string;
    ai_generated: boolean; days: number;
  } | null;

  wellbeingText: string;

  setup: {
    remindersCount:  number;
    contactsCount:   number;
    facesCount:      number;
    peopleCount:     number;
    locationEnabled: boolean;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24)       return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function activityStaleness(iso: string | undefined): 'fresh' | 'stale' | 'silent' {
  if (!iso) return 'silent';
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 4)  return 'fresh';
  if (h < 24) return 'stale';
  return 'silent';
}

const MOOD_EMOJI: Record<string, string> = { happy: '😊', okay: '😐', sad: '😢', anxious: '😰' };
const MOOD_LABEL: Record<string, string> = { happy: 'Happy', okay: 'Okay', sad: 'Sad', anxious: 'Worried' };

// ── Section wrapper ───────────────────────────────────────────────────────

function Section({ title, badge, children }: {
  title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-care-border-subtle">
        <h2 className="font-display font-semibold text-care-text text-sm tracking-tight uppercase">
          {title}
        </h2>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-care-primary-light text-care-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Empty / no-data cell ──────────────────────────────────────────────────

function NoData({ label }: { label: string }) {
  return (
    <p className="text-xs text-care-text-subtle italic flex items-center gap-1">
      <Info className="w-3.5 h-3.5 shrink-0" />
      No {label} data yet
    </p>
  );
}

// ── Panel 1: RIGHT NOW ────────────────────────────────────────────────────

function RightNowPanel({
  patientName, latestPing, locationSettings,
  unresolvedAlerts, todayReminders, latestMood, lastActivity,
}: Pick<TwinPageData,
  'patientName' | 'latestPing' | 'locationSettings' |
  'unresolvedAlerts' | 'todayReminders' | 'latestMood' | 'lastActivity'
>) {
  const staleness = activityStaleness(lastActivity?.created_at);
  const todayDone = todayReminders.filter((r) => r.completed).length;

  const staleColor: Record<string, string> = {
    fresh:  'text-green-600',
    stale:  'text-amber-600',
    silent: 'text-red-600',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* Location */}
      <div className="rounded-care bg-care-bg p-4 flex items-start gap-3">
        <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-care-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-0.5">
            Location
          </p>
          {!locationSettings?.sharing_enabled ? (
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-4 h-4 text-care-text-subtle" />
              <p className="text-sm text-care-text-muted">Sharing off</p>
            </div>
          ) : !latestPing ? (
            <NoData label="location" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${latestPing.inside_zone ? 'text-green-600' : 'text-red-600'}`}>
                  {latestPing.inside_zone ? '✓ At home' : '⚠ Outside safe zone'}
                </span>
              </div>
              <p className="text-xs text-care-text-subtle mt-0.5">
                Last ping {timeAgo(latestPing.created_at)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Last activity */}
      <div className="rounded-care bg-care-bg p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-care-accent" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-0.5">
            Last Activity
          </p>
          {!lastActivity ? (
            <NoData label="activity" />
          ) : (
            <>
              <p className={`text-sm font-semibold ${staleColor[staleness]}`}>
                {timeAgo(lastActivity.created_at)}
              </p>
              <p className="text-xs text-care-text-subtle mt-0.5 capitalize">
                {lastActivity.type.replace(/_/g, ' ')}
              </p>
              {staleness === 'silent' && (
                <p className="text-xs text-red-500 mt-1">No activity for 24+ h — silence is a signal</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Today's reminders */}
      <div className="rounded-care bg-care-bg p-4 flex items-start gap-3">
        <Bell className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-0.5">
            Today&apos;s Reminders
          </p>
          {todayReminders.length === 0 ? (
            <p className="text-sm text-care-text-muted">None configured</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-care-text">
                {todayDone} / {todayReminders.length} completed
              </p>
              <ul className="mt-1.5 space-y-1">
                {todayReminders.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center gap-1.5 text-xs text-care-text-muted">
                    {r.completed
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      : <Circle       className="w-3.5 h-3.5 text-care-text-subtle shrink-0" />
                    }
                    <span className={r.completed ? 'line-through opacity-60' : ''}>
                      {r.title}
                    </span>
                  </li>
                ))}
                {todayReminders.length > 4 && (
                  <li className="text-xs text-care-text-subtle">
                    +{todayReminders.length - 4} more
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Latest mood */}
      <div className="rounded-care bg-care-bg p-4 flex items-start gap-3">
        <Smile className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-0.5">
            Latest Mood
          </p>
          {!latestMood ? (
            <>
              <NoData label="mood check-in" />
              <p className="text-xs text-care-text-subtle mt-1">
                Patient can record mood via &quot;How I Feel&quot;
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>{MOOD_EMOJI[latestMood.mood]}</span>
                <span className="text-sm font-semibold text-care-text">
                  {MOOD_LABEL[latestMood.mood] ?? latestMood.mood}
                </span>
              </div>
              <p className="text-xs text-care-text-subtle mt-0.5">
                {timeAgo(latestMood.created_at)} · from check-in
              </p>
            </>
          )}
        </div>
      </div>

      {/* Unresolved alerts — full-width, shown only when present */}
      {unresolvedAlerts.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Unresolved Alerts
          </p>
          <ul className="space-y-2">
            {unresolvedAlerts.map((alert) => {
              const sev    = alert.severity as Severity;
              const styles = SEVERITY_STYLES[sev];
              return (
                <li
                  key={alert.id}
                  className={`flex items-start gap-3 bg-white rounded-care border border-care-border p-3 ${styles.border}`}
                >
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${styles.badge}`}>
                    {SEVERITY_LABEL[sev]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-care-text">
                      {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
                    </p>
                    <p className="text-xs text-care-text-muted">
                      {getAlertDescription(alert.type, alert.detail)} · {timeAgo(alert.created_at)}
                    </p>
                  </div>
                  <Link
                    href="/caregiver/notifications"
                    className="text-xs text-care-primary hover:underline shrink-0"
                  >
                    View →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Panel 2: TRENDS ───────────────────────────────────────────────────────

function TrendsPanel({ metrics }: { metrics: AllMetrics }) {
  const { adherence, mood, cognitive, activity } = metrics;

  const trends: Array<{
    label:     string;
    value:     string;
    sub?:      string;
    spark:     number[];
    color:     string;
    hasData:   boolean;
    href:      string;
  }> = [
    {
      label:   'Adherence',
      value:   adherence.hasData ? `${adherence.overallRate ?? 0}%` : '—',
      sub:     adherence.hasData ? `${adherence.totalDone}/${adherence.totalDue} reminders` : undefined,
      spark:   adherence.series.map((s) => s.rate ?? 0),
      color:   '#3d7a6e',
      hasData: adherence.hasData,
      href:    '/caregiver/monitoring',
    },
    {
      label:   'Mood trend',
      value:   mood.hasData ? mood.direction.replace('_', ' ') : '—',
      sub:     mood.hasData ? `${mood.total} check-ins` : undefined,
      spark:   mood.series.map((s) => s.happy * 3 + s.okay * 2 - s.sad - s.anxious * 2),
      color:   '#f0a05a',
      hasData: mood.hasData,
      href:    '/caregiver/moods',
    },
    {
      label:   'Game sessions',
      value:   cognitive.hasData ? String(cognitive.sessionsTotal) : '—',
      sub:     cognitive.hasData && cognitive.avgScore !== null ? `avg ${cognitive.avgScore}% correct` : undefined,
      spark:   cognitive.series.map((s) => s.sessions),
      color:   '#9b7fd4',
      hasData: cognitive.hasData,
      href:    '/caregiver/monitoring',
    },
    {
      label:   'App activity',
      value:   activity.hasData ? `${activity.avgPerDay ?? 0}/day` : '—',
      sub:     activity.safeZoneExits > 0 ? `${activity.safeZoneExits} safe-zone exit${activity.safeZoneExits > 1 ? 's' : ''}` : undefined,
      spark:   activity.series.map((s) => s.count),
      color:   '#60a5fa',
      hasData: activity.hasData,
      href:    '/caregiver/monitoring',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {trends.map(({ label, value, sub, spark, color, hasData, href }) => (
        <Link
          key={label}
          href={href}
          className="block rounded-care bg-care-bg p-3 hover:shadow-care-sm transition-shadow group"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-1">
            {label}
          </p>
          <p className={`text-xl font-display font-bold ${hasData ? 'text-care-text' : 'text-care-text-subtle'}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-care-text-muted mt-0.5 truncate">{sub}</p>}
          {!hasData && <p className="text-xs text-care-text-subtle mt-0.5 italic">no data yet</p>}
          <div className="mt-2">
            <Sparkline data={spark} color={hasData ? color : '#e8dfd4'} width={80} height={28} />
          </div>
          <p className="text-xs text-care-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Full detail →
          </p>
        </Link>
      ))}
    </div>
  );
}

// ── Panel 3: WELLBEING SNAPSHOT ───────────────────────────────────────────

function WellbeingSnapshot({
  wellbeingText, latestReport,
}: Pick<TwinPageData, 'wellbeingText' | 'latestReport'>) {
  return (
    <div className="space-y-4">
      {/* Composed signal text */}
      <div className="rounded-care bg-care-primary-light p-4">
        <p className="text-sm font-semibold text-care-primary leading-relaxed">
          {wellbeingText}
        </p>
        <p className="text-xs text-care-primary mt-1.5 opacity-70">
          Supportive heuristic — composed from location, alerts, reminders, and mood signals.
          Not a medical assessment.
        </p>
      </div>

      {/* Sources legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-care-text-muted">
        {[
          { icon: MapPin,     label: 'Location ping' },
          { icon: BellRing,   label: 'Unresolved alerts' },
          { icon: Bell,       label: "Today's reminders" },
          { icon: Smile,      label: 'Mood check-in' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 shrink-0 text-care-accent" />
            {label}
          </div>
        ))}
      </div>

      {/* Latest report headline */}
      {latestReport && (
        <div className="rounded-care border border-care-border p-4 bg-white">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle">
              Latest {latestReport.days}-day Report
              <span className={`ml-2 px-1.5 py-0.5 rounded-full ${latestReport.ai_generated ? 'bg-care-primary-light text-care-primary' : 'bg-care-bg text-care-text-muted'}`}>
                {latestReport.ai_generated ? 'AI' : 'Template'}
              </span>
            </p>
            <Link
              href={`/caregiver/monitoring/reports/${latestReport.id}`}
              className="text-xs text-care-primary hover:underline shrink-0"
            >
              Full report →
            </Link>
          </div>
          <p className="text-sm text-care-text leading-relaxed line-clamp-3">
            {latestReport.summary_text}
          </p>
          <p className="text-xs text-care-text-subtle mt-1.5">
            {new Date(latestReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Panel 4: SETUP STATUS ─────────────────────────────────────────────────

function SetupStatus({ setup }: { setup: TwinPageData['setup'] }) {
  const items: Array<{
    icon:   React.ElementType;
    label:  string;
    value:  string;
    ok:     boolean;
    href:   string;
    tip:    string;
  }> = [
    {
      icon:  Bell,
      label: 'Reminders',
      value: setup.remindersCount > 0 ? `${setup.remindersCount} configured` : 'None yet',
      ok:    setup.remindersCount > 0,
      href:  '/caregiver/reminders',
      tip:   'Add daily reminders so the patient gets prompted on time',
    },
    {
      icon:  Phone,
      label: 'Emergency Contacts',
      value: setup.contactsCount > 0 ? `${setup.contactsCount} added` : 'None yet',
      ok:    setup.contactsCount > 0,
      href:  '/caregiver/contacts',
      tip:   'Add contacts so the patient can call for help',
    },
    {
      icon:  Users,
      label: 'Loved Ones',
      value: setup.peopleCount > 0 ? `${setup.peopleCount} added` : 'None yet',
      ok:    setup.peopleCount > 0,
      href:  '/caregiver/people',
      tip:   'Add family members for the companion and memory game',
    },
    {
      icon:  ScanFace,
      label: 'Face Enrollments',
      value: setup.facesCount > 0 ? `${setup.facesCount} enrolled` : 'None yet',
      ok:    setup.facesCount > 0,
      href:  '/caregiver/faces',
      tip:   'Enroll faces so the patient can identify people',
    },
    {
      icon:  setup.locationEnabled ? Wifi : WifiOff,
      label: 'Location Sharing',
      value: setup.locationEnabled ? 'Active' : 'Off',
      ok:    setup.locationEnabled,
      href:  '/caregiver/location',
      tip:   'Enable location sharing for safe-zone monitoring',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(({ icon: Icon, label, value, ok, href, tip }) => (
        <Link
          key={label}
          href={href}
          className="flex items-center gap-3 rounded-care bg-care-bg p-3 hover:shadow-care-sm transition-shadow"
        >
          <div className={`w-8 h-8 rounded-care flex items-center justify-center shrink-0 ${ok ? 'bg-green-100' : 'bg-amber-50'}`}>
            <Icon className={`w-4 h-4 ${ok ? 'text-green-600' : 'text-amber-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-care-text">{label}</p>
            <p className={`text-xs ${ok ? 'text-green-600' : 'text-amber-600'}`}>{value}</p>
          </div>
          {!ok && (
            <ChevronRight className="w-4 h-4 text-care-text-subtle shrink-0" />
          )}
        </Link>
      ))}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────

export default function DigitalTwinClient({ data }: { data: TwinPageData }) {
  const supabase = createClient();

  // Realtime state (alerts + location extend server data live)
  const [alerts,   setAlerts]   = useState(data.unresolvedAlerts);
  const [lastPing, setLastPing] = useState(data.latestPing);

  useEffect(() => {
    // ── Realtime: notifications ──────────────────────────────────────────
    const alertChannel = supabase
      .channel(`twin-alerts-${data.familyId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `family_id=eq.${data.familyId}`,
      }, (payload) => {
        const n = payload.new as typeof alerts[0];
        if ((n.severity === 'critical' || n.severity === 'high') && n.status !== 'resolved') {
          setAlerts((prev) => [n, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `family_id=eq.${data.familyId}`,
      }, (payload) => {
        const updated = payload.new as typeof alerts[0];
        if (updated.status === 'resolved') {
          setAlerts((prev) => prev.filter((a) => a.id !== updated.id));
        } else {
          setAlerts((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        }
      })
      .subscribe();

    // ── Realtime: location_pings ─────────────────────────────────────────
    const locChannel = supabase
      .channel(`twin-location-${data.familyId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'location_pings',
        filter: `family_id=eq.${data.familyId}`,
      }, (payload) => {
        const ping = payload.new as NonNullable<typeof lastPing>;
        setLastPing(ping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(locChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.familyId]);

  // Derive a wellbeing text refresh when alerts change client-side
  const criticalLive = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Digital Twin
          </h1>
          <p className="text-care-text-muted text-sm mt-1">
            Live state of {data.patientName} — observational aid, not a medical tool.
          </p>
        </div>
        {criticalLive > 0 && (
          <Link
            href="/caregiver/notifications"
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-care animate-pulse"
          >
            <AlertTriangle className="w-4 h-4" />
            {criticalLive} Critical
          </Link>
        )}
      </div>

      {/* 1. RIGHT NOW */}
      <Section title="Right Now" badge="Live">
        <RightNowPanel
          patientName={data.patientName}
          latestPing={lastPing}
          locationSettings={data.locationSettings}
          unresolvedAlerts={alerts}
          todayReminders={data.todayReminders}
          latestMood={data.latestMood}
          lastActivity={data.lastActivity}
        />
      </Section>

      {/* 2. TRENDS (7-day) */}
      <Section title="Trends — last 7 days">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-care-text-subtle">
            Compact view. Tap any tile for the full chart.
          </p>
          <Link href="/caregiver/monitoring" className="text-xs font-medium text-care-primary hover:underline flex items-center gap-1">
            Full monitoring <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <TrendsPanel metrics={data.metrics7} />
      </Section>

      {/* 3. WELLBEING SNAPSHOT */}
      <Section title="Wellbeing Snapshot">
        <WellbeingSnapshot
          wellbeingText={data.wellbeingText}
          latestReport={data.latestReport}
        />
      </Section>

      {/* 4. SETUP STATUS */}
      <Section title="Setup Coverage">
        <p className="text-xs text-care-text-subtle mb-3">
          Features that aren&apos;t set up won&apos;t contribute data to this dashboard.
        </p>
        <SetupStatus setup={data.setup} />
      </Section>

      {/* Footer disclaimer */}
      <p className="text-xs text-care-text-subtle text-center pb-2">
        Digital Twin aggregates app data as a supportive observation tool. It is not a
        diagnostic device and does not replace professional medical assessment.
      </p>
    </div>
  );
}
