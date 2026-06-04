'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  url: string;
  personName: string;
}

export default function VoicePlayer({ url, personName }: Props) {
  const audioRef              = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    return () => {
      // Pause if component unmounts
      audioRef.current?.pause();
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setError(true));
      setPlaying(true);
    }
  }

  function handleEnded() {
    setPlaying(false);
  }

  if (error) {
    return (
      <div
        className="rounded-3xl px-6 py-5 flex items-center gap-4"
        style={{ backgroundColor: '#fee2e2' }}
      >
        <Volume2 className="w-8 h-8 shrink-0" style={{ color: '#dc2626' }} />
        <p style={{ fontSize: '20px', color: '#dc2626' }}>
          Voice note could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={url}
        onEnded={handleEnded}
        onError={() => setError(true)}
        preload="metadata"
      />

      {/* Large play/pause button */}
      <button
        type="button"
        onClick={toggle}
        className="w-full rounded-3xl flex items-center justify-center gap-4 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300"
        style={{
          backgroundColor: playing ? '#e5f5f0' : '#5cb89a',
          color:           playing ? '#2b5c4a' : '#ffffff',
          minHeight:       '80px',
          fontSize:        '24px',
          fontWeight:      700,
          border:          playing ? '3px solid #5cb89a' : 'none',
        }}
        aria-label={playing ? `Pause voice message from ${personName}` : `Play voice message from ${personName}`}
        aria-pressed={playing}
      >
        {playing
          ? <Pause  className="w-9 h-9 shrink-0" aria-hidden />
          : <Play   className="w-9 h-9 shrink-0" aria-hidden />
        }
        {playing ? 'Playing…' : `Hear ${personName}'s voice`}
      </button>

      {playing && (
        <p
          className="text-center mt-3"
          style={{ fontSize: '18px', color: '#5cb89a' }}
          aria-live="polite"
        >
          Tap again to stop
        </p>
      )}
    </div>
  );
}
