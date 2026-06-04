'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type SoundId = 'rain' | 'ocean' | 'forest' | 'bells';

interface Sound {
  id:    SoundId;
  label: string;
  emoji: string;
  desc:  string;
  bg:    string;
  activeBg: string;
}

const SOUNDS: Sound[] = [
  { id: 'rain',   label: 'Gentle Rain',   emoji: '🌧️', desc: 'Soft rain on leaves',       bg: 'linear-gradient(145deg,#e8f4f0,#d8ede8)', activeBg: 'linear-gradient(135deg,#2b5c4a,#3d7a6e)' },
  { id: 'ocean',  label: 'Ocean Waves',   emoji: '🌊', desc: 'Calm rolling waves',         bg: 'linear-gradient(145deg,#e8f0fd,#dce8fc)', activeBg: 'linear-gradient(135deg,#1d4ed8,#2563eb)' },
  { id: 'forest', label: 'Forest Birds',  emoji: '🦋', desc: 'Morning birds singing',      bg: 'linear-gradient(145deg,#dcfce7,#d0f7e1)', activeBg: 'linear-gradient(135deg,#16a34a,#15803d)' },
  { id: 'bells',  label: 'Singing Bowls', emoji: '🔔', desc: 'Tibetan meditation bells',   bg: 'linear-gradient(145deg,#fdf4ff,#f3e0ff)', activeBg: 'linear-gradient(135deg,#9333ea,#7c3aed)' },
];

// Generate calming audio using the Web Audio API
function createSound(ctx: AudioContext, type: SoundId): () => void {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.5);
  gainNode.connect(ctx.destination);

  const nodes: AudioNode[] = [gainNode];

  if (type === 'rain' || type === 'forest') {
    // Brown noise (rain / forest base)
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (type === 'rain' ? 0.015 : 0.025) * white) / 1.015;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type === 'rain' ? 'highpass' : 'lowpass';
    filter.frequency.value = type === 'rain' ? 400 : 800;
    src.connect(filter);
    filter.connect(gainNode);
    src.start();
    nodes.push(src, filter);

    if (type === 'forest') {
      // Add gentle bird chirp oscillators
      for (let i = 0; i < 3; i++) {
        const birdOsc = ctx.createOscillator();
        const birdGain = ctx.createGain();
        birdOsc.type = 'sine';
        birdOsc.frequency.setValueAtTime(2200 + i * 400, ctx.currentTime);
        birdGain.gain.setValueAtTime(0, ctx.currentTime);
        // Chirp every 3-8 seconds, staggered
        const chirpInterval = (3 + i * 2.5) * 1000;
        const chirp = () => {
          const now = ctx.currentTime;
          birdGain.gain.setValueAtTime(0, now);
          birdGain.gain.linearRampToValueAtTime(0.06, now + 0.05);
          birdGain.gain.setValueAtTime(0.06, now + 0.15);
          birdGain.gain.linearRampToValueAtTime(0, now + 0.3);
          birdOsc.frequency.setValueAtTime(2200 + i * 400 + Math.random() * 200, now);
        };
        const id = setInterval(chirp, chirpInterval);
        birdOsc.connect(birdGain);
        birdGain.connect(gainNode);
        birdOsc.start();
        nodes.push(birdOsc, birdGain);
        // Store interval id on node for cleanup
        (birdOsc as unknown as Record<string, unknown>).__interval = id;
      }
    }
  }

  if (type === 'ocean') {
    // Two low-frequency sine waves for waves
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const waveGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 0.08 + i * 0.04;
      waveGain.gain.value = 0.3;
      // White noise base
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const nd = noiseBuffer.getChannelData(0);
      for (let j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 250 + i * 80;
      filter.Q.value = 0.5;
      noiseSrc.connect(filter);
      // Amplitude modulate with the LFO
      osc.connect(waveGain.gain as unknown as AudioNode);
      filter.connect(waveGain);
      waveGain.connect(gainNode);
      noiseSrc.start();
      osc.start();
      nodes.push(osc, waveGain, noiseSrc, filter);
    }
  }

  if (type === 'bells') {
    // Tibetan bowl: decaying harmonics at regular intervals
    const playBowl = () => {
      const fundamentals = [196, 261, 329, 392];
      fundamentals.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, ctx.currentTime);
        env.gain.linearRampToValueAtTime(0.08 / (i + 1), ctx.currentTime + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
        osc.connect(env);
        env.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 4);
      });
    };
    playBowl();
    const id = setInterval(playBowl, 6000);
    // Store cleanup ref
    const dummy = ctx.createGain();
    (dummy as unknown as Record<string, unknown>).__interval = id;
    nodes.push(dummy);
  }

  // Return cleanup function
  return () => {
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          const interval = (n as unknown as Record<string, unknown>).__interval as ReturnType<typeof setInterval> | undefined;
          if (interval) clearInterval(interval);
          (n as AudioScheduledSourceNode).stop?.();
          n.disconnect();
        } catch { /* already stopped */ }
      });
    }, 1200);
  };
}

