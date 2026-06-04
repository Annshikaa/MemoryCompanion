import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MedicalInfoForm from '@/components/caregiver/MedicalInfoForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Medical Info — Memory Companion' };

export default async function MedicalInfoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const [{ data: patient }, { data: medInfo }] = await Promise.all([
    supabase.from('patients')
      .select('name').eq('family_id', profile.family_id).maybeSingle(),
    supabase.from('patient_medical_info')
      .select('allergies, medications, conditions, notes')
      .eq('family_id', profile.family_id).maybeSingle(),
  ]);

  const patientName = patient?.name ?? 'Patient';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/caregiver"
          className="text-care-text-muted hover:text-care-text transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Medical Info
          </h1>
          <p className="text-care-text-muted text-sm mt-0.5">
            Reference info for {patientName} — shown on the Emergency Mode screen for first-responders.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6">
        <MedicalInfoForm
          familyId={profile.family_id}
          patientName={patientName}
          initialData={medInfo ? {
            allergies:   medInfo.allergies   ?? '',
            medications: medInfo.medications ?? '',
            conditions:  medInfo.conditions  ?? '',
            notes:       medInfo.notes       ?? '',
          } : null}
        />
      </div>
    </div>
  );
}
