import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AIBuilderClient from '@/components/caregiver/AIBuilderClient';

export const metadata = { title: 'AI Memory Builder — Memory Companion' };

export default async function AIBuilderPage() {
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
          AI Memory Builder
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          Paste your notes about your loved one — the AI will extract structured suggestions you can review and save.
        </p>
      </div>
      <AIBuilderClient />
    </div>
  );
}
