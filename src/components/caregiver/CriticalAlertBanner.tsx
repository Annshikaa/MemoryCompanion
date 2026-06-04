'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { getSeverity, getAlertDescription, ALERT_TYPE_LABEL } from '@/lib/alert-severity';
import { X, PhoneCall } from 'lucide-react';

type Alert = Tables<'notifications'>;

interface Props {
  initialCritical: Alert[];
  familyId: string;
}

export default function CriticalAlertBanner({ initialCritical, familyId }: Props) {
  const supabase = createClient();
  const [alerts,    setAlerts]    = useState<Alert[]>(
    initialCritical.filter((a) => a.status !== 'resolved'),
  );
  const [loading,   setLoading]   = useState<Record<string, boolean>>({});
  // SOS overlay: show the most recent unacknowledged SOS as a modal
  const [sosOverlay, setSosOverlay] = useState<Alert | null>(() => {
    const sos = initialCritical.find((a) => a.type === 'sos' && a.status === 'new');
    return sos ?? null;
  });

  useEffect(() => {
    const channel = supabase
      .channel(`critical-banner-${familyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => {
        const incoming = payload.new as Alert;
        const sev = incoming.severity ?? getSeverity(incoming.type);
        if (sev === 'critical' && incoming.status !== 'resolved') {
          setAlerts((prev) => [incoming, ...prev]);
          // Pop the SOS overlay immediately
          if (incoming.type === 'sos') {
            setSosOverlay(incoming);
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => {
        const updated = payload.new as Alert;
        if (updated.status === 'resolved' || updated.status === 'acknowledged') {
          setAlerts((prev) => prev.filter((a) => a.id !== updated.id));
          setSosOverlay((prev) => (prev?.id === updated.id ? null : prev));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  async function acknowledge(alertId: string) {
    setLoading((prev) => ({ ...prev, [alertId]: true }));
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setSosOverlay((prev) => (prev?.id === alertId ? null : prev));
    } finally {
      setLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  }

  return (
    <>
      {/* ── SOS full-screen overlay ─────────────────────────────────────────── */}
      {sosOverlay && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          role="alertdialog"
          aria-modal="true"
          aria-label="Emergency SOS received"
        >
          <div
            className="relative w-full max-w-sm rounded-3xl p-7 text-center shadow-2xl"
            style={{ backgroundColor: '#fff' }}
          >
            {/* Dismiss X */}
            <button
              type="button"
              onClick={() => setSosOverlay(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
              aria-label="Dismiss overlay"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Pulsing icon */}
            <div className="flex items-center justify-center mb-4">
              <span
                className="text-6xl animate-bounce"
                aria-hidden
              >
                🆘
              </span>
            </div>

            <p className="font-semibold text-xl text-red-600 mb-1">Help Requested!</p>
            <p className="text-gray-600 text-base mb-6 leading-relaxed">
              Your patient pressed the help button.<br />
              <span className="text-sm text-gray-400">
                {new Date(sosOverlay.created_at).toLocaleTimeString()}
              </span>
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href={`/caregiver/emergency/${sosOverlay.id}`}
                className="flex items-center justify-center gap-2 w-full rounded-2xl font-bold text-white text-lg py-4 transition-all animate-pulse hover:animate-none"
                style={{ backgroundColor: '#dc2626' }}
                onClick={() => setSosOverlay(null)}
              >
                <PhoneCall className="w-5 h-5" aria-hidden />
                Open Emergency Mode →
              </Link>

              <button
                type="button"
                onClick={() => acknowledge(sosOverlay.id)}
                disabled={loading[sosOverlay.id]}
                className="w-full rounded-2xl font-semibold text-gray-600 text-base py-3.5 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                {loading[sosOverlay.id] ? 'Saving…' : 'Acknowledge — I see it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slim banner for all other critical alerts ────────────────────────── */}
      {alerts.length > 0 && (
        <div role="alert" aria-live="assertive" className="space-y-1.5">
          {alerts.map((alert) => {
            const detail = alert.detail as Record<string, unknown> | null;
            const busy   = loading[alert.id] ?? false;
            const viewHref = alert.type === 'sos'
              ? `/caregiver/emergency/${alert.id}`
              : '/caregiver/notifications';

            return (
              <div
                key={alert.id}
                className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0" aria-hidden>
                    {alert.type === 'sos' ? '🆘' : '⚠️'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm">
                      {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
                    </span>
                    <span className="text-red-200 text-sm ml-2">
                      {getAlertDescription(alert.type, detail)}
                    </span>
                    <span className="text-red-300 text-xs ml-2">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={viewHref}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-care transition-colors ${
                      alert.type === 'sos'
                        ? 'bg-white text-red-700 hover:bg-red-50 animate-pulse'
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {alert.type === 'sos' ? 'Open Emergency Mode →' : 'View'}
                  </Link>
                  <button
                    onClick={() => acknowledge(alert.id)}
                    disabled={busy}
                    className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-care transition-colors disabled:opacity-60"
                  >
                    {busy ? 'Saving…' : 'Acknowledge'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
