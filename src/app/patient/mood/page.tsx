import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MoodCheckin from '@/components/patient/MoodCheckin';

export const metadata = { title: 'How Are You Feeling — Memory Companion' };

export default async function PatientMoodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  const { data: patient } = await supabase
    .from('patients')
    .select('name')
    .eq('family_id', profile.family_id)
    .maybeSingle();

  const name = patient?.name ?? profile.display_name;

  return (
    <MoodCheckin
      familyId={profile.family_id}
      patientName={name}
    />
  );
}
