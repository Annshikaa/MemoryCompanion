import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllMetrics } from '@/lib/metrics';
import MonitoringDashboard from '@/components/caregiver/MonitoringDashboard';

export const metadata = { title: 'Monitoring — Memory Companion' };

export default async function MonitoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id, role').eq('id', user.id).single();
  if (!profile?.family_id || profile.role !== 'caregiver') redirect('/caregiver');

  const { data: patient } = await supabase
    .from('patients').select('name').eq('family_id', profile.family_id).maybeSingle();

  // Pre-fetch both windows server-side — client just toggles between them
  const [metrics7, metrics30] = await Promise.all([
    getAllMetrics(supabase, profile.family_id, 7),
    getAllMetrics(supabase, profile.family_id, 30),
  ]);

  return (
    <MonitoringDashboard
      metrics7={metrics7}
      metrics30={metrics30}
      familyId={profile.family_id}
      patientName={patient?.name ?? 'your patient'}
    />
  );
}
