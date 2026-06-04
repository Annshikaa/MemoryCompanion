'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

type LocationSettings = Tables<'location_settings'>;
type LatestPing       = Tables<'location_pings'> | null;

interface Props {
  initialSettings: LocationSettings | null;
  latestPing:      LatestPing;
  familyId:        string;
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R  = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationClient({ initialSettings, latestPing, familyId }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const s = initialSettings;
  const [enabled,  setEnabled]  = useState(s?.sharing_enabled ?? false);
  const [homeLat,  setHomeLat]  = useState(String(s?.home_lat ?? ''));
  const [homeLng,  setHomeLng]  = useState(String(s?.home_lng ?? ''));
  const [radiusM,  setRadiusM]  = useState(String(s?.radius_m ?? 200));
  const [saving,   setSaving]   = useState(false);
  const [locating, setLocating] = useState(false);
  const [error,    setError]    = useState('');
  const [saved,    setSaved]    = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Geolocation is not available in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHomeLat(pos.coords.latitude.toFixed(6));
        setHomeLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => { setError(`Could not get location: ${err.message}`); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const lat = parseFloat(homeLat), lng = parseFloat(homeLng), r = parseInt(radiusM, 10);
    if (enabled && (isNaN(lat) || isNaN(lng))) { setError('Enter valid home coordinates before enabling location sharing.'); return; }
    if (isNaN(r) || r < 50) { setError('Radius must be at least 50 metres.'); return; }

    setSaving(true);
    const payload = { family_id: familyId, sharing_enabled: enabled, home_lat: isNaN(lat) ? null : lat, home_lng: isNaN(lng) ? null : lng, radius_m: r, updated_at: new Date().toISOString() };
    const { error: dbErr } = await supabase.from('location_settings').upsert(payload, { onConflict: 'family_id' });
    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  // Compute distance from home to latest ping
  const pingLat  = latestPing?.lat;
  const pingLng  = latestPing?.lng;
  const homeLtF  = parseFloat(homeLat);
  const homeLgF  = parseFloat(homeLng);
  const distance = (pingLat !== undefined && pingLng !== undefined && !isNaN(homeLtF) && !isNaN(homeLgF))
    ? haversineMetres(pingLat, pingLng, homeLtF, homeLgF)
    : null;

  return (
    <div className="space-y-5 max-w-xl">
      {/* Latest ping status */}
      {latestPing && (
        <div className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm">
          <h2 className="font-display font-semibold text-care-text text-base mb-3">Last known location</h2>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-care-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-care-text">
                {latestPing.lat.toFixed(5)}, {latestPing.lng.toFixed(5)}
                {latestPing.accuracy && <span className="text-care-text-muted ml-2">(±{Math.round(latestPing.accuracy)} m accuracy)</span>}
              </p>
              <p className="text-xs text-care-text-muted mt-0.5">
                {new Date(latestPing.created_at).toLocaleString()}
              </p>
              {distance !== null && (
                <p className="text-sm mt-1 font-medium" style={{ color: (latestPing.inside_zone ?? true) ? '#16a34a' : '#dc2626' }}>
                  {latestPing.inside_zone ? '✓ Inside safe zone' : '⚠ Outside safe zone'} · {Math.round(distance).toLocaleString()} m from home
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm space-y-5">
        <h2 className="font-display font-semibold text-care-text text-base">Location settings</h2>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-care-border rounded-full peer-checked:bg-care-primary transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-care-text">Enable location sharing</p>
            <p className="text-xs text-care-text-muted">Patient device shares location while the app is open. Not a background tracker.</p>
          </div>
        </label>

        {/* Home coordinates */}
        <div>
          <p className="text-sm font-medium text-care-text mb-2">Home location</p>
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <label htmlFor="lat" className="block text-xs text-care-text-muted mb-1">Latitude</label>
              <input id="lat" type="number" step="any" value={homeLat} onChange={(e) => setHomeLat(e.target.value)} placeholder="28.613939"
                className="w-full px-3 py-2.5 rounded-care border border-care-border bg-care-surface text-care-text text-sm focus:outline-none focus:ring-2 focus:ring-care-primary" />
            </div>
            <div className="flex-1">
              <label htmlFor="lng" className="block text-xs text-care-text-muted mb-1">Longitude</label>
              <input id="lng" type="number" step="any" value={homeLng} onChange={(e) => setHomeLng(e.target.value)} placeholder="77.209021"
                className="w-full px-3 py-2.5 rounded-care border border-care-border bg-care-surface text-care-text text-sm focus:outline-none focus:ring-2 focus:ring-care-primary" />
            </div>
          </div>
          <button type="button" onClick={useCurrentLocation} disabled={locating}
            className="flex items-center gap-2 text-sm font-medium text-care-primary hover:text-care-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {locating ? 'Getting location…' : 'Use my current location as home'}
          </button>
          <p className="text-xs text-care-text-subtle mt-1">
            Open this page from the patient&apos;s home to capture the correct coordinates.
          </p>
        </div>

        {/* Radius */}
        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-care-text mb-1.5">Safe zone radius</label>
          <div className="flex items-center gap-3">
            <input id="radius" type="number" min={50} max={5000} value={radiusM} onChange={(e) => setRadiusM(e.target.value)}
              className="w-32 px-3 py-2.5 rounded-care border border-care-border bg-care-surface text-care-text text-sm focus:outline-none focus:ring-2 focus:ring-care-primary" />
            <span className="text-sm text-care-text-muted">metres</span>
          </div>
          <p className="text-xs text-care-text-subtle mt-1">Default: 200 m. An alert fires once when the patient leaves this radius.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-care text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <button type="submit" disabled={saving}
          className={`flex items-center gap-2 px-5 py-3 rounded-care text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary ${saved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-care-primary text-white hover:bg-care-primary-hover disabled:opacity-60'}`}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
        </button>
      </form>

      {/* Privacy note */}
      <div className="bg-care-primary-light rounded-care-lg p-4 text-sm text-care-text-muted">
        <p className="font-medium text-care-text mb-1">Privacy note</p>
        Location is only visible to members of this family. It is never shared with third parties.
        Location updates only while the patient app tab is open — this is <strong>not</strong> a background GPS tracker.
        Sharing can be turned off at any time.
      </div>
    </div>
  );
}
