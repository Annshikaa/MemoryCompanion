import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MemoriesPlayer from '@/components/patient/MemoriesPlayer';

export const metadata = { title: 'Remember When — Memory Companion' };

export default async function PatientMemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  const { data: items } = await supabase
    .from('reminiscence_items')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('era_year', { ascending: false });

  return <MemoriesPlayer items={items ?? []} />;
}
