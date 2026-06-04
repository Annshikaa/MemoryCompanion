import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompanionClient from '@/components/patient/CompanionClient';

export const metadata = { title: 'Talk to Me — Memory Companion' };

export default async function CompanionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id, display_name').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');
  if (profile.role !== 'patient') redirect('/caregiver');

  const { data: patient } = await supabase
    .from('patients').select('name').eq('family_id', profile.family_id).maybeSingle();

  const patientName = patient?.name ?? profile.display_name;

  return (
    <CompanionClient patientName={patientName} />
  );
}
