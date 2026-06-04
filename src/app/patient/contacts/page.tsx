import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { UserCircle, Phone } from 'lucide-react';

export default async function PatientContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('priority');

  return (
    <div
      className="flex flex-col min-h-screen pb-32 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      <div className="px-6 pt-8 pb-6 text-center">
        <h1 style={{ fontSize: '40px', fontWeight: 700, color: '#2b2b3a' }}>
          Call for Help
        </h1>
        <p style={{ fontSize: '20px', color: '#9ca3af', marginTop: '8px' }}>
          Tap a name to call them
        </p>
      </div>

      {contacts && contacts.length > 0 ? (
        <div className="px-6 space-y-4">
          {contacts.map((contact) => (
            <a
              key={contact.id}
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-5 rounded-3xl px-5 py-4 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300"
              style={{ backgroundColor: '#e8f0fd', minHeight: '110px', textDecoration: 'none' }}
              aria-label={`Call ${contact.name}, ${contact.relationship}, ${contact.phone}`}
            >
              {/* Photo */}
              <div
                className="relative rounded-full overflow-hidden shrink-0"
                style={{ width: '72px', height: '72px', backgroundColor: '#bfdbfe' }}
              >
                {contact.photo_url ? (
                  <Image
                    src={contact.photo_url}
                    alt={contact.name}
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                ) : (
                  <UserCircle
                    className="absolute inset-0 m-auto"
                    style={{ width: '44px', height: '44px', color: '#5b8def' }}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#2b2b3a' }}>
                  {contact.name}
                </p>
                <p style={{ fontSize: '20px', color: '#5b8def' }}>{contact.relationship}</p>
                <p style={{ fontSize: '16px', color: '#9ca3af', marginTop: '2px' }}>{contact.phone}</p>
              </div>

              {/* Call button */}
              <div
                className="rounded-2xl flex flex-col items-center justify-center shrink-0 gap-1"
                style={{ width: '72px', minHeight: '72px', backgroundColor: '#5cb89a' }}
                aria-hidden="true"
              >
                <Phone className="w-7 h-7 text-white" />
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>CALL</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6">
          <div className="rounded-full p-8 mb-6" style={{ backgroundColor: '#e8f0fd' }}>
            <Phone className="w-16 h-16" style={{ color: '#5b8def' }} />
          </div>
          <p style={{ fontSize: '26px', color: '#2b2b3a', fontWeight: 600 }}>
            No contacts yet
          </p>
          <p className="mt-2" style={{ fontSize: '20px', color: '#9ca3af' }}>
            Ask your caregiver to add emergency contacts.
          </p>
        </div>
      )}
    </div>
  );
}
