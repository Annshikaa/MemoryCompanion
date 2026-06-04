import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import IdentifyClient from '@/components/patient/IdentifyClient';

export const metadata = { title: 'Who is this? — Memory Companion' };

export default async function IdentifyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');
  if (profile.role !== 'patient') redirect('/caregiver');

  return <IdentifyClient />;
}
