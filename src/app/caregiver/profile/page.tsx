import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

export const metadata = { title: 'Patient Profile — Memory Companion' };

export default async function PatientProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('family_id', profile.family_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Patient Profile
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          This information appears on their home screen to help them stay oriented.
        </p>
      </div>

      <ProfileClient patient={patient ?? null} familyId={profile.family_id} />
    </div>
  );
}
