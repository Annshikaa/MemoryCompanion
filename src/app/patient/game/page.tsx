import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MemoryGame from '@/components/patient/MemoryGame';

export const metadata = { title: 'Family Game — Memory Companion' };

export default async function PatientGamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  // Prefer people with photos for a better game, but fall back to all
  const { data: people } = await supabase
    .from('people')
    .select('id, name, relationship, photo_url')
    .eq('family_id', profile.family_id)
    .order('pinned', { ascending: false });

  return (
    <MemoryGame
      people={people ?? []}
      familyId={profile.family_id}
    />
  );
}
