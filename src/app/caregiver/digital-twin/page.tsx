import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllMetrics } from '@/lib/metrics';
import DigitalTwinClient from '@/components/caregiver/DigitalTwinClient';
import type { TwinPageData } from '@/components/caregiver/DigitalTwinClient';

export const metadata = { title: 'Digital Twin — Memory Companion' };

// ── today's UTC midnight ──────────────────────────────────────────────────
function todayMidnight(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── server-side wellbeing text composer ──────────────────────────────────
function composeWellbeing({
  insideZone,
  locationEnabled,
  criticalCount,
  highCount,
  todayDone,
  todayTotal,
  latestMood,
}: {
  insideZone: boolean | null;
  locationEnabled: boolean;
  criticalCount: number;
  highCount: number;
  todayDone: number;
  todayTotal: number;
  latestMood: string | null;
}): string {
  const parts: string[] = [];

  if (!locationEnabled) {
    parts.push('Location sharing off');
  } else if (insideZone === true) {
    parts.push('Settled at home');
  } else if (insideZone === false) {
    parts.push('Outside safe zone');
  } else {
    parts.push('Location unknown');
  }

  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical alert${criticalCount > 1 ? 's' : ''} need attention`);
  } else if (highCount > 0) {
    parts.push(`${highCount} high-priority alert${highCount > 1 ? 's' : ''} pending`);
  } else {
    parts.push('no active alerts');
  }

  if (todayTotal === 0) {
    parts.push('no reminders today');
  } else if (todayDone === todayTotal) {
    parts.push('all reminders done');
  } else {
    parts.push(`${todayDone}/${todayTotal} reminders done`);
  }

  if (latestMood) {
    const map: Record<string, string> = { happy: 'mood positive', okay: 'mood neutral', sad: 'mood low', anxious: 'mood worried' };
    parts.push(map[latestMood] ?? `mood: ${latestMood}`);
  }

  return parts.join(' · ');
}

export default async function DigitalTwinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id, role').eq('id', user.id).single();
  if (!profile?.family_id || profile.role !== 'caregiver') redirect('/caregiver');

  const familyId   = profile.family_id;
  const midnight   = todayMidnight();

  // ── Parallel fetch — everything the dashboard needs ───────────────────
  const [
    { data: patient },
    { data: latestPing },
    { data: locationSettings },
    { data: unresolvedAlerts },
    { data: allReminders },
    { data: latestMoodRow },
    { data: lastEventLog },
    metrics7,
    { data: latestReport },
    { count: remindersCount },
    { count: contactsCount },
    { count: facesCount },
    { count: peopleCount },
  ] = await Promise.all([
    supabase.from('patients').select('name').eq('family_id', familyId).maybeSingle(),

    supabase.from('location_pings')
      .select('lat, lng, inside_zone, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('location_settings')
      .select('sharing_enabled, home_lat, home_lng, radius_m')
      .eq('family_id', familyId)
      .maybeSingle(),

    supabase.from('notifications')
      .select('id, type, severity, status, created_at, detail')
      .eq('family_id', familyId)
      .in('severity', ['critical', 'high'])
      .neq('status', 'resolved')
      .order('severity', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(10),

    supabase.from('reminders')
      .select('id, title, type, time, last_confirmed_at, requires_confirmation, status')
      .eq('family_id', familyId)
      .eq('requires_confirmation', true),

    supabase.from('mood_checkins')
      .select('mood, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('events_log')
      .select('type, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    getAllMetrics(supabase, familyId, 7),

    supabase.from('cognitive_reports')
      .select('id, summary_text, created_at, ai_generated, days')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId),

    supabase.from('emergency_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId),

    supabase.from('face_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId),

    supabase.from('people')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId),
  ]);

  // ── Derive today's reminder completion state ──────────────────────────
  const todayReminders = (allReminders ?? []).map((r) => ({
    id:        r.id,
    title:     r.title,
    type:      r.type,
    time:      r.time,
    completed: r.last_confirmed_at ? r.last_confirmed_at >= midnight : false,
  }));
  const todayDone  = todayReminders.filter((r) => r.completed).length;
  const todayTotal = todayReminders.length;

  // ── Compose wellbeing text ────────────────────────────────────────────
  const criticalCount = (unresolvedAlerts ?? []).filter((a) => a.severity === 'critical').length;
  const highCount     = (unresolvedAlerts ?? []).filter((a) => a.severity === 'high').length;

  const wellbeingText = composeWellbeing({
    insideZone:      latestPing?.inside_zone ?? null,
    locationEnabled: locationSettings?.sharing_enabled ?? false,
    criticalCount,
    highCount,
    todayDone,
    todayTotal,
    latestMood:      latestMoodRow?.mood ?? null,
  });

  const pageData: TwinPageData = {
    familyId,
    patientName:     patient?.name ?? 'Patient',
    latestPing:      latestPing ?? null,
    locationSettings: locationSettings ?? null,
    unresolvedAlerts: (unresolvedAlerts ?? []).map((a) => ({
      id:         a.id,
      type:       a.type,
      severity:   a.severity as 'critical' | 'high',
      status:     a.status as 'new' | 'acknowledged',
      created_at: a.created_at,
      detail:     a.detail as Record<string, unknown> | null,
    })),
    todayReminders,
    latestMood:     latestMoodRow  ? { mood: latestMoodRow.mood,  created_at: latestMoodRow.created_at }  : null,
    lastActivity:   lastEventLog   ? { type: lastEventLog.type,   created_at: lastEventLog.created_at }   : null,
    metrics7,
    latestReport:   latestReport   ? { id: latestReport.id, summary_text: latestReport.summary_text, created_at: latestReport.created_at, ai_generated: latestReport.ai_generated, days: latestReport.days } : null,
    wellbeingText,
    setup: {
      remindersCount: remindersCount ?? 0,
      contactsCount:  contactsCount  ?? 0,
      facesCount:     facesCount     ?? 0,
      peopleCount:    peopleCount    ?? 0,
      locationEnabled: locationSettings?.sharing_enabled ?? false,
    },
  };

  return <DigitalTwinClient data={pageData} />;
}
