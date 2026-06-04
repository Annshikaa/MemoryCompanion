'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Copy, Check, Info } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

interface Props {
  family: Pick<Tables<'families'>, 'name' | 'invite_code'> | null;
  patient: Tables<'patients'> | null;
  familyId: string;
}

export default function CaregiverSettingsClient({ family, patient, familyId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [patientName, setPatientName] = useState(patient?.name ?? '');
  const [locationText, setLocationText] = useState(patient?.home_location_text ?? 'You are at home');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(family?.invite_code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSavePatient(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!patientName.trim()) { setError('Patient name is required.'); return; }
    setSaving(true);

    if (patient) {
      const { error: err } = await supabase.from('patients').update({
        name: patientName.trim(),
        home_location_text: locationText.trim() || 'You are at home',
      }).eq('id', patient.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('patients').insert({
        family_id: familyId,
        name: patientName.trim(),
        home_location_text: locationText.trim() || 'You are at home',
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Invite code */}
      <div className="bg-white rounded-xl border border-caregiver-border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Family invite code</h2>
        <p className="text-sm text-gray-500 mb-4">
          Share this code with family members or to set up a patient device.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg tracking-widest text-gray-800">
            {family?.invite_code ?? '—'}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Copy invite code"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Patient profile */}
      <div className="bg-white rounded-xl border border-caregiver-border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Patient profile</h2>
        <p className="text-sm text-gray-500 mb-5">
          This information appears on the patient&apos;s home screen.
        </p>

        <form onSubmit={handleSavePatient} className="space-y-4">
          <div>
            <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-1">
              Patient&apos;s name *
            </label>
            <input
              id="patientName"
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. Grandma Kamla"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location reminder
            </label>
            <input
              id="location"
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. You are at home in Indore"
            />
            <p className="text-xs text-gray-400 mt-1">Shown prominently on the patient&apos;s home screen.</p>
          </div>

          {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save patient profile'}
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-1">About Memory Companion</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            Memory Companion is a supportive aid designed to help people living with Alzheimer&apos;s
            or dementia stay oriented and connected with loved ones. It is <strong>not a medical
            device</strong> and does not diagnose, treat, or provide medical advice. Always consult
            a qualified healthcare professional for medical guidance.
          </p>
        </div>
      </div>
    </div>
  );
}
