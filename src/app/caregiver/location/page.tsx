import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LocationClient from '@/components/caregiver/LocationClient';

export const metadata = { title: 'Location Safety — Memory Companion' };

export default async function LocationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) redirect('/onboarding');

  const [{ data: settings }, { data: latestPing }] = await Promise.all([
    supabase
      .from('location_settings')
      .select('*')
      .eq('family_id', profile.family_id)
      .maybeSingle(),
    supabase
      .from('location_pings')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Location Safety
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          Consented, transparent location sharing. The patient sees a visible indicator when sharing is active.
        </p>
      </div>

      <LocationClient
        initialSettings={settings ?? null}
        latestPing={latestPing ?? null}
        familyId={profile.family_id}
      />
    </div>
  );
}
