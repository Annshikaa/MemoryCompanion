import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EmergencyCardClient from '@/components/caregiver/EmergencyCardClient';

export const metadata = { title: 'Emergency QR Card — Memory Companion' };

export default async function EmergencyCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const [{ data: patient }, { data: medInfo }] = await Promise.all([
    supabase.from('patients')
      .select('name, photo_url')
      .eq('family_id', profile.family_id)
      .maybeSingle(),
    supabase.from('patient_medical_info')
      .select('allergies, medications, conditions, public_token, is_public, show_name, show_photo, show_allergies, show_medications, show_conditions, show_contacts')
      .eq('family_id', profile.family_id)
      .maybeSingle(),
  ]);

  return (
    <EmergencyCardClient
      familyId={profile.family_id}
      patientName={patient?.name ?? null}
      patientPhotoUrl={patient?.photo_url ?? null}
      initialMedInfo={{
        allergies:        medInfo?.allergies   ?? null,
        medications:      medInfo?.medications ?? null,
        conditions:       medInfo?.conditions  ?? null,
        publicToken:      medInfo?.public_token ?? null,
        isPublic:         medInfo?.is_public    ?? false,
        showName:         medInfo?.show_name        ?? true,
        showPhoto:        medInfo?.show_photo       ?? false,
        showAllergies:    medInfo?.show_allergies   ?? true,
        showMedications:  medInfo?.show_medications ?? true,
        showConditions:   medInfo?.show_conditions  ?? true,
        showContacts:     medInfo?.show_contacts    ?? true,
      }}
    />
  );
}
