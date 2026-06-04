import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReminiscencePromptsClient from '@/components/caregiver/ReminiscencePromptsClient';

export const metadata = { title: 'Suggest Prompts — Memory Companion' };

export default async function ReminiscenceSuggestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) redirect('/onboarding');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          AI Reminiscence Prompts
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          Describe the person and era — the AI will suggest gentle conversation prompts and memory topics you can save.
        </p>
      </div>
      <ReminiscencePromptsClient />
    </div>
  );
}
