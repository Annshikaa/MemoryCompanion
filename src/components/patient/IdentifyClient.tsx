'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, RefreshCw, ArrowLeft } from 'lucide-react';

type Phase = 'intro' | 'camera' | 'thinking' | 'result' | 'error';

interface IdentifyResult {
  match:         boolean;
  confidence:    'high' | 'medium' | 'low';
  name?:         string;
  relationship?: string;
  reason?:       string;
  error?:        string;
}

export default function IdentifyClient() {
  const [phase,    setPhase]    = useState<Phase>('intro');
  const [result,   setResult]   = useState<IdentifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── FIX: attach stream AFTER the video element is in the DOM ──────────────
  // The video is conditionally rendered, so videoRef.current is null when
  // openCamera() runs. We wait for phase === 'camera' (which triggers a
  // re-render that mounts the video), then set srcObject and call play().
  useEffect(() => {
    if (phase !== 'camera') return;
    const video  = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch((err: unknown) => {
      console.error('[IdentifyClient] video.play() failed:', err);
    });
  }, [phase]);

  // Release camera on unmount (navigating away, Back link, etc.)
  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    // Detach srcObject so the browser turns off the camera indicator
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function openCamera() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // front camera; works on desktop + mobile
        audio: false,                  // never request mic on this page
      });
      streamRef.current = stream;
      setPhase('camera'); // render the <video> element, then the useEffect above fires
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      let msg: string;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = 'No camera was found on this device.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = 'The camera is in use by another app or tab. Close it and try again.';
      } else if (name === 'OverconstrainedError') {
        msg = 'The camera could not start with the requested settings. Please try again.';
      } else {
        msg = 'Could not start the camera. Please try again.';
      }
      setErrorMsg(msg);
      setPhase('error');
    }
  }

  async function capture() {
    const video = videoRef.current;

    // readyState 2 = HAVE_CURRENT_DATA — a frame is available to draw
    if (!video || video.readyState < 2) {
      setErrorMsg('The camera is still starting up. Please wait a moment and try again.');
      setPhase('error');
      return;
    }

    setPhase('thinking');

    // Draw current frame to an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    // Stop the stream immediately — frame is now in canvas RAM, camera released
    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setErrorMsg('Could not capture the image. Please try again.');
        setPhase('error');
        return;
      }

      try {
        const form = new FormData();
        form.set('image', blob, 'frame.jpg');

        const res  = await fetch('/api/faces/identify', { method: 'POST', body: form });
        const data: IdentifyResult = await res.json();

        if (!res.ok) {
          // 503 means the face service isn't configured / not running — show a
          // patient-friendly message instead of a technical error string.
          const msg = res.status === 503
            ? 'This feature is not ready yet. Please ask your caregiver to set it up.'
            : (data.error ?? 'Something went wrong. Please try again.');
          setErrorMsg(msg);
          setPhase('error');
          return;
        }

        setResult(data);
        setPhase('result');
      } catch {
        setErrorMsg('Network error. Please try again.');
        setPhase('error');
      }
    }, 'image/jpeg', 0.9);
  }

  function reset() {
    stopCamera();
    setResult(null);
    setErrorMsg(null);
    setPhase('intro');
  }

  return (
    <div
      className="flex flex-col min-h-screen px-6 pt-10 pb-24 max-w-lg mx-auto w-full"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      {/* Back — stopCamera so the camera indicator turns off immediately */}
      <Link
        href="/patient"
        onClick={stopCamera}
        className="flex items-center gap-2 mb-8 self-start rounded-xl px-2 py-1 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-6 h-6" style={{ color: '#5b8def' }} />
        <span style={{ fontSize: '18px', color: '#5b8def', fontWeight: 600 }}>Home</span>
      </Link>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2 }}>
          Who is this?
        </h1>
        <p style={{ fontSize: '20px', color: '#6b7280', marginTop: '8px' }}>
          Point at someone and take a photo to find out.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">

        {/* ── Intro ── */}
        {phase === 'intro' && (
          <button
            onClick={openCamera}
            className="flex flex-col items-center justify-center rounded-full focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform active:scale-95"
            style={{ width: '160px', height: '160px', backgroundColor: '#e8f0fd' }}
            aria-label="Open camera"
          >
            <Camera style={{ width: '60px', height: '60px', color: '#5b8def' }} />
            <span style={{ fontSize: '18px', color: '#5b8def', fontWeight: 600, marginTop: '8px' }}>
              Open camera
            </span>
          </button>
        )}

        {/* ── Live camera ── */}
        {phase === 'camera' && (
          <div className="w-full space-y-4">
            <div
              className="w-full rounded-3xl overflow-hidden"
              style={{ aspectRatio: '4/3', backgroundColor: '#1a1a2e', position: 'relative' }}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',   // removes bottom gap from inline display
                }}
              />
            </div>

            <button
              onClick={capture}
              className="w-full rounded-3xl transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{
                minHeight: '80px',
                backgroundColor: '#5b8def',
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Take photo to identify"
            >
              📸 Take photo
            </button>

            <button
              onClick={reset}
              className="w-full rounded-3xl focus:outline-none focus:ring-4 focus:ring-gray-300"
              style={{
                minHeight: '64px',
                backgroundColor: '#f3f4f6',
                fontSize: '18px',
                fontWeight: 600,
                color: '#6b7280',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Thinking ── */}
        {phase === 'thinking' && (
          <div className="text-center space-y-3">
            <p style={{ fontSize: '26px', fontWeight: 600, color: '#2b5c4a' }}>Checking…</p>
            <p style={{ fontSize: '18px', color: '#6b7280' }}>One moment, please.</p>
          </div>
        )}

        {/* ── Result ── */}
        {phase === 'result' && result && (
          <div className="w-full space-y-4">
            {result.match && result.confidence === 'high' ? (
              <div className="rounded-3xl px-6 py-7 text-center" style={{ backgroundColor: '#e5f5f0' }}>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.4 }}>
                  I think this is{' '}
                  <span style={{ color: '#2b5c4a' }}>{result.name}</span>,{' '}
                  your {result.relationship?.toLowerCase()}.
                </p>
                <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '12px' }}>
                  If you're not sure, ask your caregiver.
                </p>
              </div>
            ) : result.match && result.confidence === 'medium' ? (
              <div className="rounded-3xl px-6 py-7 text-center" style={{ backgroundColor: '#fef9c3' }}>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.4 }}>
                  This might be{' '}
                  <span style={{ color: '#854d0e' }}>{result.name}</span>,{' '}
                  your {result.relationship?.toLowerCase()}.
                </p>
                <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '12px' }}>
                  I'm not completely sure — let's check with your caregiver.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl px-6 py-7 text-center" style={{ backgroundColor: '#e8f0fd' }}>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.4 }}>
                  I'm not sure who this is.
                </p>
                <p style={{ fontSize: '20px', color: '#6b7280', marginTop: '8px' }}>
                  Let's ask someone you know.
                </p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full rounded-3xl flex items-center justify-center gap-3 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{
                minHeight: '72px',
                backgroundColor: '#5b8def',
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-6 h-6" />
              Try again
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="w-full space-y-4">
            <div className="rounded-3xl px-6 py-6 text-center" style={{ backgroundColor: '#fef2f2' }}>
              <p style={{ fontSize: '22px', fontWeight: 600, color: '#b91c1c', lineHeight: 1.5 }}>
                {errorMsg ?? 'Something went wrong.'}
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-300"
              style={{
                minHeight: '72px',
                backgroundColor: '#5b8def',
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
