'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSeverity } from '@/lib/alert-severity';
import { Phone } from 'lucide-react';

export default function SOSButton({ familyId }: { familyId: string }) {
  const supabase = createClient();
  const router   = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending,     setSending]     = useState(false);

  async function handleConfirm() {
    setSending(true);
    const now = new Date().toISOString();

    // Fire-and-forget: capture a fresh location ping immediately so the caregiver
    // sees a current position on the Emergency Mode screen.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase.from('location_pings').insert({
            family_id:   familyId,
            lat:         pos.coords.latitude,
            lng:         pos.coords.longitude,
            accuracy:    pos.coords.accuracy ?? null,
            inside_zone: null, // LocationTracker will compute this on next scheduled ping
          });
        },
        () => {}, // silent — location may not be available; SOS proceeds regardless
        { timeout: 5_000, maximumAge: 10_000 },
      );
    }

    await Promise.all([
      supabase.from('events_log').insert({
        family_id: familyId,
        type: 'sos',
        detail: { triggered_at: now },
      }),
      supabase.from('notifications').insert({
        family_id: familyId,
        type: 'sos',
        detail: { triggered_at: now },
        severity: getSeverity('sos'),
        status: 'new',
      }),
    ]);

    setConfirmOpen(false);
    setSending(false);
    router.push('/patient/sos');
  }

  return (
    <>
      {/* Floating SOS button — fixed bottom-right, always visible */}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="fixed bottom-6 right-4 z-40 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-300"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#dc2626',
          color: '#fff',
          border: '4px solid #fff',
          boxShadow: '0 4px 16px rgba(220,38,38,0.5)',
          cursor: 'pointer',
        }}
        aria-label="I need help — press for emergency"
      >
        <Phone className="w-7 h-7 mb-0.5" aria-hidden />
        <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>HELP</span>
      </button>

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
          style={{ background: 'rgba(43,43,58,0.7)' }}
        >
          <div
            className="absolute inset-0"
            onClick={() => !sending && setConfirmOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative w-full max-w-sm rounded-3xl p-6 text-center"
            style={{ background: '#fbf7f0' }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm help request"
          >
            <div style={{ fontSize: '56px', marginBottom: '8px' }} aria-hidden>🆘</div>
            <p style={{ fontSize: '30px', fontWeight: 700, color: '#2b2b3a', marginBottom: '6px' }}>
              Do you need help?
            </p>
            <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '24px' }}>
              Your caregiver will be notified right away.
            </p>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={sending}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '72px',
                background: sending ? '#f87171' : '#dc2626',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '26px',
                fontWeight: 700,
                border: 'none',
                marginBottom: '12px',
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
              aria-busy={sending}
            >
              {sending ? 'Sending…' : 'Yes, I need help'}
            </button>

            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '64px',
                background: '#f3f4f6',
                color: '#6b7280',
                borderRadius: '20px',
                fontSize: '22px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              I&apos;m okay, cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
