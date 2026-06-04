'use client';

/**
 * MemoriesPlayer — one item at a time, calm reminiscence experience.
 *
 * Shows a single reminiscence_item (photo / music / memory text) with
 * large Previous / Next buttons. For music items a custom audio player
 * with a big tap-friendly play/pause circle is rendered; audio stops
 * automatically when the patient navigates away.
 */

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

type Item = Tables<'reminiscence_items'>;

// ── Small reusable nav button ─────────────────────────────────────────────
function NavBtn({
  onClick, disabled, children, label,
}: { onClick: () => void; disabled: boolean; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center justify-center rounded-2xl transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-30"
      style={{ backgroundColor: '#e8e3f7', width: '72px', height: '72px' }}
    >
      {children}
    </button>
  );
}

// ── Audio player sub-component ────────────────────────────────────────────
function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pct,     setPct]     = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setPct((el.currentTime / el.duration) * 100);
    };
    const onEnd  = () => { setPlaying(false); setPct(0); };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.pause();
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, [src]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else         { el.play().catch(() => {}); setPlaying(true); }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Hidden native audio — avoids in-browser controls */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Big play/pause circle */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : `Play ${title}`}
        className="flex items-center justify-center rounded-full shadow-md transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300"
        style={{
          width: '120px', height: '120px',
          backgroundColor: '#9b7fd4',
        }}
      >
        {playing
          ? <Pause  className="w-12 h-12 text-white" aria-hidden />
          : <Play   className="w-12 h-12 text-white" aria-hidden />
        }
      </button>

      {/* Progress bar */}
      <div
        className="w-full max-w-xs rounded-full overflow-hidden"
        style={{ backgroundColor: '#e8e3f7', height: '8px' }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{ width: `${pct}%`, backgroundColor: '#9b7fd4', height: '100%', transition: 'width 0.5s linear' }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function MemoriesPlayer({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6">
        <p className="text-6xl mb-4" aria-hidden>📷</p>
        <p style={{ fontSize: '26px', fontWeight: 600, color: '#2b2b3a' }}>
          No memories yet
        </p>
        <p className="mt-2" style={{ fontSize: '20px', color: '#9ca3af' }}>
          Your caregiver will add photos and stories here.
        </p>
      </div>
    );
  }

  const item    = items[idx];
  const isFirst = idx === 0;
  const isLast  = idx === items.length - 1;

  function prev() { setIdx((i) => Math.max(0, i - 1)); }
  function next() { setIdx((i) => Math.min(items.length - 1, i + 1)); }

  const yearLabel = item.era_year ? ` · ${item.era_year}` : '';
  const kindEmoji: Record<string, string> = { photo: '📷', music: '🎵', memory: '💭' };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-6 max-w-lg mx-auto w-full">
      {/* Back */}
      <Link
        href="/patient"
        className="flex items-center gap-2 mb-6 self-start focus:outline-none focus:ring-4 focus:ring-purple-300 rounded-xl px-1 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft style={{ width: '28px', height: '28px', color: '#9b7fd4' }} />
        <span style={{ fontSize: '20px', color: '#9b7fd4', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Title */}
      <h1
        className="text-center font-bold mb-1"
        style={{ fontSize: '36px', color: '#2b2b3a' }}
      >
        Remember When
      </h1>

      {/* Counter */}
      <p className="text-center mb-6" style={{ fontSize: '18px', color: '#9ca3af' }}>
        {idx + 1} of {items.length}
      </p>

      {/* Item card */}
      <div
        className="rounded-3xl overflow-hidden flex-1"
        style={{ backgroundColor: '#f0ecfb' }}
      >
        {/* Photo */}
        {item.kind === 'photo' && item.media_url && (
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <Image
              src={item.media_url}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
              priority
            />
          </div>
        )}

        {/* Music player */}
        {item.kind === 'music' && item.media_url && (
          <AudioPlayer src={item.media_url} title={item.title} />
        )}

        {/* Memory icon (no media) */}
        {(item.kind === 'memory' || (item.media_url === null && item.kind !== 'music')) && (
          <div className="flex items-center justify-center py-10">
            <span style={{ fontSize: '80px' }} aria-hidden>
              {kindEmoji[item.kind] ?? '💭'}
            </span>
          </div>
        )}

        {/* Text content */}
        <div className="px-6 py-5">
          <p style={{ fontSize: '15px', color: '#9b7fd4', fontWeight: 600, marginBottom: '6px' }}>
            {kindEmoji[item.kind] ?? '💭'} {item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}
            {yearLabel}
          </p>

          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2, marginBottom: '10px' }}>
            {item.title}
          </h2>

          {item.description && (
            <p style={{ fontSize: '21px', color: '#4b5563', lineHeight: 1.5, marginBottom: '14px' }}>
              {item.description}
            </p>
          )}

          {item.prompt && (
            <div
              className="rounded-2xl px-5 py-4"
              style={{ backgroundColor: '#e8e3f7' }}
            >
              <p style={{ fontSize: '20px', color: '#5b4a94', fontStyle: 'italic', lineHeight: 1.5 }}>
                💬 {item.prompt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 px-2">
        <NavBtn onClick={prev} disabled={isFirst} label="Previous memory">
          <ChevronLeft style={{ width: '36px', height: '36px', color: '#5b4a94' }} />
        </NavBtn>

        {/* Dot indicators (up to 9) */}
        <div className="flex gap-2">
          {items.slice(0, 9).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Memory ${i + 1}`}
              style={{
                width: '10px', height: '10px',
                borderRadius: '50%',
                backgroundColor: i === idx ? '#9b7fd4' : '#d8d0f0',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            />
          ))}
          {items.length > 9 && (
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>…</span>
          )}
        </div>

        <NavBtn onClick={next} disabled={isLast} label="Next memory">
          <ChevronRight style={{ width: '36px', height: '36px', color: '#5b4a94' }} />
        </NavBtn>
      </div>
    </div>
  );
}
