import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';

export default async function PatientFamilyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  const { data: people } = await supabase
    .from('people')
    .select('id, name, relationship, photo_url, notes, pinned')
    .eq('family_id', profile.family_id)
    .order('pinned', { ascending: false })
    .order('name');

  return (
    <div
      className="flex flex-col min-h-screen pb-28 max-w-2xl mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      <div className="px-6 pt-8 pb-6">
        <h1
          className="font-bold text-center"
          style={{ fontSize: '40px', color: '#2b2b3a' }}
        >
          My Family
        </h1>
        <p
          className="text-center mt-2"
          style={{ fontSize: '20px', color: '#9ca3af' }}
        >
          Tap a face to learn more
        </p>
      </div>

      {people && people.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 px-6">
          {people.map((person) => (
            <Link
              key={person.id}
              href={`/patient/family/${person.id}`}
              className="rounded-3xl overflow-hidden flex flex-col items-center transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{ backgroundColor: '#e8f0fd', minHeight: '220px' }}
              aria-label={`${person.name}, ${person.relationship}`}
            >
              {/* Photo */}
              <div className="w-full aspect-square relative bg-blue-100 flex items-center justify-center">
                {person.photo_url ? (
                  <Image
                    src={person.photo_url}
                    alt={person.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 50vw, 280px"
                  />
                ) : (
                  <UserCircle className="w-20 h-20 text-blue-300" aria-hidden />
                )}
              </div>

              {/* Name */}
              <div className="px-4 py-4 text-center">
                <p
                  className="font-bold leading-tight"
                  style={{ fontSize: '24px', color: '#2b2b3a' }}
                >
                  {person.name}
                </p>
                <p
                  style={{ fontSize: '18px', color: '#5b8def' }}
                  className="mt-1"
                >
                  {person.relationship}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6">
          <div
            className="rounded-full p-8 mb-6"
            style={{ backgroundColor: '#e8f0fd' }}
          >
            <UserCircle className="w-16 h-16" style={{ color: '#5b8def' }} />
          </div>
          <p style={{ fontSize: '26px', color: '#2b2b3a', fontWeight: 600 }}>
            No family added yet
          </p>
          <p
            className="mt-2"
            style={{ fontSize: '20px', color: '#9ca3af' }}
          >
            Ask your caregiver to add family photos.
          </p>
        </div>
      )}
    </div>
  );
}
