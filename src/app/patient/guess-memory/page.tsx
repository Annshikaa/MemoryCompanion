import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GuessMemoryGame from '@/components/patient/GuessMemoryGame';

export const metadata = { title: 'Guess the Memory — Memory Companion' };

export default async function GuessMemoryPage() {
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
    .eq('kind', 'photo')
    .order('created_at', { ascending: false });

  // Also include non-photo memory items so the game has more content
  const { data: allItems } = await supabase
    .from('reminiscence_items')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false });

  return (
    <GuessMemoryGame
      items={allItems ?? items ?? []}
      familyId={profile.family_id}
    />
  );
}
