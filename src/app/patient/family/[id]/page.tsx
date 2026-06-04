import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserCircle, ArrowLeft } from 'lucide-react';
import VoicePlayer from '@/components/patient/VoicePlayer';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  // RLS ensures the person belongs to this user's family
  const { data: person } = await supabase
    .from('people')
    .select('id, name, relationship, photo_url, notes, voice_note_url, pinned')
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .maybeSingle();

  if (!person) notFound();

  // "This is your daughter, Priya."
  const sentence = `This is your ${person.relationship.toLowerCase()}, ${person.name}.`;

  return (
    <div
      className="flex flex-col min-h-screen pb-32 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* ── Back button ── */}
      <div className="px-4 pt-6 pb-2">
        <Link
          href="/patient/family"
          className="inline-flex items-center gap-3 rounded-2xl px-5 transition-colors active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{
            backgroundColor: '#e8f0fd',
            color: '#2b2b3a',
            fontSize: '22px',
            fontWeight: 600,
            minHeight: '64px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back to My Family"
        >
          <ArrowLeft className="w-7 h-7 shrink-0" aria-hidden />
          Back to Family
        </Link>
      </div>

      {/* ── Photo ── */}
      <div
        className="mx-4 mt-4 rounded-3xl overflow-hidden"
        style={{ aspectRatio: '1 / 1', position: 'relative', backgroundColor: '#e8f0fd' }}
      >
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={`Photo of ${person.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: '#e8f0fd' }}
          >
            <UserCircle
              aria-hidden
              style={{ width: '120px', height: '120px', color: '#93c5fd' }}
            />
          </div>
        )}
      </div>

      {/* ── Name ── */}
      <div className="px-6 mt-6 text-center">
        <h1
          style={{ fontSize: '48px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.1 }}
        >
          {person.name}
        </h1>
      </div>

      {/* ── Relationship sentence ── */}
      <div
        className="mx-6 mt-5 rounded-3xl px-6 py-5 text-center"
        style={{ backgroundColor: '#e8f0fd' }}
      >
        <p style={{ fontSize: '28px', fontWeight: 600, color: '#1e40af', lineHeight: 1.3 }}>
          {sentence}
        </p>
      </div>

      {/* ── Notes ── */}
      {person.notes && (
        <div
          className="mx-6 mt-4 rounded-3xl px-6 py-5"
          style={{ backgroundColor: '#fef9c3' }}
        >
          <p style={{ fontSize: '22px', color: '#2b2b3a', lineHeight: 1.6 }}>
            {person.notes}
          </p>
        </div>
      )}

      {/* ── Voice note ── */}
      {person.voice_note_url && (
        <div className="mx-6 mt-5">
          <VoicePlayer url={person.voice_note_url} personName={person.name} />
        </div>
      )}
    </div>
  );
}
