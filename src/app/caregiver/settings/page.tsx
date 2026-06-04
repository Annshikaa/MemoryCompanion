import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CaregiverSettingsClient from './SettingsClient';

export default async function CaregiverSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id, display_name').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const [{ data: family }, { data: patient }] = await Promise.all([
    supabase.from('families').select('name, invite_code').eq('id', profile.family_id).single(),
    supabase.from('patients').select('*').eq('family_id', profile.family_id).single(),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <CaregiverSettingsClient
        family={family}
        patient={patient}
        familyId={profile.family_id}
      />
    </div>
  );
}
