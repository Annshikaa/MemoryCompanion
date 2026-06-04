import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PatientHomeButton   from '@/components/patient/HomeButton';
import PatientSettingsMenu from '@/components/patient/SettingsMenu';
import ReminderPrompt      from '@/components/patient/ReminderPrompt';
import SOSButton           from '@/components/patient/SOSButton';
import LocationTracker     from '@/components/patient/LocationTracker';

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, family_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.family_id) redirect('/onboarding');
  if (profile.role !== 'patient') redirect('/caregiver');

  const familyId = profile.family_id;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fbf7f0' }}>
      <main className="flex-1 flex flex-col" id="patient-main">
        {children}
      </main>

      {/* Persistent UI layer — all fixed-position, always available */}

      {/* Floating home button (hides on /patient itself) */}
      <PatientHomeButton />

      {/* Discreet settings / logout — top-right gear */}
      <PatientSettingsMenu />

      {/* Reminder overlay — fires when a reminder is due */}
      <ReminderPrompt familyId={familyId} />

      {/* SOS button — fixed bottom-right red circle */}
      <SOSButton familyId={familyId} />

      {/* Location tracker + transparent indicator */}
      <LocationTracker familyId={familyId} />
    </div>
  );
}
