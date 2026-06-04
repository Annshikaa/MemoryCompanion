import { createClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/caregiver/DashboardClient';
import { getSeverity } from '@/lib/alert-severity';

export default async function CaregiverDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name')
    .eq('id', user!.id)
    .single();

  const familyId = profile?.family_id!;

  const [
    { data: patient },
    { count: peopleCount },
    { count: routinesCount },
    { count: remindersCount },
    { count: memoriesCount },
    { data: unresolvedAlerts },
  ] = await Promise.all([
    supabase.from('patients').select('name, photo_url, home_location_text').eq('family_id', familyId).maybeSingle(),
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('routines').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('reminiscence_items').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('notifications').select('severity, type').eq('family_id', familyId).neq('status', 'resolved'),
  ]);

  // Count unresolved alerts by severity for the summary widget
  const alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const n of unresolvedAlerts ?? []) {
    const sev = (n.severity ?? getSeverity(n.type)) as keyof typeof alertCounts;
    if (sev in alertCounts) alertCounts[sev]++;
  }

  return (
    <DashboardClient
      displayName={profile?.display_name ?? ''}
      patient={patient ?? null}
      counts={{
        people:    peopleCount   ?? 0,
        routines:  routinesCount  ?? 0,
        reminders: remindersCount ?? 0,
        memories:  memoriesCount  ?? 0,
      }}
      alertCounts={alertCounts}
    />
  );
}
