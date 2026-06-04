'use client';

/**
 * MemoryGame — gentle "Who is this?" family recognition game.
 *
 * Rules for the patient experience:
 *  - No timers. No failure states. No score pressure.
 *  - If the patient picks the correct person: warm green praise.
 *  - If the patient picks wrong: gentle blue correction ("That's [name]!").
 *  - Either way, the answer is shown — it's recall practice, not a test.
 *  - "Next" button to continue at their own pace.
 *  - Records each completed round in cognitive_activities.
 *
 * Edge cases handled:
 *  - 0 people: "Ask your caregiver to add family members."
 *  - 1 person: recognition mode — "Do you know this person?" reveal.
 *  - 2+ people: multiple-choice quiz (2–3 options, shuffled).
 */

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

type Person  = Tables<'people'>;
type Phase   = 'question' | 'answer';

// Fisher-Yates shuffle (returns a new array)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick a new subject + distractors
function buildRound(people: Person[], exclude?: string): { subject: Person; choices: Person[] } {
  const pool    = people.filter((p) => p.id !== exclude);
  const subjectPool = pool.length > 0 ? pool : people;
  const subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];

  if (people.length < 2) return { subject, choices: [] };

  const others   = shuffle(people.filter((p) => p.id !== subject.id));
  const numFoils = Math.min(2, others.length);
  const choices  = shuffle([subject, ...others.slice(0, numFoils)]);
  return { subject, choices };
}

interface Props {
  people:   Person[];
  familyId: string;
}

