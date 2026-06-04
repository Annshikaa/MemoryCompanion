import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PeopleClient from '@/components/caregiver/PeopleClient';

export const metadata = { title: 'Loved Ones — Memory Companion' };

export default async function LoveOnesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) redirect('/onboarding');

  const [{ data: people }, { data: patient }] = await Promise.all([
    supabase
      .from('people')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('pinned', { ascending: false })
      .order('name'),
    supabase
      .from('patients')
      .select('name')
      .eq('family_id', profile.family_id)
      .maybeSingle(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <PeopleClient
        initialPeople={people ?? []}
        familyId={profile.family_id}
        patientName={patient?.name ?? null}
      />
    </div>
  );
}
