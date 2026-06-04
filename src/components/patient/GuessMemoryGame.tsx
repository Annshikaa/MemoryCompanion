'use client';

/**
 * GuessMemoryGame — gentle reminiscence photo game.
 *
 * Shows a photo from the family's memory library. Patient says whether
 * it brings back a memory. No wrong answers — always reveals the story.
 * Records each round in cognitive_activities (activity_type = 'guess_memory').
 */

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Home, Heart, RefreshCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

type MemItem = Tables<'reminiscence_items'>;
type Phase   = 'question' | 'revealed';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  items:    MemItem[];
  familyId: string;
}

export default function GuessMemoryGame({ items, familyId }: Props) {
  const supabase = createClient();

  const photoItems = items.filter((i) => i.kind === 'photo' && i.media_url);

  const [deck,       setDeck]       = useState<MemItem[]>(() => shuffle(photoItems));
  const [idx,        setIdx]        = useState(0);
  const [phase,      setPhase]      = useState<Phase>('question');
  const [remembered, setRemembered] = useState<boolean | null>(null);
  const [done,       setDone]       = useState(false);
  const [score,      setScore]      = useState(0);
  const [total,      setTotal]      = useState(0);

  const current = deck[idx];

  const logRound = useCallback(async (didRemember: boolean) => {
    if (!current) return;
    try {
      await supabase.from('cognitive_activities').insert({
        family_id:     familyId,
        activity_type: 'guess_memory',
        score:          didRemember ? 1 : 0,
        total:          1,
        result: {
          item_id:    current.id,
          item_title: current.title,
          remembered: didRemember,
        },
      });
    } catch { /* non-blocking */ }
  }, [current, familyId, supabase]);

  function handleAnswer(didRemember: boolean) {
    if (phase !== 'question') return;
    setRemembered(didRemember);
    setPhase('revealed');
    setTotal((t) => t + 1);
    if (didRemember) setScore((s) => s + 1);
    logRound(didRemember);
  }

  function nextCard() {
    if (idx >= deck.length - 1) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setPhase('question');
    setRemembered(null);
  }

  function playAgain() {
    setDeck(shuffle(photoItems));
    setIdx(0);
    setPhase('question');
    setRemembered(null);
    setDone(false);
    setScore(0);
    setTotal(0);
  }

  // ── No photos ────────────────────────────────────────────────────────────
  if (photoItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-8 text-center"
        style={{ backgroundColor: '#fbf7f0' }}
      >
        <p style={{ fontSize: '72px', marginBottom: '16px' }} aria-hidden>🖼️</p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', marginBottom: '10px' }}>
          No memory photos yet
        </h2>
        <p style={{ fontSize: '20px', color: '#9ca3af', marginBottom: '40px' }}>
          Ask your caregiver to add some photos to your memory library.
        </p>
        <Link
          href="/patient"
          className="flex items-center gap-3 rounded-3xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-300"
          style={{ backgroundColor: '#9b7fd4', color: '#fff', fontSize: '22px', padding: '18px 36px' }}
        >
          <Home className="w-6 h-6" aria-hidden /> Back Home
        </Link>
      </div>
    );
  }

  // ── Session complete ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 pb-8 text-center"
        style={{ backgroundColor: '#fbf7f0' }}
      >
        <p style={{ fontSize: '72px', marginBottom: '16px' }} aria-hidden>🌸</p>
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#2b2b3a', marginBottom: '8px' }}>
          Beautiful!
        </h2>
        <p style={{ fontSize: '22px', color: '#6b7280', marginBottom: '8px' }}>
          You went through all {deck.length} {deck.length === 1 ? 'memory' : 'memories'}.
        </p>
        {total > 0 && (
          <p style={{ fontSize: '20px', color: '#9b7fd4', fontWeight: 600, marginBottom: '40px' }}>
            {score} of {total} felt familiar 💜
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={playAgain}
            className="flex items-center justify-center gap-3 w-full rounded-3xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-300 active:scale-95 transition-transform"
            style={{ backgroundColor: '#9b7fd4', color: '#fff', fontSize: '22px', minHeight: '68px', border: 'none' }}
          >
            <RefreshCcw className="w-6 h-6" aria-hidden /> Play again
          </button>
          <Link
            href="/patient"
            className="flex items-center justify-center gap-3 w-full rounded-3xl font-semibold focus:outline-none focus:ring-4 focus:ring-gray-300 active:scale-95 transition-transform"
            style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '20px', minHeight: '64px' }}
          >
            <Home className="w-6 h-6" aria-hidden /> Done for now
          </Link>
        </div>
      </div>
    );
  }

  // ── Main game ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-8 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* Back */}
      <Link href="/patient"
        className="flex items-center gap-2 mb-5 self-start focus:outline-none focus:ring-4 focus:ring-purple-300 rounded-xl px-1 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft style={{ width: '28px', height: '28px', color: '#9b7fd4' }} />
        <span style={{ fontSize: '20px', color: '#9b7fd4', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: '16px', color: '#9ca3af' }}>
          Memory {idx + 1} of {deck.length}
        </p>
        {total > 0 && (
          <p style={{ fontSize: '16px', color: '#9b7fd4', fontWeight: 600 }}>
            {score} remembered 💜
          </p>
        )}
      </div>

      {/* Title */}
      <h1 className="text-center font-bold mb-5" style={{ fontSize: '32px', color: '#2b2b3a' }}>
        {phase === 'question' ? 'Does this look familiar?' : current.title}
      </h1>

      {/* Photo */}
      <div className="relative rounded-3xl overflow-hidden mx-auto mb-5"
        style={{ width: '100%', maxWidth: '340px', aspectRatio: '4/3' }}
      >
        <Image
          src={current.media_url!}
          alt={phase === 'question' ? 'A memory photo' : current.title}
          fill
          className="object-cover"
          sizes="340px"
          priority
        />
      </div>

      {/* Era hint */}
      {phase === 'question' && current.era_year && (
        <p className="text-center mb-4" style={{ fontSize: '18px', color: '#9ca3af' }}>
          📅 Around {current.era_year}
        </p>
      )}

      {/* Answer phase */}
      {phase === 'revealed' && (
        <div
          className="rounded-3xl px-5 py-5 mb-5 text-center"
          style={{ backgroundColor: remembered ? '#f0ecfb' : '#f0fdf4' }}
          role="status"
          aria-live="polite"
        >
          {remembered ? (
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#6b3fa0' }}>
              Wonderful — your memory is alive! 💜
            </p>
          ) : (
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#15803d' }}>
              That&apos;s okay — here&apos;s the story 💚
            </p>
          )}
          {current.description && (
            <p style={{ fontSize: '18px', color: '#4b5563', marginTop: '8px', lineHeight: 1.5 }}>
              {current.description}
            </p>
          )}
          {current.era_year && (
            <p style={{ fontSize: '16px', color: '#9ca3af', marginTop: '4px' }}>
              📅 {current.era_year}
            </p>
          )}
        </div>
      )}

      {/* Question buttons */}
      {phase === 'question' && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => handleAnswer(true)}
            className="w-full rounded-3xl font-bold flex items-center justify-center gap-3 focus:outline-none focus:ring-4 focus:ring-purple-300 active:scale-95 transition-transform"
            style={{ backgroundColor: '#9b7fd4', color: '#fff', fontSize: '24px', minHeight: '80px', border: 'none' }}
          >
            <Heart className="w-6 h-6" aria-hidden /> Yes, I remember!
          </button>
          <button
            type="button"
            onClick={() => handleAnswer(false)}
            className="w-full rounded-3xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 transition-transform"
            style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '22px', minHeight: '72px', border: 'none' }}
          >
            Tell me about this
          </button>
        </div>
      )}

      {/* Next button */}
      {phase === 'revealed' && (
        <button
          type="button"
          onClick={nextCard}
          className="w-full rounded-3xl font-bold mt-2 focus:outline-none focus:ring-4 focus:ring-purple-300 active:scale-95 transition-transform"
          style={{ backgroundColor: '#9b7fd4', color: '#fff', fontSize: '26px', minHeight: '72px', border: 'none' }}
        >
          Next memory →
        </button>
      )}
    </div>
  );
}