export default function SoundsPage() {
  const [playing, setPlaying]   = useState<SoundId | null>(null);
  const ctxRef    = useRef<AudioContext | null>(null);
  const stopRef   = useRef<(() => void) | null>(null);

  useEffect(() => () => { stopRef.current?.(); ctxRef.current?.close(); }, []);

  function toggle(id: SoundId) {
    if (playing === id) {
      // Stop
      stopRef.current?.();
      stopRef.current = null;
      setPlaying(null);
      return;
    }
    // Stop previous
    stopRef.current?.();
    stopRef.current = null;

    // Start new
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();

    const stop = createSound(ctxRef.current, id);
    stopRef.current = stop;
    setPlaying(id);
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ backgroundColor: '#fbf7f0' }}>

      {/* Header */}
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(180deg,#fff7ed 0%,#fbf7f0 100%)' }}
      >
        <Link href="/patient"
          className="flex items-center gap-2 mb-5 self-start focus:outline-none focus:ring-4 focus:ring-orange-300 rounded-xl px-1 py-1"
          aria-label="Back to home"
        >
          <ArrowLeft style={{ width: '26px', height: '26px', color: '#ea580c' }} />
          <span style={{ fontSize: '18px', color: '#ea580c', fontWeight: 600 }}>Home</span>
        </Link>

        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#1a2e24', lineHeight: 1.2 }}>
          Soothing Sounds 🎵
        </h1>
        <p style={{ fontSize: '18px', color: '#9ca3af', marginTop: '4px' }}>
          Tap a sound to calm your mind
        </p>
      </div>

      <div className="px-5 max-w-lg mx-auto w-full space-y-4 mt-2">

        {/* Now playing indicator */}
        {playing && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#fff7ed,#feecd0)', border: '1.5px solid rgba(234,88,12,0.2)' }}
            role="status"
            aria-live="polite"
          >
            <span className="w-3 h-3 rounded-full bg-orange-400 animate-pulse shrink-0" aria-hidden />
            <p style={{ fontSize: '18px', color: '#c2410c', fontWeight: 600 }}>
              {SOUNDS.find((s) => s.id === playing)?.emoji} {SOUNDS.find((s) => s.id === playing)?.label} — playing
            </p>
            <button
              type="button"
              onClick={() => toggle(playing)}
              className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              style={{ backgroundColor: '#ea580c', color: '#fff' }}
            >
              Stop
            </button>
          </div>
        )}

        {/* Sound cards */}
        <div className="grid grid-cols-2 gap-4">
          {SOUNDS.map((s) => {
            const isActive = playing === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={isActive}
                aria-label={`${isActive ? 'Stop' : 'Play'} ${s.label}`}
                className="flex flex-col items-center justify-center rounded-2xl px-4 py-6 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-300"
                style={{
                  background: isActive ? s.activeBg : s.bg,
                  minHeight: '150px',
                  border: isActive ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.6)',
                  boxShadow: isActive ? '0 6px 24px rgba(0,0,0,0.15)' : '0 2px 10px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{ fontSize: '44px', lineHeight: 1, marginBottom: '10px' }}
                  aria-hidden
                >
                  {s.emoji}
                </span>
                <p style={{ fontSize: '18px', fontWeight: 700, color: isActive ? '#fff' : '#1a2e24', textAlign: 'center', lineHeight: 1.25 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: '13px', color: isActive ? 'rgba(255,255,255,0.75)' : '#9ca3af', textAlign: 'center', marginTop: '3px' }}>
                  {isActive ? 'Tap to stop' : s.desc}
                </p>
                {isActive && (
                  <div className="flex gap-1 mt-3" aria-hidden>
                    {[0,1,2,3,4].map((i) => (
                      <div key={i} className="w-1 bg-white rounded-full animate-pulse"
                        style={{ height: `${10 + (i % 3) * 8}px`, animationDelay: `${i * 0.15}s`, opacity: 0.8 }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Breathing tip */}
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ background: 'linear-gradient(135deg,#f0ecfb,#fce7f3)', border: '1px solid rgba(155,127,212,0.15)' }}
        >
          <p style={{ fontSize: '17px', color: '#2b2b3a', fontWeight: 600 }}>
            💡 Try this
          </p>
          <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '4px', lineHeight: 1.5 }}>
            Close your eyes, breathe slowly, and just listen.<br />
            Even 2 minutes helps calm the mind.
          </p>
          <Link
            href="/patient/breathe"
            className="inline-block mt-3 px-4 py-2 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
            style={{ backgroundColor: '#9b7fd4', color: '#fff', fontSize: '15px' }}
          >
            Guided breathing →
          </Link>
        </div>

      </div>
    </div>
  );
}