export default function MemoryGame({ people, familyId }: Props) {
  const supabase  = createClient();

  const [round,       setRound]       = useState(() => buildRound(people));
  const [phase,       setPhase]       = useState<Phase>('question');
  const [picked,      setPicked]      = useState<Person | null>(null);
  const [roundsDone,  setRoundsDone]  = useState(0);
  const [score,       setScore]       = useState(0);
  const [revealed,    setRevealed]    = useState(false); // for single-person mode
  const [saving,      setSaving]      = useState(false);

  const { subject, choices } = round;
  const isCorrect = picked?.id === subject.id;

  const saveRound = useCallback(async (correct: boolean) => {
    setSaving(true);
    try {
      await supabase.from('cognitive_activities').insert({
        family_id:     familyId,
        activity_type: 'who_is_this',
        score:          correct ? 1 : 0,
        total:          1,
        result: {
          subject_id:   subject.id,
          subject_name: subject.name,
          correct,
        },
      });
    } catch (err) {
      console.error('[MemoryGame] save error:', err);
    } finally {
      setSaving(false);
    }
  }, [familyId, subject, supabase]);

  function handleChoice(person: Person) {
    if (phase !== 'question') return;
    setPicked(person);
    setPhase('answer');
    const correct = person.id === subject.id;
    if (correct) setScore((s) => s + 1);
    setRoundsDone((r) => r + 1);
    saveRound(correct);
  }

  function handleReveal() {
    setRevealed(true);
    setPhase('answer');
    setRoundsDone((r) => r + 1);
    saveRound(true); // recognition mode counts as success
  }

  function nextRound() {
    setRound(buildRound(people, subject.id));
    setPhase('question');
    setPicked(null);
    setRevealed(false);
  }

  // ── No people ────────────────────────────────────────────────────────────
  if (people.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center"
        style={{ backgroundColor: '#fbf7f0' }}
      >
        <p style={{ fontSize: '80px', marginBottom: '20px' }} aria-hidden>👨‍👩‍👧</p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', marginBottom: '12px' }}>
          No family members yet
        </h2>
        <p style={{ fontSize: '20px', color: '#9ca3af', marginBottom: '40px' }}>
          Ask your caregiver to add family members first.
        </p>
        <Link
          href="/patient"
          className="flex items-center gap-3 rounded-3xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{ backgroundColor: '#5b8def', color: '#fff', fontSize: '22px', padding: '18px 36px' }}
        >
          <Home className="w-6 h-6" aria-hidden /> Back Home
        </Link>
      </div>
    );
  }

  // ── Photo to display (with fallback initial) ──────────────────────────────
  const photoEl = subject.photo_url ? (
    <div className="relative rounded-3xl overflow-hidden mx-auto"
      style={{ width: '240px', height: '240px' }}
    >
      <Image
        src={subject.photo_url}
        alt="Who is this?"
        fill
        className="object-cover"
        sizes="240px"
        priority
      />
    </div>
  ) : (
    <div
      className="flex items-center justify-center rounded-3xl mx-auto"
      style={{ width: '240px', height: '240px', backgroundColor: '#e8f0fd' }}
      aria-hidden
    >
      <span style={{ fontSize: '96px', color: '#5b8def', fontWeight: 700 }}>
        {subject.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );

  // ── Single-person recognition mode ───────────────────────────────────────
  if (people.length === 1) {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-10 pb-8 max-w-lg mx-auto w-full"
        style={{ backgroundColor: '#fbf7f0' }}
      >
        <Link href="/patient"
          className="flex items-center gap-2 mb-8 self-start focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl px-1 py-1"
          aria-label="Back to home"
        >
          <ArrowLeft style={{ width: '28px', height: '28px', color: '#5b8def' }} />
          <span style={{ fontSize: '20px', color: '#5b8def', fontWeight: 600 }}>Home</span>
        </Link>

        <h1 className="text-center font-bold mb-8" style={{ fontSize: '36px', color: '#2b2b3a' }}>
          Who is this?
        </h1>

        {photoEl}

        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="w-full rounded-3xl font-bold mt-8 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-transform"
            style={{ backgroundColor: '#5b8def', color: '#fff', fontSize: '26px', minHeight: '72px', border: 'none' }}
          >
            I remember — show me!
          </button>
        ) : (
          <div className="text-center mt-8 rounded-3xl px-6 py-6" style={{ backgroundColor: '#dcfce7' }}>
            <p style={{ fontSize: '24px', color: '#15803d', fontWeight: 700 }}>
              That&apos;s {subject.name}! 💚
            </p>
            <p style={{ fontSize: '20px', color: '#166534', marginTop: '6px' }}>
              Your {subject.relationship}
            </p>
            <button
              type="button"
              onClick={nextRound}
              className="w-full rounded-3xl font-bold mt-6 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-transform"
              style={{ backgroundColor: '#5b8def', color: '#fff', fontSize: '24px', minHeight: '68px', border: 'none' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Multiple-choice mode ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      <Link href="/patient"
        className="flex items-center gap-2 mb-6 self-start focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl px-1 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft style={{ width: '28px', height: '28px', color: '#5b8def' }} />
        <span style={{ fontSize: '20px', color: '#5b8def', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Score strip */}
      {roundsDone > 0 && (
        <p className="text-center mb-3" style={{ fontSize: '18px', color: '#9ca3af' }}>
          {score} of {roundsDone} correct so far 🌟
        </p>
      )}

      <h1 className="text-center font-bold mb-6" style={{ fontSize: '36px', color: '#2b2b3a' }}>
        Who is this?
      </h1>

      {/* Photo */}
      {photoEl}

      {/* Answer feedback */}
      {phase === 'answer' && (
        <div
          className="text-center mt-6 rounded-3xl px-6 py-5"
          style={{ backgroundColor: isCorrect ? '#dcfce7' : '#dbeafe' }}
          role="status"
          aria-live="polite"
        >
          {isCorrect ? (
            <>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                That&apos;s right! 🌟
              </p>
              <p style={{ fontSize: '20px', color: '#166534', marginTop: '4px' }}>
                {subject.name} — your {subject.relationship}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1d4ed8' }}>
                That&apos;s {subject.name} 💙
              </p>
              <p style={{ fontSize: '20px', color: '#1e40af', marginTop: '4px' }}>
                Your {subject.relationship} — it&apos;s okay!
              </p>
            </>
          )}
        </div>
      )}

      {/* Choices */}
      {phase === 'question' && (
        <div className="flex flex-col gap-4 mt-6">
          {choices.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => handleChoice(person)}
              className="w-full rounded-3xl font-bold text-left px-6 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-transform"
              style={{
                backgroundColor: '#e8f0fd',
                color: '#2b2b3a',
                fontSize: '26px',
                minHeight: '80px',
                border: 'none',
              }}
            >
              {person.name}
            </button>
          ))}
        </div>
      )}

      {/* Next button */}
      {phase === 'answer' && (
        <button
          type="button"
          onClick={nextRound}
          disabled={saving}
          className="w-full rounded-3xl font-bold mt-6 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-transform disabled:opacity-60"
          style={{
            backgroundColor: '#5b8def',
            color: '#fff',
            fontSize: '26px',
            minHeight: '72px',
            border: 'none',
          }}
        >
          {saving ? 'Saving…' : 'Next →'}
        </button>
      )}

      {/* Home shortcut at bottom */}
      {phase === 'answer' && (
        <Link
          href="/patient"
          className="flex items-center justify-center gap-2 mt-4 rounded-3xl font-semibold focus:outline-none focus:ring-4 focus:ring-gray-300"
          style={{
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '22px',
            minHeight: '64px',
          }}
        >
          <Home className="w-6 h-6" aria-hidden /> Done for now
        </Link>
      )}
    </div>
  );
}
