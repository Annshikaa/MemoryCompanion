import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FaceEnrollClient from '@/components/caregiver/FaceEnrollClient';

export const metadata = { title: 'Enroll Faces — Memory Companion' };

export default async function FacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) redirect('/onboarding');

  // Fetch people + their enrollment counts in parallel
  const [{ data: people }, { data: enrollmentRows }] = await Promise.all([
    supabase
      .from('people')
      .select('id, name, relationship, photo_url')
      .eq('family_id', profile.family_id)
      .order('name'),
    supabase
      .from('face_enrollments')
      .select('person_id')
      .eq('family_id', profile.family_id),
  ]);

  // Build a count map person_id → number of enrolled photos
  const countMap: Record<string, number> = {};
  for (const row of enrollmentRows ?? []) {
    countMap[row.person_id] = (countMap[row.person_id] ?? 0) + 1;
  }

  const peopleWithCounts = (people ?? []).map((p) => ({
    ...p,
    enrollmentCount: countMap[p.id] ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Enroll Faces
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          Upload one or more clear photos per person so the app can recognise them.
          More photos from different angles improve accuracy.
        </p>
      </div>

      <FaceEnrollClient people={peopleWithCounts} />
    </div>
  );
}
