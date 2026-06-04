'use client';

/**
 * MoodCheckin — one-tap mood recording for the patient.
 *
 * Shows four large emoji buttons. One tap records the mood and
 * shows a warm thank-you confirmation. A "Home" button is always
 * reachable. No destructive actions, no multi-step flow.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Home } from 'lucide-react';

type Mood = 'happy' | 'okay' | 'sad' | 'anxious';

const MOODS: Array<{
  value:   Mood;
  emoji:   string;
  label:   string;
  bg:      string;
  ring:    string;
}> = [
  { value: 'happy',   emoji: '😊', label: 'Happy',   bg: '#dcfce7', ring: 'focus:ring-green-300'  },
  { value: 'okay',    emoji: '😐', label: 'Okay',    bg: '#fef9c3', ring: 'focus:ring-yellow-300' },
  { value: 'sad',     emoji: '😢', label: 'Sad',     bg: '#dbeafe', ring: 'focus:ring-blue-300'   },
  { value: 'anxious', emoji: '😰', label: 'Worried', bg: '#fce7f3', ring: 'focus:ring-pink-300'   },
];

interface Props {
  familyId: string;
  patientName: string;
}

export default function MoodCheckin({ familyId, patientName }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [chosen,  setChosen]  = useState<Mood | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);

  async function handleMood(mood: Mood) {
    if (saving || done) return;
    setChosen(mood);
    setSaving(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.from('mood_checkins').insert({
        family_id: familyId,
        mood,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error('[MoodCheckin]', err);
      setErrMsg('Could not save — please try again.');
      setChosen(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Thank-you screen ────────────────────────────────────────────────────
  if (done && chosen) {
    const m = MOODS.find((x) => x.value === chosen)!;
    return (
      <div
        className="flex flex-col min-h-screen items-center justify-center px-8 text-center"
        style={{ backgroundColor: '#fbf7f0' }}
      >
        <p style={{ fontSize: '100px', lineHeight: 1, marginBottom: '20px' }} aria-hidden>
          {m.emoji}
        </p>
        <h2 style={{ fontSize: '38px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2, marginBottom: '14px' }}>
          Thank you for sharing,<br />{patientName.split(' ')[0]}!
        </h2>
        <p style={{ fontSize: '22px', color: '#6b7280', marginBottom: '48px', lineHeight: 1.5 }}>
          It&apos;s good to know how you&apos;re feeling. 💛
        </p>

        <Link
          href="/patient"
          className="flex items-center gap-3 rounded-3xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform active:scale-95"
          style={{
            backgroundColor: '#5b8def',
            color: '#fff',
            fontSize: '24px',
            padding: '20px 40px',
          }}
        >
          <Home className="w-7 h-7" aria-hidden />
          Back Home
        </Link>
      </div>
    );
  }

  // ── Selection screen ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-screen px-6 pt-10 pb-32 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* Back */}
      <Link
        href="/patient"
        className="flex items-center gap-2 mb-8 self-start focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl px-1 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft style={{ width: '28px', height: '28px', color: '#5b8def' }} />
        <span style={{ fontSize: '20px', color: '#5b8def', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Heading */}
      <div className="text-center mb-10">
        <h1 style={{ fontSize: '40px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2, marginBottom: '10px' }}>
          How are you<br />feeling today?
        </h1>
        <p style={{ fontSize: '22px', color: '#9ca3af' }}>
          Tap the one that feels right
        </p>
      </div>

      {errMsg && (
        <p className="text-center mb-4" style={{ fontSize: '18px', color: '#b91c1c' }} role="alert">
          {errMsg}
        </p>
      )}

      {/* Mood buttons — 2×2 grid */}
      <div className="grid grid-cols-2 gap-5">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => handleMood(m.value)}
            disabled={saving}
            aria-label={`I feel ${m.label}`}
            aria-pressed={chosen === m.value}
            className={`flex flex-col items-center justify-center rounded-3xl transition-transform active:scale-95 focus:outline-none focus:ring-4 ${m.ring} disabled:opacity-60`}
            style={{
              backgroundColor: m.bg,
              minHeight: '160px',
              border: chosen === m.value ? '3px solid #5b8def' : '3px solid transparent',
            }}
          >
            <span style={{ fontSize: '64px', lineHeight: 1, marginBottom: '8px' }} aria-hidden>
              {m.emoji}
            </span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#2b2b3a' }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {saving && (
        <p className="text-center mt-8" style={{ fontSize: '20px', color: '#9ca3af' }}>
          Saving…
        </p>
      )}
    </div>
  );
}
