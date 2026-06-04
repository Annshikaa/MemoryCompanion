'use client';

/**
 * EmergencyModeClient — Wave 5 full-screen emergency experience.
 *
 * Receives server-fetched data as props; adds:
 *  - Elapsed timer (every second)
 *  - Supabase Realtime: location_pings INSERT → live map update
 *  - Supabase Realtime: notifications UPDATE → tracks if resolved elsewhere
 *  - "Mark as Resolved" → PATCH /api/alerts/[id]/acknowledge
 *
 * Map: free OpenStreetMap embed iframe — no API key, no new packages.
 * Location: shows last known position with timestamp; updates in realtime.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Phone, UserCircle, MapPin, Clock, AlertTriangle,
  Heart, Pill, FileText, CheckCircle2, ExternalLink,
} from 'lucide-react';

// ── Exported type (shared with server page) ───────────────────────────────

export interface EmergencyData {
  alertId:          string;
  alertType:        string;
  alertStatus:      'new' | 'acknowledged' | 'resolved';
  alertCreatedAt:   string;
  alertDetail:      Record<string, unknown> | null;
  familyId:         string;
  patientName:      string;
  patientPhotoUrl:  string | null;
  latestPing: {
    lat: number; lng: number;
    inside_zone: boolean | null;
    created_at: string;
  } | null;
  locationSettings: {
    sharing_enabled: boolean;
    home_lat: number | null; home_lng: number | null; radius_m: number;
  } | null;
  contacts: Array<{
    id: string; name: string; relationship: string;
    phone: string; photo_url: string | null; priority: number;
  }>;
  medicalInfo: {
    allergies: string | null; medications: string | null;
    conditions: string | null; notes: string | null; updated_at: string;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function haversineMetres(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mapSrc(lat: number, lng: number): string {
  const d = 0.006; // ~600 m bounding box
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

// ── Map panel ─────────────────────────────────────────────────────────────

function LocationPanel({
  ping, locationSettings, patientName,
}: {
  ping: EmergencyData['latestPing'];
  locationSettings: EmergencyData['locationSettings'];
  patientName: string;
}) {
  if (!locationSettings?.sharing_enabled) {
    return (
      <div className="rounded-care-lg border border-care-border bg-amber-50 p-5 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Location sharing is off</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Enable it in{' '}
            <Link href="/caregiver/location" className="underline">Location Safety</Link>
            {' '}so you can track {patientName} during emergencies.
          </p>
        </div>
      </div>
    );
  }

  if (!ping) {
    return (
      <div className="rounded-care-lg border border-care-border bg-care-bg p-5">
        <p className="text-sm text-care-text-muted text-center py-4">
          Location unavailable — no pings received yet.
        </p>
      </div>
    );
  }

  const homeLat = locationSettings?.home_lat;
  const homeLng = locationSettings?.home_lng;
  const distM   = (homeLat && homeLng)
    ? Math.round(haversineMetres(ping.lat, ping.lng, homeLat, homeLng))
    : null;
  const src = mapSrc(ping.lat, ping.lng);

  return (
    <div className="space-y-2">
      <iframe
        key={src}  // re-render iframe when position changes meaningfully
        src={src}
        width="100%"
        height="260"
        style={{ border: 'none', borderRadius: '14px', display: 'block' }}
        title={`${patientName}'s current location`}
        loading="lazy"
      />
      <div className="flex items-center justify-between text-xs text-care-text-muted flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>
            {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
          </span>
          {distM !== null && (
            <span className={`font-semibold ml-1 ${distM > (locationSettings?.radius_m ?? 200) ? 'text-red-600' : 'text-green-600'}`}>
              · {distM < 1000 ? `${distM} m` : `${(distM / 1000).toFixed(1)} km`} from home
            </span>
          )}
        </div>
        <span>Updated {new Date(ping.created_at).toLocaleTimeString()}</span>
      </div>
      <a
        href={`https://www.google.com/maps?q=${ping.lat},${ping.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-care-primary hover:underline"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in Google Maps
      </a>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────

export default function EmergencyModeClient({ data }: { data: EmergencyData }) {
  const router   = useRouter();
  const supabase = createClient();

  // Elapsed timer
  const [elapsed,  setElapsed]  = useState(
    Math.floor((Date.now() - new Date(data.alertCreatedAt).getTime()) / 1000),
  );
  const [ping,       setPing]       = useState(data.latestPing);
  const [pingFlash,  setPingFlash]  = useState(false); // brief highlight when new ping
  const [resolved,   setResolved]   = useState(data.alertStatus === 'resolved');
  const [resolving,  setResolving]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Elapsed timer
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Realtime: new location pings
    const locChannel = supabase
      .channel(`emergency-loc-${data.familyId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'location_pings',
        filter: `family_id=eq.${data.familyId}`,
      }, (payload) => {
        const newPing = payload.new as NonNullable<typeof ping>;
        setPing(newPing);
        setPingFlash(true);
        setTimeout(() => setPingFlash(false), 2000);
      })
      .subscribe();

    // Realtime: alert status changes (resolved elsewhere)
    const alertChannel = supabase
      .channel(`emergency-alert-${data.alertId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `id=eq.${data.alertId}`,
      }, (payload) => {
        const updated = payload.new as { status: string };
        if (updated.status === 'resolved') setResolved(true);
      })
      .subscribe();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      supabase.removeChannel(locChannel);
      supabase.removeChannel(alertChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.familyId, data.alertId]);

  async function handleResolve() {
    setResolving(true);
    try {
      const res = await fetch(`/api/alerts/${data.alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      if (res.ok) {
        setResolved(true);
        setTimeout(() => router.push('/caregiver'), 1500);
      }
    } catch {
      // stays open on error — caregiver can retry
    } finally {
      setResolving(false);
    }
  }

  // ── Already resolved state ────────────────────────────────────────────
  if (resolved) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h1 className="font-display text-2xl font-semibold text-care-text">Emergency resolved</h1>
        <p className="text-care-text-muted text-sm">This alert has been marked as resolved.</p>
        <Link href="/caregiver" className="text-sm text-care-primary hover:underline">
          Back to dashboard →
        </Link>
      </div>
    );
  }

  const triggeredAt = new Date(data.alertCreatedAt);
  const topContact  = data.contacts[0];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* ── RED HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-red-600 rounded-care-lg text-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
              <h1 className="text-xl font-bold tracking-tight">Emergency Mode</h1>
            </div>
            <p className="text-red-200 text-sm">
              {data.patientName} pressed HELP at{' '}
              {triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {' '}on {triggeredAt.toLocaleDateString()}
            </p>
          </div>
          {/* Elapsed timer */}
          <div className="text-center shrink-0">
            <p
              className="font-mono text-3xl font-bold tabular-nums"
              aria-live="polite"
              aria-label={`Elapsed time: ${formatElapsed(elapsed)}`}
            >
              {formatElapsed(elapsed)}
            </p>
            <p className="text-red-300 text-xs">elapsed</p>
          </div>
        </div>
      </div>

      {/* ── LIVE LOCATION ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-care-text text-sm uppercase tracking-wide">
            Live Location
          </h2>
          {pingFlash && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full animate-pulse">
              📍 Location updated
            </span>
          )}
        </div>
        <LocationPanel
          ping={ping}
          locationSettings={data.locationSettings}
          patientName={data.patientName}
        />
      </div>

      {/* ── CALL BUTTONS ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <h2 className="font-display font-semibold text-care-text text-sm uppercase tracking-wide mb-3">
          Call for Help
        </h2>
        {data.contacts.length === 0 ? (
          <div className="text-sm text-care-text-muted">
            No emergency contacts configured.{' '}
            <Link href="/caregiver/contacts" className="text-care-primary hover:underline">
              Add contacts →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top-priority contact — big button */}
            {topContact && (
              <a
                href={`tel:${topContact.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-4 bg-green-600 hover:bg-green-700 text-white rounded-care-lg px-5 py-4 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label={`Call ${topContact.name}, ${topContact.relationship}: ${topContact.phone}`}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg leading-tight">{topContact.name}</p>
                  <p className="text-green-200 text-sm">{topContact.relationship} · {topContact.phone}</p>
                </div>
                <span className="text-sm font-semibold bg-white/20 px-3 py-1.5 rounded-care">
                  Call →
                </span>
              </a>
            )}

            {/* Remaining contacts — compact list */}
            {data.contacts.slice(1).map((c) => (
              <a
                key={c.id}
                href={`tel:${c.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 border border-care-border rounded-care-lg px-4 py-3 hover:bg-care-bg transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label={`Call ${c.name}: ${c.phone}`}
              >
                <div className="w-10 h-10 rounded-full bg-care-primary-light flex items-center justify-center shrink-0 overflow-hidden">
                  {c.photo_url ? (
                    <Image src={c.photo_url} alt={c.name} width={40} height={40} className="object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-care-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-care-text text-sm truncate">{c.name}</p>
                  <p className="text-xs text-care-text-muted">{c.relationship} · {c.phone}</p>
                </div>
                <Phone className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── MEDICAL REFERENCE CARD ─────────────────────────────────────── */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-care-text text-sm uppercase tracking-wide">
            Medical Reference Card
          </h2>
          <Link
            href="/caregiver/medical-info"
            className="text-xs text-care-primary hover:underline"
          >
            Edit →
          </Link>
        </div>

        {/* Patient identity */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-care-primary-light shrink-0 flex items-center justify-center">
            {data.patientPhotoUrl ? (
              <Image
                src={data.patientPhotoUrl}
                alt={data.patientName}
                width={56} height={56}
                className="object-cover"
              />
            ) : (
              <UserCircle className="w-8 h-8 text-care-accent" />
            )}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-care-text">{data.patientName}</p>
            <p className="text-xs text-care-text-muted">Patient</p>
          </div>
        </div>

        {!data.medicalInfo ? (
          <div className="rounded-care bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800 font-medium">No medical info on file</p>
            <p className="text-xs text-amber-700 mt-1">
              <Link href="/caregiver/medical-info" className="underline">
                Add allergies, medications, and notes
              </Link>
              {' '}so first-responders have reference info in an emergency.
            </p>
          </div>
        ) : (
          <dl className="space-y-3">
            {[
              { key: 'allergies',   label: 'Allergies',   icon: AlertTriangle, color: 'text-red-500'  },
              { key: 'medications', label: 'Medications', icon: Pill,          color: 'text-blue-500' },
              { key: 'conditions',  label: 'Conditions',  icon: Heart,         color: 'text-purple-500' },
              { key: 'notes',       label: 'Notes',       icon: FileText,      color: 'text-care-accent' },
            ].map(({ key, label, icon: Icon, color }) => {
              const val = data.medicalInfo![key as keyof typeof data.medicalInfo] as string | null;
              if (!val) return null;
              return (
                <div key={key} className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} aria-hidden />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle">{label}</dt>
                    <dd className="text-sm text-care-text mt-0.5 leading-relaxed whitespace-pre-wrap">{val}</dd>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-care-text-subtle pt-1">
              Stored reference only — not medical advice. Updated {new Date(data.medicalInfo.updated_at).toLocaleDateString()}.
            </p>
          </dl>
        )}
      </div>

      {/* ── RESOLVE ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <p className="text-sm text-care-text-muted mb-3">
          Mark this emergency as resolved once the patient is safe and the situation is handled.
          This will close Emergency Mode and remove the banner.
        </p>
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-care-lg text-lg transition-colors disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          {resolving ? 'Saving…' : '✓ Mark as Resolved — Patient is Safe'}
        </button>
      </div>

    </div>
  );
}
