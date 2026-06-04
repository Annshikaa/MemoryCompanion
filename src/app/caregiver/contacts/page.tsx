import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContactsClient from '@/components/caregiver/ContactsClient';

export const metadata = { title: 'Emergency Contacts — Memory Companion' };

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Emergency Contacts
        </h1>
      </div>
      <ContactsClient
        initialContacts={contacts ?? []}
        familyId={profile.family_id}
      />
    </div>
  );
}
