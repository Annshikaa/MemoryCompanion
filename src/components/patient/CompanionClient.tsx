'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { CompanionResponse } from '@/lib/ai-types';

// ── SpeechRecognition type shim ────────────────────────────────────────────
// Not in the default lib.dom types; declare here rather than using `any`.

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:  ((e: SpeechRecognitionEvent) => void) | null;
  onerror:   ((e: Event) => void) | null;
  onend:     (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition:        new () => SpeechRecognitionInstance;
    webkitSpeechRecognition:  new () => SpeechRecognitionInstance;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

type Phase = 'idle' | 'listening' | 'thinking' | 'answer' | 'error';

interface Message {
  question: string;
  answer:   string;
  deferred: boolean;
}

export default function CompanionClient({ patientName }: { patientName: string }) {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [textInput, setTextInput]   = useState('');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage]       = useState<Message | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening]   = useState(false);

  const recognitionRef  = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef   = useRef('');

  // ── Detect speech support ────────────────────────────────────────────────
  useEffect(() => {
    const SR = typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
      : null;
    setSpeechSupported(SR !== null);
  }, []);

  // ── Ask the companion ─────────────────────────────────────────────────────
  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;
    setPhase('thinking');
    setErrorMsg(null);
    setMessage(null);
    setTranscript('');
    setTextInput('');

    try {
      const res = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data: CompanionResponse & { error?: string } = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setPhase('error');
        return;
      }

      setMessage({ question: q, answer: data.answer, deferred: data.deferred });
      setPhase('answer');

      // Read aloud automatically
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance(data.answer);
        utt.rate  = 0.9;
        utt.pitch = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setPhase('error');
    }
  }, []);

  // ── Mic toggle ────────────────────────────────────────────────────────────
  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      const t = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      transcriptRef.current = t;
      setTranscript(t);
    };

    rec.onerror = () => {
      setListening(false);
      setPhase('idle');
    };

    rec.onend = () => {
      setListening(false);
      const final = transcriptRef.current;
      transcriptRef.current = '';
      if (final.trim()) ask(final);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setPhase('listening');
    setTranscript('');
  }

  // Stop mic when unmounting
  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  // ── Read answer aloud on demand ───────────────────────────────────────────
  function readAloud() {
    if (!message || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(message.answer);
    utt.rate  = 0.9;
    window.speechSynthesis.speak(utt);
  }

  // ── Submit text input ─────────────────────────────────────────────────────
  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(textInput);
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-screen px-6 pt-10 pb-24 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* Back link */}
      <Link
        href="/patient"
        className="flex items-center gap-2 mb-8 self-start focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-xl px-2 py-1"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-6 h-6" style={{ color: '#5b8def' }} />
        <span style={{ fontSize: '18px', color: '#5b8def', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Greeting */}
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2 }}>
          Talk to Me
        </h1>
        <p style={{ fontSize: '20px', color: '#6b7280', marginTop: '8px' }}>
          Ask me anything, {patientName.split(' ')[0]}.
        </p>
      </div>

      {/* Main interaction area */}
      <div className="flex-1 flex flex-col items-center gap-6">

        {/* Phase: listening */}
        {phase === 'listening' && (
          <div
            className="w-full rounded-3xl p-6 text-center"
            style={{ backgroundColor: '#e8f0fd' }}
          >
            <p style={{ fontSize: '22px', color: '#5b8def', fontWeight: 600 }}>Listening…</p>
            {transcript && (
              <p style={{ fontSize: '18px', color: '#2b2b3a', marginTop: '8px' }}>
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* Phase: thinking */}
        {phase === 'thinking' && (
          <div
            className="w-full rounded-3xl p-6 text-center"
            style={{ backgroundColor: '#e5f5f0' }}
          >
            <p style={{ fontSize: '22px', color: '#2b5c4a', fontWeight: 600 }}>Thinking…</p>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '4px' }}>One moment, please.</p>
          </div>
        )}

        {/* Phase: answer */}
        {phase === 'answer' && message && (
          <div className="w-full space-y-3">
            <div
              className="w-full rounded-3xl p-5"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <p style={{ fontSize: '16px', color: '#9ca3af' }}>You asked:</p>
              <p style={{ fontSize: '20px', color: '#2b2b3a', fontWeight: 600, marginTop: '2px' }}>
                "{message.question}"
              </p>
            </div>
            <div
              className="w-full rounded-3xl p-5"
              style={{ backgroundColor: message.deferred ? '#fef9c3' : '#e5f5f0' }}
            >
              <p style={{ fontSize: '24px', color: '#2b2b3a', lineHeight: 1.5, fontWeight: 500 }}>
                {message.answer}
              </p>
            </div>
            <button
              onClick={readAloud}
              className="flex items-center gap-2 mx-auto rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{ backgroundColor: '#e8f0fd', fontSize: '18px', color: '#5b8def', fontWeight: 600 }}
              aria-label="Read answer aloud"
            >
              <Volume2 className="w-5 h-5" />
              Read aloud
            </button>
            <button
              onClick={() => { setPhase('idle'); setMessage(null); }}
              className="block mx-auto rounded-2xl px-6 py-3 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{ backgroundColor: '#f3f4f6', fontSize: '18px', color: '#6b7280', fontWeight: 600 }}
            >
              Ask another question
            </button>
          </div>
        )}

        {/* Phase: error */}
        {phase === 'error' && (
          <div className="w-full space-y-3">
            <div
              className="w-full rounded-3xl p-5 text-center"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <p style={{ fontSize: '20px', color: '#b91c1c', fontWeight: 600 }}>
                {errorMsg ?? 'Something went wrong.'}
              </p>
            </div>
            <button
              onClick={() => setPhase('idle')}
              className="block mx-auto rounded-2xl px-6 py-3 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{ backgroundColor: '#f3f4f6', fontSize: '18px', color: '#6b7280', fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Idle state: mic + text input */}
        {(phase === 'idle') && (
          <div className="w-full space-y-6">
            {/* Big mic button */}
            {speechSupported && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={toggleMic}
                  aria-label={listening ? 'Stop listening' : 'Start talking'}
                  className="rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform active:scale-95"
                  style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: listening ? '#5b8def' : '#e8f0fd',
                  }}
                >
                  {listening
                    ? <MicOff className="w-14 h-14 text-white" />
                    : <Mic   className="w-14 h-14" style={{ color: '#5b8def' }} />
                  }
                </button>
                <p style={{ fontSize: '20px', color: '#6b7280' }}>
                  {listening ? 'Tap to stop' : 'Tap to speak'}
                </p>
              </div>
            )}

            {/* Divider */}
            {speechSupported && (
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t" style={{ borderColor: '#e5e7eb' }} />
                <p style={{ fontSize: '16px', color: '#9ca3af' }}>or type below</p>
                <div className="flex-1 border-t" style={{ borderColor: '#e5e7eb' }} />
              </div>
            )}

            {/* Text input fallback */}
            <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your question here…"
                rows={3}
                className="w-full rounded-3xl border-2 px-5 py-4 resize-none focus:outline-none focus:ring-4 focus:ring-blue-300"
                style={{
                  fontSize: '20px',
                  borderColor: '#d1d5db',
                  backgroundColor: 'white',
                  color: '#2b2b3a',
                }}
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="w-full rounded-3xl py-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors active:scale-95"
                style={{ fontSize: '22px', backgroundColor: '#5b8def', color: 'white' }}
              >
                Ask
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
