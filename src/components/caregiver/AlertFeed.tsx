'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import {
  getSeverity,
  getAlertDescription,
  SEVERITY_LABEL,
  SEVERITY_STYLES,
  SEVERITY_RANK,
  ALERT_TYPE_LABEL,
} from '@/lib/alert-severity';
import type { Severity } from '@/lib/alert-severity';

type Alert = Tables<'notifications'>;

interface Props {
  initialAlerts: Alert[];
  familyId: string;
  aiNotes?: Record<string, string>; // notificationId → one-line AI note
}

// ── Quick-action links per alert type ─────────────────────────────────────
const QUICK_LINK: Record<string, { label: string; href: string }> = {
  sos:             { label: 'View contacts',  href: '/caregiver/contacts' },
  left_zone:       { label: 'View location',  href: '/caregiver/location' },
  inactivity:      { label: 'View location',  href: '/caregiver/location' },
  reminder_missed: { label: 'View reminders', href: '/caregiver/reminders' },
};

// Sort: unresolved first, then by severity rank, then newest first
function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const aResolved = a.status === 'resolved' ? 1 : 0;
    const bResolved = b.status === 'resolved' ? 1 : 0;
    if (aResolved !== bResolved) return aResolved - bResolved;

    const aSev = SEVERITY_RANK[a.severity as Severity] ?? 3;
    const bSev = SEVERITY_RANK[b.severity as Severity] ?? 3;
    if (aSev !== bSev) return aSev - bSev;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function AlertFeed({ initialAlerts, familyId, aiNotes = {} }: Props) {
  const supabase  = createClient();
  const [alerts, setAlerts] = useState<Alert[]>(() => sortAlerts(initialAlerts));
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // ── Realtime: INSERT (new alert) and UPDATE (status change) ───────────
  useEffect(() => {
    // Mark all as seen on mount
    supabase
      .from('notifications')
      .update({ seen: true })
      .eq('family_id', familyId)
      .eq('seen', false)
      .then(() => {});

    const channel = supabase
      .channel(`alert-feed-${familyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => {
        const incoming = payload.new as Alert;
        // Ensure severity is set (may be missing on old inserts without Wave 1 migration)
        if (!incoming.severity) {
          incoming.severity = getSeverity(incoming.type);
        }
        setAlerts((prev) => sortAlerts([incoming, ...prev]));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => {
        const updated = payload.new as Alert;
        setAlerts((prev) => sortAlerts(prev.map((a) => a.id === updated.id ? updated : a)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // ── Acknowledge / Resolve ─────────────────────────────────────────────
  const handleAction = useCallback(async (
    alertId: string,
    action: 'acknowledge' | 'resolve',
  ) => {
    setLoading((prev) => ({ ...prev, [alertId]: true }));
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const updated: Alert = await res.json();
        setAlerts((prev) => sortAlerts(prev.map((a) => a.id === updated.id ? updated : a)));
      }
    } finally {
      setLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────
  if (!alerts.length) {
    return (
      <div className="bg-white rounded-care-lg border border-care-border p-12 text-center shadow-care-sm">
        <p className="text-4xl mb-3" aria-hidden>✅</p>
        <p className="font-display font-semibold text-care-text text-lg">All clear</p>
        <p className="text-care-text-muted text-sm mt-1">
          No alerts yet. Reminders, SOS, and location events will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {alerts.map((alert) => {
        const sev    = (alert.severity as Severity) ?? getSeverity(alert.type);
        const styles = SEVERITY_STYLES[sev];
        const detail = alert.detail as Record<string, unknown> | null;
        const aiNote = aiNotes[alert.id];
        const quickLink = QUICK_LINK[alert.type];
        const isNew  = alert.status === 'new';
        const isResolved = alert.status === 'resolved';
        const busy   = loading[alert.id] ?? false;

        return (
          <li
            key={alert.id}
            className={`bg-white rounded-care-lg border border-care-border shadow-care-sm overflow-hidden ${styles.border} ${isResolved ? 'opacity-60' : ''}`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Severity badge */}
                <span className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                  {SEVERITY_LABEL[sev]}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-care-text text-sm">
                      {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
                    </p>
                    <p className="text-xs text-care-text-subtle shrink-0">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>

                  <p className="text-sm text-care-text-muted mt-0.5">
                    {getAlertDescription(alert.type, detail)}
                  </p>

                  {/* AI triage note — only for high/critical */}
                  {aiNote && !isResolved && (
                    <p className="text-xs text-care-primary mt-1.5 italic">
                      💡 {aiNote}
                    </p>
                  )}

                  {/* Acknowledged by */}
                  {alert.acknowledged_at && (
                    <p className="text-xs text-care-text-subtle mt-1">
                      {alert.status === 'resolved' ? 'Resolved' : 'Acknowledged'}{' '}
                      {new Date(alert.acknowledged_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Unread dot */}
                {isNew && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5" aria-label="Unread" />
                )}
              </div>

              {/* Actions row */}
              {!isResolved && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {quickLink && (
                    <Link
                      href={quickLink.href}
                      className="text-xs font-medium text-care-primary hover:underline"
                    >
                      {quickLink.label} →
                    </Link>
                  )}
                  <div className="flex-1" />
                  {isNew && (
                    <button
                      onClick={() => handleAction(alert.id, 'acknowledge')}
                      disabled={busy}
                      className="text-xs font-semibold px-3 py-1.5 rounded-care bg-care-primary-light text-care-primary hover:bg-care-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Acknowledge'}
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(alert.id, 'resolve')}
                    disabled={busy}
                    className="text-xs font-semibold px-3 py-1.5 rounded-care bg-care-border-subtle text-care-text-muted hover:bg-care-border hover:text-care-text transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Saving…' : 'Resolve'}
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
