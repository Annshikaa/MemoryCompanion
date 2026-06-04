'use client';

/**
 * EmergencyCardClient — caregiver QR emergency card generator.
 *
 * Lets the caregiver:
 *  1. Toggle which fields appear on the public scan page.
 *  2. Generate an active card (random UUID token, stored in patient_medical_info).
 *  3. Regenerate the token (invalidates the old QR immediately).
 *  4. Deactivate the card (sets is_public = false without changing the token).
 *
 * QR code: rendered as a <next/image> from api.qrserver.com — free, no key.
 * Token: crypto.randomUUID() — 122 bits of entropy, unguessable.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { QrCode, RefreshCw, Power, ArrowLeft, Check, AlertTriangle } from 'lucide-react';

interface MedInfo {
  allergies:       string | null;
  medications:     string | null;
  conditions:      string | null;
  publicToken:     string | null;
  isPublic:        boolean;
  showName:        boolean;
  showPhoto:       boolean;
  showAllergies:   boolean;
  showMedications: boolean;
  showConditions:  boolean;
  showContacts:    boolean;
}

interface Props {
  familyId:        string;
  patientName:     string | null;
  patientPhotoUrl: string | null;
  initialMedInfo:  MedInfo;
}

type VisibilityKey = 'showName' | 'showPhoto' | 'showAllergies' | 'showMedications' | 'showConditions' | 'showContacts';

const VISIBILITY_OPTIONS: Array<{
  key:     VisibilityKey;
  label:   string;
  sub:     string;
  default: boolean;
}> = [
  { key: 'showName',        label: 'Patient name',         sub: 'First + last name',                  default: true  },
  { key: 'showPhoto',       label: 'Patient photo',        sub: 'Profile photo (off by default)',     default: false },
  { key: 'showAllergies',   label: 'Allergies',            sub: 'Drug/food/environmental allergies',  default: true  },
  { key: 'showMedications', label: 'Medications',          sub: 'Current medication list',            default: true  },
  { key: 'showConditions',  label: 'Medical conditions',   sub: 'Diagnoses, relevant conditions',     default: true  },
  { key: 'showContacts',    label: 'Emergency contacts',   sub: 'Phone numbers for first-responders', default: true  },
];

export default function EmergencyCardClient({
  familyId, patientName, patientPhotoUrl, initialMedInfo,
}: Props) {
  const supabase = createClient();

  const [info,        setInfo]        = useState<MedInfo>(initialMedInfo);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [errMsg,      setErrMsg]      = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  // Derive the public URL from the current window (works localhost + prod)
  function publicUrl(token: string): string {
    if (typeof window === 'undefined') return `/emergency/${token}`;
    return `${window.location.origin}/emergency/${token}`;
  }

  // QR code image URL (free api.qrserver.com, no key)
  function qrUrl(token: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(publicUrl(token))}&ecc=M`;
  }

  function toggleVisibility(key: VisibilityKey) {
    setInfo((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  // ── Generate / Regenerate ─────────────────────────────────────────────
  async function handleGenerate(regenerate = false) {
    setSaving(true);
    setErrMsg(null);

    const newToken = crypto.randomUUID().replace(/-/g, '');

    const payload = {
      family_id:        familyId,
      public_token:     newToken,
      is_public:        true,
      show_name:        info.showName,
      show_photo:       info.showPhoto,
      show_allergies:   info.showAllergies,
      show_medications: info.showMedications,
      show_conditions:  info.showConditions,
      show_contacts:    info.showContacts,
      updated_at:       new Date().toISOString(),
    };

    const { error } = await supabase
      .from('patient_medical_info')
      .upsert(payload, { onConflict: 'family_id' });

    if (error) {
      setErrMsg(error.message);
    } else {
      setInfo((prev) => ({ ...prev, publicToken: newToken, isPublic: true }));
      setSaved(true);
    }
    setSaving(false);
  }

  // ── Save visibility changes ───────────────────────────────────────────
  async function handleSaveVisibility() {
    setSaving(true);
    setErrMsg(null);

    const { error } = await supabase
      .from('patient_medical_info')
      .upsert({
        family_id:        familyId,
        show_name:        info.showName,
        show_photo:       info.showPhoto,
        show_allergies:   info.showAllergies,
        show_medications: info.showMedications,
        show_conditions:  info.showConditions,
        show_contacts:    info.showContacts,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'family_id' });

    if (error) setErrMsg(error.message);
    else setSaved(true);
    setSaving(false);
  }

  // ── Deactivate ────────────────────────────────────────────────────────
  async function handleDeactivate() {
    setSaving(true);
    setErrMsg(null);

    const { error } = await supabase
      .from('patient_medical_info')
      .upsert({
        family_id: familyId,
        is_public: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'family_id' });

    if (error) setErrMsg(error.message);
    else setInfo((prev) => ({ ...prev, isPublic: false }));
    setSaving(false);
  }

  // ── Copy URL ──────────────────────────────────────────────────────────
  async function handleCopy() {
    if (!info.publicToken) return;
    await navigator.clipboard.writeText(publicUrl(info.publicToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const url = info.publicToken ? publicUrl(info.publicToken) : null;
  const hasNoMedInfo = !info.allergies && !info.medications && !info.conditions;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/caregiver" className="text-care-text-muted hover:text-care-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Emergency QR Card
          </h1>
          <p className="text-care-text-muted text-sm mt-0.5">
            A scannable card for first-responders — no login required to view.
          </p>
        </div>
      </div>

      {/* No medical info warning */}
      {hasNoMedInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-care-lg px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            No medical info on file yet.{' '}
            <Link href="/caregiver/medical-info" className="underline font-medium">
              Add allergies, medications, and conditions
            </Link>
            {' '}to make the card useful.
          </p>
        </div>
      )}

      {/* Active card */}
      {info.isPublic && info.publicToken && url ? (
        <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <p className="font-semibold text-care-text">Card active</p>
              </div>
              <p className="text-xs text-care-text-muted mt-0.5">
                Anyone with the URL or QR code can view the approved fields.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6 flex-wrap">
            {/* QR Code */}
            <div className="shrink-0">
              <Image
                src={qrUrl(info.publicToken)}
                alt="Emergency card QR code"
                width={180}
                height={180}
                className="rounded-care border border-care-border"
                unoptimized
              />
              <p className="text-xs text-care-text-subtle mt-1.5 text-center">Scan to view</p>
            </div>

            {/* URL + actions */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="rounded-care bg-care-bg px-3 py-2.5 break-all">
                <p className="text-xs text-care-text-subtle mb-0.5">Public URL</p>
                <p className="text-sm font-mono text-care-text leading-relaxed">{url}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-care bg-care-primary-light text-care-primary hover:bg-care-primary hover:text-white transition-colors"
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : 'Copy URL'}
                </button>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-care bg-care-bg border border-care-border text-care-text-muted hover:text-care-text transition-colors"
                >
                  Preview →
                </a>
              </div>

              {/* Danger actions */}
              <div className="flex gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-care bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
                  title="Generates a new token — the old QR code will stop working"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate token
                </button>

                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-care bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                >
                  <Power className="w-3.5 h-3.5" />
                  Deactivate card
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Inactive / not generated yet */
        <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-care-bg rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-care-accent" />
          </div>
          <div>
            <p className="font-display font-semibold text-care-text text-lg">No active card</p>
            <p className="text-care-text-muted text-sm mt-1">
              Generate a QR code to give first-responders instant access to{' '}
              {patientName ?? 'the patient'}&apos;s approved emergency information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-care-primary text-white font-semibold px-6 py-3 rounded-care text-sm hover:bg-care-primary-hover transition-colors disabled:opacity-60"
          >
            <QrCode className="w-4 h-4" />
            {saving ? 'Generating…' : 'Generate emergency card'}
          </button>
        </div>
      )}

      {/* Visibility toggles */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-care-text text-base">
              What&apos;s visible on the public card
            </h2>
            <p className="text-xs text-care-text-muted mt-0.5">
              Only ticked fields appear when someone scans the QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveVisibility}
            disabled={saving || !info.isPublic}
            className="text-xs font-semibold px-3 py-1.5 rounded-care bg-care-primary-light text-care-primary hover:bg-care-primary hover:text-white transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>

        <ul className="space-y-3">
          {VISIBILITY_OPTIONS.map(({ key, label, sub }) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id={key}
                  checked={info[key] as boolean}
                  onChange={() => toggleVisibility(key)}
                  className="mt-0.5 w-4 h-4 rounded text-care-primary focus:ring-care-primary"
                />
                <label htmlFor={key} className="cursor-pointer">
                  <p className="text-sm font-medium text-care-text">{label}</p>
                  <p className="text-xs text-care-text-muted">{sub}</p>
                </label>
              </div>
              {(key === 'showAllergies' || key === 'showMedications' || key === 'showConditions') &&
                !info[key] && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                    hidden
                  </span>
                )}
            </li>
          ))}
        </ul>

        {!info.isPublic && (
          <p className="text-xs text-care-text-subtle mt-4 pt-3 border-t border-care-border-subtle">
            Generate a card above to activate these settings.
          </p>
        )}
      </div>

      {errMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-care px-4 py-3" role="alert">
          {errMsg}
        </p>
      )}

      {/* Security note */}
      <div className="bg-care-bg rounded-care px-4 py-3 text-xs text-care-text-subtle space-y-1">
        <p><strong className="text-care-text">Security:</strong> The URL contains a random 32-character token. Regenerating it immediately breaks the old QR code. Deactivating makes it return a 404.</p>
        <p>The public page shows ONLY the fields you enabled above. No other app data is reachable from that URL.</p>
        <p>Print the QR code and attach it to the patient&apos;s wallet, fridge door, or medical ID bracelet.</p>
      </div>
    </div>
  );
}
