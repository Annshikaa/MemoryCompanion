import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AlertFeed from '@/components/caregiver/AlertFeed';
import { generateText } from '@/lib/gemini';
import { getSeverity } from '@/lib/alert-severity';
import type { Tables } from '@/lib/supabase/database.types';

export const metadata = { title: 'Alerts — Memory Companion' };

type Alert = Tables<'notifications'>;

// ── AI triage note generator (server-side, graceful fallback) ─────────────
async function generateTriageNote(alert: Alert): Promise<string | null> {
  const time   = new Date(alert.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const detail = alert.detail as Record<string, unknown> | null;

  let context = '';
  switch (alert.type) {
    case 'sos':
      context = `A dementia patient pressed the emergency help button at ${time}.`;
      break;
    case 'left_zone':
      context = `A dementia patient left their safe zone at ${time}${detail?.distance_m ? ` (${detail.distance_m}m from home)` : ''}.`;
      break;
    case 'inactivity':
      context = `No activity detected from a dementia patient's device since before ${time}.`;
      break;
    case 'reminder_missed':
      context = `A dementia patient missed their ${String(detail?.title ?? 'reminder')} scheduled at ${time}.`;
      break;
    default:
      return null;
  }

  const prompt = `${context}
Write ONE short sentence (max 12 words) telling the caregiver what to do right now. No greeting, no filler.`;

  try {
    const note = await Promise.race([
      generateText(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4_000)),
    ]);
    return note.trim().replace(/^["']|["']$/g, '');
  } catch {
    return null; // silently skip — never crash the page
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false })
    .limit(150);

  const alerts: Alert[] = (notifications ?? []).map((n) => ({
    ...n,
    // Ensure severity is set for rows that predate migration 006
    severity: n.severity ?? getSeverity(n.type),
    status:   n.status   ?? 'new',
    acknowledged_at: n.acknowledged_at ?? null,
    acknowledged_by: n.acknowledged_by ?? null,
  }));

  const unseenCount  = alerts.filter((n) => !n.seen).length;

  // ── AI notes for top unresolved HIGH/CRITICAL (max 3, non-blocking) ───
  const noteTargets = alerts
    .filter((a) => (a.severity === 'critical' || a.severity === 'high') && a.status !== 'resolved')
    .slice(0, 3);

  const noteResults = await Promise.allSettled(noteTargets.map(generateTriageNote));

  const aiNotes: Record<string, string> = {};
  noteResults.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      aiNotes[noteTargets[i].id] = result.value;
    }
  });

  // Counts for the header
  const unresolvedCounts = alerts.reduce(
    (acc, a) => {
      if (a.status !== 'resolved') {
        acc[a.severity as keyof typeof acc] = (acc[a.severity as keyof typeof acc] ?? 0) + 1;
      }
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Alerts
          </h1>
          <p className="text-care-text-muted text-sm mt-1">
            Grouped by severity — critical and unresolved stay pinned at top.
          </p>
        </div>

        {/* Severity summary chips */}
        <div className="flex gap-2 flex-wrap justify-end shrink-0">
          {unresolvedCounts.critical > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              {unresolvedCounts.critical} critical
            </span>
          )}
          {unresolvedCounts.high > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
              {unresolvedCounts.high} high
            </span>
          )}
          {unresolvedCounts.medium > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              {unresolvedCounts.medium} medium
            </span>
          )}
          {unseenCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              {unseenCount} new
            </span>
          )}
        </div>
      </div>

      <AlertFeed
        initialAlerts={alerts}
        familyId={profile.family_id}
        aiNotes={aiNotes}
      />
    </div>
  );
}
