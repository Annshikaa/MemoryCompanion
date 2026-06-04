import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DailySummaryClient from '@/components/caregiver/DailySummaryClient';

export const metadata = { title: 'Daily Summary — Memory Companion' };

export default async function DailySummaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) redirect('/onboarding');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Daily Summary
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          A gentle AI summary of your loved one's last 24 hours, based on reminders, alerts, and logged activity.
        </p>
      </div>
      <DailySummaryClient />
    </div>
  );
}
