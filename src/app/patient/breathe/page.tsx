'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'done';

const CYCLES = 5;

// 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s, rest 1s
const PHASES: { phase: Phase; duration: number; label: string; color: string }[] = [
  { phase: 'inhale',  duration: 4, label: 'Breathe in…',    color: '#dbeafe' },
  { phase: 'hold',    duration: 7, label: 'Hold gently…',   color: '#fef9c3' },
  { phase: 'exhale',  duration: 8, label: 'Breathe out…',   color: '#dcfce7' },
  { phase: 'rest',    duration: 1, label: '',                color: '#f0ecfb' },
];

export default function BreathePage() {
  const [started,   setStarted]   = useState(false);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [cycle,     setCycle]     = useState(1);
  const [seconds,   setSeconds]   = useState(0);
  const [complete,  setComplete]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = PHASES[phaseIdx];

  useEffect(() => {
    if (!started || complete) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= current.duration) {
          // Advance phase
          const nextIdx = (phaseIdx + 1) % PHASES.length;
          const newCycle = nextIdx === 0 ? cycle + 1 : cycle;
          if (nextIdx === 0 && cycle >= CYCLES) {
            setComplete(true);
            return 0;
          }
          setPhaseIdx(nextIdx);
          setCycle(newCycle);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, complete, phaseIdx, cycle, current.duration]);

  const circleScale = current.phase === 'inhale'
    ? `scale(${0.7 + 0.3 * (seconds / current.duration)})`
    : current.phase === 'exhale'
    ? `scale(${1.0 - 0.3 * (seconds / current.duration)})`
    : current.phase === 'hold' ? 'scale(1)' : 'scale(0.7)';

  if (complete) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center"
        style={{ backgroundColor: '#fbf7f0', fontFamily: 'system-ui, sans-serif' }}
      >
        <p style={{ fontSize: '72px', marginBottom: '16px' }} aria-hidden>🌸</p>
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#2b2b3a', marginBottom: '10px' }}>
          Well done!
        </h2>
        <p style={{ fontSize: '22px', color: '#6b7280', marginBottom: '40px', lineHeight: 1.5 }}>
          You took {CYCLES} calm breaths.<br />
          You are doing great. 💚
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => { setStarted(false); setComplete(false); setPhaseIdx(0); setCycle(1); setSeconds(0); }}
            className="w-full rounded-3xl font-bold active:scale-95 transition-transform"
            style={{ backgroundColor: '#0891b2', color: '#fff', fontSize: '22px', minHeight: '68px', border: 'none', cursor: 'pointer' }}
          >
            Breathe again
          </button>
          <Link href="/patient"
            className="flex items-center justify-center w-full rounded-3xl font-semibold active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-gray-300"
            style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '20px', minHeight: '64px' }}
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-8 pb-8 max-w-lg mx-auto w-full items-center"
      style={{ backgroundColor: '#fbf7f0', fontFamily: 'system-ui, sans-serif' }}
    >
      <Link href="/patient"
        className="flex items-center gap-2 mb-6 self-start focus:outline-none focus:ring-4 focus:ring-cyan-300 rounded-xl px-1 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft style={{ width: '28px', height: '28px', color: '#0891b2' }} />
        <span style={{ fontSize: '20px', color: '#0891b2', fontWeight: 600 }}>Home</span>
      </Link>

      <h1 className="text-center font-bold mb-2" style={{ fontSize: '34px', color: '#2b2b3a' }}>
        Take a Breath
      </h1>
      <p className="text-center mb-8" style={{ fontSize: '18px', color: '#9ca3af' }}>
        {started ? `Breath ${cycle} of ${CYCLES}` : 'A gentle breathing exercise for you'}
      </p>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center mb-10"
        style={{ width: '260px', height: '260px' }}
      >
        {/* Outer glow ring */}
        <div
          style={{
            position: 'absolute',
            width: '260px', height: '260px',
            borderRadius: '50%',
            backgroundColor: started ? current.color : '#ecfeff',
            transition: 'background-color 1s ease, transform 1s ease',
            transform: started ? circleScale : 'scale(0.7)',
            opacity: 0.6,
          }}
        />
        {/* Inner circle */}
        <div
          style={{
            position: 'absolute',
            width: '180px', height: '180px',
            borderRadius: '50%',
            backgroundColor: started ? current.color : '#cffafe',
            transition: 'background-color 1s ease, transform 1s ease',
            transform: started ? circleScale : 'scale(0.7)',
          }}
        />
        {/* Center text */}
        <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
          {started && current.label ? (
            <>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#0e7490', marginBottom: '4px' }}>
                {current.label}
              </p>
              {current.phase !== 'rest' && (
                <p style={{ fontSize: '40px', fontWeight: 700, color: '#0891b2', lineHeight: 1 }}>
                  {current.duration - seconds}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '18px', color: '#0891b2', fontWeight: 600 }}>🌬️</p>
          )}
        </div>
      </div>

      {!started ? (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full max-w-xs rounded-3xl font-bold active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-cyan-300"
          style={{ backgroundColor: '#0891b2', color: '#fff', fontSize: '26px', minHeight: '80px', border: 'none', cursor: 'pointer' }}
        >
          Start breathing 🌬️
        </button>
      ) : (
        <p style={{ fontSize: '18px', color: '#9ca3af', textAlign: 'center' }}>
          Just follow the circle…<br />
          <span style={{ fontSize: '15px' }}>breathe in · hold · breathe out</span>
        </p>
      )}
    </div>
  );
}
