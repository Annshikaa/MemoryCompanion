'use client';

/**
 * LocationTracker — transparent, consented location sharing.
 *
 * Only runs while the patient app is open (browser Geolocation API).
 * This is NOT a background GPS tracker. When the tab is closed, pings stop.
 *
 * The patient sees a small honest indicator ("Location on") while sharing
 * is active. Permission denial is handled gracefully — no nagging.
 *
 * Safe-zone alert fires only on the transition from inside → outside to
 * avoid repeated notifications.
 */

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSeverity } from '@/lib/alert-severity';
import type { Tables } from '@/lib/supabase/database.types';

type LocationSettings = Tables<'location_settings'>;

const PING_INTERVAL_MS = 5 * 60_000; // 5 minutes

/** Haversine distance between two lat/lng points, in metres. */
function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  familyId: string;
}

export default function LocationTracker({ familyId }: Props) {
  const supabase      = createClient();
  const prevInside    = useRef<boolean | null>(null);
  const [settings,    setSettings]    = useState<LocationSettings | null>(null);
  const [denied,      setDenied]      = useState(false);

  // Load location settings on mount
  useEffect(() => {
    supabase
      .from('location_settings')
      .select('*')
      .eq('family_id', familyId)
      .maybeSingle()
      .then(({ data }) => setSettings(data));
  }, [familyId]);

  // Start pinging once we know settings
  useEffect(() => {
    if (!settings?.sharing_enabled) return;
    if (!navigator.geolocation) return;

    const sendPing = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;

          let inside_zone: boolean | null = null;

          if (settings.home_lat !== null && settings.home_lng !== null) {
            const dist = haversineMetres(lat, lng, settings.home_lat, settings.home_lng);
            inside_zone = dist <= settings.radius_m;

            // Alert caregiver only on transition from inside → outside
            if (prevInside.current === true && inside_zone === false) {
              await supabase.from('notifications').insert({
                family_id: familyId,
                type: 'left_zone',
                detail: { lat, lng, distance_m: Math.round(dist) },
                severity: getSeverity('left_zone'),
                status: 'new',
              });
              await supabase.from('events_log').insert({
                family_id: familyId,
                type: 'left_zone',
                detail: { lat, lng, distance_m: Math.round(dist) },
              });
            }
            prevInside.current = inside_zone;
          }

          await supabase.from('location_pings').insert({
            family_id: familyId,
            lat,
            lng,
            accuracy,
            inside_zone,
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setDenied(true);
          // Other errors (timeout, unavailable) are transient — ignore silently
        },
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 },
      );
    };

    sendPing(); // First ping immediately
    const interval = setInterval(sendPing, PING_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Nothing to show if sharing is off or denied (denied shows a calm note)
  if (!settings?.sharing_enabled) return null;

  if (denied) {
    return (
      <div
        className="fixed top-16 right-2 z-30 px-2 py-1 rounded-lg text-xs"
        style={{ background: '#fef9c3', color: '#854d0e' }}
        role="status"
      >
        Location unavailable
      </div>
    );
  }

  return (
    <div
      className="fixed top-16 right-2 z-30 flex items-center gap-1 px-2 py-1 rounded-full"
      style={{ background: 'rgba(91,141,239,0.12)', fontSize: '12px', color: '#5b8def' }}
      role="status"
      aria-label="Location sharing is active"
    >
      <span
        style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#5b8def', flexShrink: 0 }}
        aria-hidden
      />
      Location on
    </div>
  );
}
