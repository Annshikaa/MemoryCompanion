import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserCircle, Phone } from 'lucide-react';

export default async function SOSPage() {
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
      className="flex flex-col min-h-screen px-6 pt-10 pb-32 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* Reassurance message */}
      <div
        className="rounded-3xl px-6 py-8 mb-10 text-center"
        style={{ backgroundColor: '#dcfce7' }}
        role="status"
        aria-live="polite"
      >
        <div style={{ fontSize: '64px', marginBottom: '8px' }} aria-hidden>🌟</div>
        <p style={{ fontSize: '34px', fontWeight: 700, color: '#166534', marginBottom: '8px', lineHeight: 1.2 }}>
          Help is on the way.
        </p>
        <p style={{ fontSize: '24px', color: '#15803d', lineHeight: 1.4 }}>
          You&apos;re okay. Your caregiver has been notified.
        </p>
      </div>

      {/* Emergency contacts */}
      {contacts && contacts.length > 0 && (
        <div>
          <p
            className="text-center mb-6"
            style={{ fontSize: '22px', color: '#6b7280', fontWeight: 600 }}
          >
            You can also call someone:
          </p>

          <div className="space-y-4">
            {contacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-5 rounded-3xl px-5 py-4 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300"
                style={{ backgroundColor: '#e8f0fd', minHeight: '96px', textDecoration: 'none' }}
                aria-label={`Call ${contact.name}, ${contact.relationship}, ${contact.phone}`}
              >
                {/* Photo */}
                <div
                  className="relative rounded-full overflow-hidden shrink-0"
                  style={{ width: '64px', height: '64px', backgroundColor: '#bfdbfe' }}
                >
                  {contact.photo_url ? (
                    <Image
                      src={contact.photo_url}
                      alt={contact.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <UserCircle
                      className="absolute inset-0 m-auto"
                      style={{ width: '40px', height: '40px', color: '#5b8def' }}
                    />
                  )}
                </div>

                {/* Name + relationship */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#2b2b3a' }}>
                    {contact.name}
                  </p>
                  <p style={{ fontSize: '18px', color: '#5b8def' }}>{contact.relationship}</p>
                </div>

                {/* Call icon */}
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: '56px', height: '56px', backgroundColor: '#5b8def' }}
                  aria-hidden="true"
                >
                  <Phone className="w-6 h-6 text-white" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Go home */}
      <div className="mt-10">
        <Link
          href="/patient"
          className="flex items-center justify-center rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{
            backgroundColor: '#e8f0fd',
            color: '#2b2b3a',
            minHeight: '72px',
            fontSize: '24px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          🏠 Go back home
        </Link>
      </div>
    </div>
  );
}
